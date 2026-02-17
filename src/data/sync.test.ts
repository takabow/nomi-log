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
