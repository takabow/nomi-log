/**
 * Google Apps Script for nomi-log sync (Strict API Version)
 *
 * シート構造 (自動作成):
 * 1. 'records': 飲酒記録
 *    id | date | name | type | percentage | amountMl | createdAt | updatedAt | deleted
 *
 * 2. 'settings': アプリ設定 (Key-Value)
 *    key | value | updatedAt
 */

const SHEET_NAME_RECORDS = 'records';
const SHEET_NAME_SETTINGS = 'settings';
const VERSION = '2026-02-18-strict';

function getOrCreateSheetRecords() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME_RECORDS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_RECORDS);
    sheet.appendRow(['id', 'date', 'name', 'type', 'percentage', 'amountMl', 'createdAt', 'updatedAt', 'deleted']);
  }
  return sheet;
}

function getOrCreateSheetSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME_SETTINGS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_SETTINGS);
    sheet.appendRow(['key', 'value', 'updatedAt']);
  }
  return sheet;
}

/**
 * Handle POST requests
 * Expected Body: { type: 'records' | 'settings', ...payload }
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  // Wait up to 10 seconds for other processes to finish
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

    // Strict type check
    if (!body.type) {
      return createResponse({ ok: false, error: 'Missing "type" field in body' }, 400);
    }

    if (body.type === 'settings') {
      return handleSettings(body);
    } else if (body.type === 'records') {
      return handleRecords(body);
    } else {
      return createResponse({ ok: false, error: `Unknown type: ${body.type}` }, 400);
    }

  } catch (err) {
    return createResponse({ ok: false, error: err.message }, 500);
  } finally {
    lock.releaseLock();
  }
}

function handleSettings(body) {
  const sheet = getOrCreateSheetSettings();
  const action = body.action || 'save'; // Default/Backup

  if (action === 'get') {
    const data = sheet.getDataRange().getValues();
    const settings = {};
    // Row 0 is header. Start from 1.
    for (let i = 1; i < data.length; i++) {
      try {
        // value is stored as JSON string
        settings[data[i][0]] = JSON.parse(data[i][1]);
      } catch (e) {
        settings[data[i][0]] = data[i][1];
      }
    }
    return createResponse({ ok: true, data: { settings } });
  }

  if (action === 'save') {
    const incoming = body.settings || {}; // { key: value, ... }
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

    return createResponse({ ok: true, data: { updated } });
  }

  return createResponse({ ok: false, error: `Unknown action: ${action}` }, 400);
}

function handleRecords(body) {
  const sheet = getOrCreateSheetRecords();
  const action = body.action || 'save';

  if (action === 'get') {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const records = [];
    for (let i = 1; i < data.length; i++) {
      const row = {};
      let hasData = false;
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
        if (data[i][j] !== '') hasData = true;
      }
      if (hasData) records.push(row);
    }
    return createResponse({ ok: true, data: { records } });
  }

  if (action === 'save') {
    const incoming = body.records || [];
    if (incoming.length === 0) {
      return createResponse({ ok: true, data: { updated: 0 } });
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('id');

    if (idCol === -1) {
      return createResponse({ ok: false, error: 'Sheet header issue: id column not found' }, 500);
    }

    const idToRow = {};
    for (let i = 1; i < data.length; i++) {
      idToRow[data[i][idCol]] = i + 1;
    }

    let updated = 0;
    incoming.forEach(rec => {
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

    return createResponse({ ok: true, data: { updated } });
  }

  return createResponse({ ok: false, error: `Unknown action: ${action}` }, 400);
}

function doGet(e) {
  // Simple check or data retrieval could go here, for now standardized error
  return createResponse({ ok: false, error: 'GET not supported' }, 405);
}

/**
 * Standardized Response Formatter
 * {
 *   ok: boolean,
 *   version: string,
 *   data?: any,
 *   error?: string
 * }
 */
function createResponse(payload, code) {
  const response = {
    ok: payload.ok,
    version: VERSION,
    ...payload
  };
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
