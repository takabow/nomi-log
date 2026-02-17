/**
 * Google Apps Script for nomi-log sync
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

function getOrCreateSheetRecords() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME_RECORDS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_RECORDS);
    sheet.appendRow([
      'id', 'date', 'name', 'type', 'percentage', 'amountMl',
      'createdAt', 'updatedAt', 'deleted'
    ]);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
  }
  return sheet;
}

function getOrCreateSheetSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME_SETTINGS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_SETTINGS);
    sheet.appendRow(['key', 'value', 'updatedAt']);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  }
  return sheet;
}

/**
 * GET:
 * - ?type=records (default): 全レコードを JSON で返す
 * - ?type=settings: 全設定を JSON で返す { key: value, ... }
 */
function doGet(e) {
  try {
    const type = e.parameter.type || 'records';

    if (type === 'settings') {
      const sheet = getOrCreateSheetSettings();
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        return jsonResponse({ settings: {} });
      }
      const settings = {};
      // Skip header, read key-value
      for (let i = 1; i < data.length; i++) {
        const key = data[i][0];
        const val = data[i][1];
        if (key) {
           try {
             settings[key] = JSON.parse(val);
           } catch (e) {
             settings[key] = val;
           }
        }
      }
      return jsonResponse({ settings });
    }

    // Default: records
    const sheet = getOrCreateSheetRecords();
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return jsonResponse({ records: [] });
    }
    const headers = data[0];
    const records = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      obj.percentage = Number(obj.percentage);
      obj.amountMl = Number(obj.amountMl);
      obj.deleted = obj.deleted === true || obj.deleted === 'true';
      return obj;
    });
    return jsonResponse({ records });

  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

/**
 * POST:
 * - type=records (default): レコードを upsert
 * - type=settings: 設定を upsert (key ベース)
 */
function doPost(e) {
  try {
    const type = e.parameter.type || 'records';
    const body = JSON.parse(e.postData.contents);

    if (type === 'settings') {
      const sheet = getOrCreateSheetSettings();
      const incoming = body.settings || {}; // { key: value, ... }
      const keys = Object.keys(incoming);
      if (keys.length === 0) return jsonResponse({ updated: 0 });

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
      return jsonResponse({ updated });
    }

    // Default: records
    const incoming = body.records || [];
    if (incoming.length === 0) {
      return jsonResponse({ updated: 0 });
    }

    const sheet = getOrCreateSheetRecords();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('id');

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

    return jsonResponse({ updated });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

function jsonResponse(data, code) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
