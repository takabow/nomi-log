import { format } from 'date-fns';
import { db } from './db';
import type { DrinkingRecord } from '../types';

import { getVolumePresets } from './volumePresets';
import { getThresholds } from './thresholds';

const STORAGE_KEY_URL = 'nomi-log-gas-url';
const STORAGE_KEY_LAST_SYNC = 'nomi-log-last-sync';
const SETTINGS_KEYS = [
    'nomi-log-volume-presets',
    'nomi-log-color-thresholds',
    'nomi-log-drink-types',
    'nomi-log-default-type-id',
];

/* ──────────────── URL Management ──────────────── */

export function getGasUrl(): string {
    return localStorage.getItem(STORAGE_KEY_URL) ?? '';
}

export function setGasUrl(url: string): void {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
}

export function getLastSyncTime(): string {
    return localStorage.getItem(STORAGE_KEY_LAST_SYNC) ?? '';
}

function setLastSyncTime(): void {
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, new Date().toISOString());
}

export function isConfigured(): boolean {
    return getGasUrl().length > 0;
}

/* ──────────────── Push (App → Sheets) ──────────────── */

export async function pushToSheets(): Promise<{ updated: number }> {
    const url = getGasUrl();
    if (!url) throw new Error('GAS URL が未設定です');

    const unsynced = await db.records.filter(r => !r.synced).toArray();
    if (unsynced.length === 0) return { updated: 0 };

    const res = await fetch(getGasUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
            apiVersion: 1,
            type: 'records',
            action: 'save',
            records: unsynced
        })
    });

    if (!res.ok) throw new Error(`Sheets push failed: ${res.status}`);
    const json = await res.json();

    // Check version and error
    if (!checkGasVersion(json)) return { updated: 0 };
    if (!json.ok) throw new Error(`GAS Error: ${json.error}`);

    const result = json.data;

    await db.transaction('rw', db.records, async () => {
        for (const rec of unsynced) {
            await db.records.update(rec.id, { synced: true });
        }
    });

    setLastSyncTime();
    return { updated: result.updated ?? unsynced.length };
}

/* ──────────────── Pull (Sheets → App) ──────────────── */

export async function pullFromSheets(since?: string): Promise<{ merged: number }> {
    const url = getGasUrl();
    if (!url) throw new Error('GAS URL が未設定です');
    // Use POST for read as well (Strict API)
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
            apiVersion: 1,
            type: 'records',
            action: 'get',
            since: since
        })
    });

    if (!res.ok) throw new Error(`Sheets pull failed: ${res.status}`);
    const json = await res.json();

    if (!checkGasVersion(json)) return { merged: 0 };
    if (!json.ok) throw new Error(`GAS Error: ${json.error}`);
    const data = json.data;

    const rawRecords = data.records ?? [];

    // Normalize date to yyyy-MM-dd to ensure compatibility with Analytics/Calendar
    // (Sheets might return ISO string like 2026-01-01T00:00:00.000Z)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const remoteRecords: Omit<DrinkingRecord, 'synced'>[] = rawRecords.map((r: any) => ({
        ...r,
        date: format(new Date(r.date), 'yyyy-MM-dd'),
    }));

    if (remoteRecords.length === 0) return { merged: 0 };

    let merged = 0;

    await db.transaction('rw', db.records, async () => {
        for (const remote of remoteRecords) {
            const local = await db.records.get(remote.id);
            if (!local) {
                await db.records.add({ ...remote, synced: true });
                merged++;
            } else {
                if (remote.updatedAt > local.updatedAt) {
                    await db.records.update(remote.id, {
                        ...remote,
                        synced: true,
                    });
                    merged++;
                }
            }
        }
    });

    setLastSyncTime();
    return { merged };
}

/* ──────────────── Settings Sync ──────────────── */

export async function pushSettings(): Promise<{ updated: number }> {
    const url = getGasUrl();
    if (!url) return { updated: 0 };

    // Use getters to ensure we send current state (including defaults if not in storage)
    const settings = {
        'nomi-log-volume-presets': getVolumePresets(),
        'nomi-log-color-thresholds': getThresholds(),
        'nomi-log-drink-types': JSON.parse(localStorage.getItem('nomi-log-drink-types') || 'null'), // getter not available here without import, easier to raw read or import.
        'nomi-log-default-type-id': localStorage.getItem('nomi-log-default-type-id'),
    };

    const urlObj = new URL(url);
    // No query params needed for Strict API
    const settingsUrl = urlObj.toString();

    console.log('[nomi-log] pushSettings URL:', settingsUrl);

    try {
        const res = await fetch(settingsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                apiVersion: 1,
                type: 'settings',
                action: 'save',
                settings
            }),
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Settings push failed: ${res.status} ${text}`);
        }

        const json = await res.json();
        console.log('[nomi-log] pushSettings result:', json);

        if (!checkGasVersion(json)) return { updated: 0 };
        if (!json.ok) throw new Error(`GAS Error: ${json.error}`);

        const result = json.data;
        return { updated: result.updated ?? 0 };
    } catch (e) {
        console.error('[nomi-log] pushSettings error:', e);
        throw e;
    }
}

export async function pullSettings(): Promise<{ updated: number }> {
    const url = getGasUrl();
    if (!url) return { updated: 0 };

    const settingsUrl = getGasUrl(); // Plain URL for POST

    const res = await fetch(settingsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
            apiVersion: 1,
            type: 'settings',
            action: 'get'
        })
    });

    if (!res.ok) throw new Error(`Settings pull failed: ${res.status}`);
    const json = await res.json();

    if (!checkGasVersion(json)) return { updated: 0 };
    if (!json.ok) throw new Error(`GAS Error: ${json.error}`);
    const data = json.data;

    const remoteSettings = data.settings || {};

    let updated = 0;
    for (const key of SETTINGS_KEYS) {
        if (remoteSettings[key]) {
            const val = JSON.stringify(remoteSettings[key]);
            if (localStorage.getItem(key) !== val) {
                localStorage.setItem(key, val);
                updated++;
            }
        }
    }
    return { updated };
}

/* ──────────────── Full Sync ──────────────── */

export async function fullSync(): Promise<{ pushed: number; pulled: number; settingsPushed: number; settingsPulled: number }> {
    const [pushRec, pullRec, pushSet, pullSet] = await Promise.all([
        pushToSheets(),
        pullFromSheets(),
        pushSettings(),
        pullSettings(),
    ]);

    return {
        pushed: pushRec.updated,
        pulled: pullRec.merged,
        settingsPushed: pushSet.updated,
        settingsPulled: pullSet.updated
    };
}

/* ──────────────── Background Sync (non-blocking) ──────────────── */


export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'update_required';

export const SYNC_EVENT_NAME = 'nomi-log-sync-status';

export function dispatchSyncStatus(status: SyncStatus, message?: string) {
    console.log('[nomi-log] dispatchSyncStatus:', status, message);
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: { status, message } }));
}

// Minimum required version of GAS script
const REQUIRED_GAS_VERSION_DATE = '2026-02-18-final';

interface GasResponse {
    ok: boolean;
    version?: string;
    apiVersion?: number;
    data?: unknown;
    error?: string;
}

function checkGasVersion(response: unknown): boolean {
    const r = response as GasResponse;
    const version = r.version;
    if (!version || version < REQUIRED_GAS_VERSION_DATE) {
        console.warn('[nomi-log] GAS version outdated:', version, 'required:', REQUIRED_GAS_VERSION_DATE);
        dispatchSyncStatus('update_required', 'GASスクリプトの更新が必要です');
        return false;
    }
    return true;
}

export function trySync(): void {
    if (!isConfigured()) {
        console.log('[nomi-log] trySync skipped: not configured');
        return;
    }
    if (!navigator.onLine) {
        console.log('[nomi-log] trySync skipped: offline');
        return;
    }

    console.log('[nomi-log] trySync started');
    dispatchSyncStatus('syncing');

    // Bidirectional sync
    executeBidirectionalSync()
        .then((res) => {
            if (res.pushed > 0 || res.pulled > 0) {
                dispatchSyncStatus('success', `同期: ↑${res.pushed} ↓${res.pulled}`);
            } else {
                dispatchSyncStatus('idle');
            }
        })
        .catch(err => {
            console.warn('[nomi-log sync] background sync failed:', err.message);
            dispatchSyncStatus('error', '同期に失敗しました');
        });
}

async function executeBidirectionalSync() {
    // Capture last sync time BEFORE push.
    // This ensures we pull changes that happened since the last successful sync.
    const lastSync = getLastSyncTime();

    const pushRes = await pushToSheets();

    // incremental pull
    const pullRes = await pullFromSheets(lastSync);

    return { pushed: pushRes.updated, pulled: pullRes.merged };
}

/* ──────────────── Unsynced Count ──────────────── */

export async function getUnsyncedCount(): Promise<number> {
    return db.records.filter(r => !r.synced).count();
}
