/**
 * Google Apps Script for nomi-log sync (Final Strict Version)
 *
 * シート構造 (自動作成 & 厳格管理):
 * 1. 'records': 飲酒記録
 *    id | date | name | type | percentage | amountMl | createdAt | updatedAt | deleted
 *
 * 2. 'settings': アプリ設定 (Key-Value)
 *    key | value | updatedAt
 */

const SHEET_NAME_RECORDS = 'records';
const SHEET_NAME_SETTINGS = 'settings';
const VERSION = '2026-02-18-final';
const API_VERSION = 1;

// 厳密なカラム定義 (Header Drift 防止)
const COLUMNS_RECORDS = ['id', 'date', 'name', 'type', 'percentage', 'amountMl', 'createdAt', 'updatedAt', 'deleted'];
const COLUMNS_SETTINGS = ['key', 'value', 'updatedAt'];

function getOrCreateSheet(name, columns) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(columns);
    // 初回作成時のみヘッダーを太字にするなどの装飾も可能
    sheet.getRange(1, 1, 1, columns.length).setFontWeight('bold');
  } else {
    // 既存シートの場合、ヘッダーが正しいか簡易チェック（オプション）
    // ここでは破壊的変更を避けるため、チェックのみログに出す運用も考えられるが、
    // "Final Strict" としては、ヘッダー行を強制的に上書きするのも手。
    // 今回は安全のため、チェックのみで不整合があればエラーとするのが無難。
    const headers = sheet.getRange(1, 1, 1, columns.length).getValues()[0];
    if (headers.join(',') !== columns.join(',')) {
      console.warn(`Header mismatch in ${name}. Expected: ${columns.join(',')}, Found: ${headers.join(',')}`);
      // 修復を試みるならここで headers をセットし直すが、データ不整合のリスクがあるため放置
    }
  }
  return sheet;
}

/**
 * Handle POST requests
 * Expected Body: { apiVersion: 1, type: 'records' | 'settings', ...payload }
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return createResponse({ ok: false, error: 'Server is busy, please try again.' }, 503);
  }

  try {
    if (!e.postData || !e.postData.contents) {
      return createResponse({ ok: false, error: 'Empty request body' }, 400);
    }

    let body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (err) {
      return createResponse({ ok: false, error: 'Invalid JSON body' }, 400);
    }

    // 1. API Version Check
    if (body.apiVersion !== API_VERSION) {
      return createResponse({ ok: false, error: `API version mismatch. Server requires v${API_VERSION}` }, 400);
    }

    // 2. Type Check
    if (!body.type) {
      return createResponse({ ok: false, error: 'Missing "type" field' }, 400);
    }

    console.log(`[Action] type=${body.type}, action=${body.action || 'save'}`);

    if (body.type === 'settings') {
      return handleSettings(body);
    } else if (body.type === 'records') {
      return handleRecords(body);
    } else {
      return createResponse({ ok: false, error: `Unknown type: ${body.type}` }, 400);
    }

  } catch (err) {
    console.error(`[Error] ${err.message}`);
    return createResponse({ ok: false, error: err.message }, 500);
  } finally {
    lock.releaseLock();
  }
}

function handleSettings(body) {
  const sheet = getOrCreateSheet(SHEET_NAME_SETTINGS, COLUMNS_SETTINGS);
  const action = body.action || 'save';

  if (action === 'get') {
    const data = sheet.getDataRange().getValues();
    const settings = {};
    // Row 0 is header. Start from 1.
    for (let i = 1; i < data.length; i++) {
      // 厳密にはカラム位置も COLUMNS_SETTINGS から引くべきだが、固定前提とする
      const key = data[i][0];
      const valStr = data[i][1];
      try {
        settings[key] = JSON.parse(valStr);
      } catch (e) {
        settings[key] = valStr;
      }
    }
    return createResponse({ ok: true, data: { settings } });
  }

  if (action === 'save') {
    const incoming = body.settings;
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      return createResponse({ ok: false, error: 'Invalid settings format. Expected object.' }, 400);
    }

    const keys = Object.keys(incoming);
    if (keys.length === 0) {
      return createResponse({ ok: true, data: { updated: 0 } });
    }

    const data = sheet.getDataRange().getValues();
    const existingMap = {}; // key -> rowIndex
    for (let i = 1; i < data.length; i++) {
      existingMap[data[i][0]] = i + 1;
    }

    let updated = 0;
    const now = new Date().toISOString();

    keys.forEach(key => {
      const val = JSON.stringify(incoming[key]);
      if (existingMap[key]) {
        sheet.getRange(existingMap[key], 2, 1, 2).setValues([[val, now]]);
      } else {
        sheet.appendRow([key, val, now]);
        existingMap[key] = sheet.getLastRow();
      }
      updated++;
    });

    console.log(`[Settings] Updated ${updated} keys.`);
    return createResponse({ ok: true, data: { updated } });
  }

  return createResponse({ ok: false, error: `Unknown action: ${action}` }, 400);
}

function handleRecords(body) {
  const sheet = getOrCreateSheet(SHEET_NAME_RECORDS, COLUMNS_RECORDS);
  const action = body.action || 'save';

  if (action === 'get') {
    const data = sheet.getDataRange().getValues();
    // Headers are at row 0
    const headers = data[0]; 
    const records = [];
    
    // Feature: Since Filtering (Scalability)
    const since = body.since ? new Date(body.since).getTime() : 0;
    const updatedAtColIdx = headers.indexOf('updatedAt');

    for (let i = 1; i < data.length; i++) {
      // If since filter is active and row has updatedAt, check it
      if (since > 0 && updatedAtColIdx !== -1) {
        const rowUpdated = new Date(data[i][updatedAtColIdx]).getTime();
        if (rowUpdated <= since) continue; // Skip old records
      }

      const row = {};
      let hasData = false;
      for (let j = 0; j < headers.length; j++) {
        const val = data[i][j];
        row[headers[j]] = val;
        if (val !== '') hasData = true;
      }
      if (hasData) records.push(row);
    }
    console.log(`[Records] Returning ${records.length} records (since: ${body.since || 'all'})`);
    return createResponse({ ok: true, data: { records } });
  }

  if (action === 'save') {
    const incoming = body.records;
    if (!Array.isArray(incoming)) {
      return createResponse({ ok: false, error: 'Invalid records format. Expected array.' }, 400);
    }
    
    if (incoming.length === 0) {
      return createResponse({ ok: true, data: { updated: 0 } });
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('id');

    if (idCol === -1) {
      return createResponse({ ok: false, error: 'Critical: Sheet missing "id" column' }, 500);
    }

    const idToRow = {};
    for (let i = 1; i < data.length; i++) {
      idToRow[data[i][idCol]] = i + 1;
    }

    let updated = 0;
    incoming.forEach(rec => {
      // Filter values based on Strict Columns
      const rowValues = headers.map(h => {
        if (h === 'deleted') return rec[h] ? 'true' : 'false';
        return rec[h] !== undefined ? rec[h] : '';
      });

      if (idToRow[rec.id]) {
        sheet.getRange(idToRow[rec.id], 1, 1, headers.length).setValues([rowValues]);
      } else {
        sheet.appendRow(rowValues);
      }
      updated++;
    });

    console.log(`[Records] Upserted ${updated} records.`);
    return createResponse({ ok: true, data: { updated } });
  }

  return createResponse({ ok: false, error: `Unknown action: ${action}` }, 400);
}

function doGet(e) {
  return createResponse({ ok: false, error: 'GET not supported. Use POST with apiVersion: 1' }, 405);
}

function createResponse(payload, code) {
  // code is ignored by GAS but kept for internal logic/readability
  const response = {
    ok: payload.ok,
    version: VERSION,
    apiVersion: API_VERSION,
    ...payload
  };
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
