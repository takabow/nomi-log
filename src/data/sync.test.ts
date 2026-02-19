import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getGasUrl, setGasUrl, isConfigured } from './sync';

describe('Sync Configuration Logic', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    describe('getGasUrl', () => {
        it('returns empty string if not set', () => {
            expect(getGasUrl()).toBe('');
        });

        it('returns stored URL', () => {
            localStorage.setItem('nomi-log-gas-url', 'https://example.com/exec');
            expect(getGasUrl()).toBe('https://example.com/exec');
        });
    });

    describe('setGasUrl', () => {
        it('saves URL to localStorage', () => {
            setGasUrl('https://foo.bar/exec');
            expect(localStorage.getItem('nomi-log-gas-url')).toBe('https://foo.bar/exec');
        });

        it('trims whitespace', () => {
            setGasUrl('  https://trim.me  ');
            expect(localStorage.getItem('nomi-log-gas-url')).toBe('https://trim.me');
        });
    });

    describe('isConfigured', () => {
        it('returns false when URL is empty', () => {
            expect(isConfigured()).toBe(false);
        });

        it('returns true when URL is set', () => {
            setGasUrl('https://valid.url');
            expect(isConfigured()).toBe(true);
        });
    });
});

import { pullFromSheets, trySync } from './sync';

// Mock dependencies
vi.mock('./db', () => ({
    db: {
        records: {
            filter: () => ({
                toArray: () => Promise.resolve([]), // no unsynced records
                count: () => Promise.resolve(0),
            }),
            transaction: (_mode: unknown, _table: unknown, callback: () => void) => callback(),
            get: () => Promise.resolve(undefined),
            add: () => Promise.resolve(),
            update: () => Promise.resolve(),
        }
    }
}));

// Mock global fetch
const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

describe('Sync Logic (Mocked)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
        setGasUrl('https://mock.gas/exec');
        // Reset fetch mock implementation
        fetchMock.mockReset();
    });

    describe('pullFromSheets', () => {
        it('includes "since" parameter in request body', async () => {
            const mockResponse = {
                ok: true,
                version: '2026-09-99-future', // ensuring version check passes
                data: { records: [] }
            };
            fetchMock.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            await pullFromSheets('2025-01-01T00:00:00.000Z');

            expect(fetchMock).toHaveBeenCalledWith(
                'https://mock.gas/exec',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"since":"2025-01-01T00:00:00.000Z"')
                })
            );
        });
    });

    describe('trySync', () => {
        it('attempts push then pull', async () => {
            // Mock successful responses
            const mockResponse = {
                ok: true,
                version: '2026-09-99-future',
                data: { updated: 1, records: [] }
            };
            fetchMock.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            // Trigger sync
            // Since trySync is void and async internally, we can't await it directly easily without modifying it or using timers/flush promises.
            // For this test, we accept that we can't easily wait for it unless we spy on something or sleep.
            // But we can check if it calls fetch.

            // To make it testable, we might need to expose the promise or use a different approach.
            // However, verify at least that it doesn't crash.
            trySync();

            // Wait a tick
            await new Promise(r => setTimeout(r, 10));

            // It should call fetch at least once (for push)
            expect(fetchMock).toHaveBeenCalled();
        });
    });
});
