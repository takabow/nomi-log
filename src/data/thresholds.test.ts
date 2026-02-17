import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getThresholds, saveThresholds, resetThresholds, DEFAULT_THRESHOLDS } from './thresholds';

describe('thresholds Data Logic', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('returns default thresholds when storage is empty', () => {
        const t = getThresholds();
        expect(t).toEqual(DEFAULT_THRESHOLDS);
    });

    it('returns stored thresholds from localStorage', () => {
        const custom = {
            ...DEFAULT_THRESHOLDS,
            daily: { low: 10, high: 20 }
        };
        localStorage.setItem('nomi-log-color-thresholds', JSON.stringify(custom));

        const t = getThresholds();
        expect(t).toEqual(custom);
        expect(t.daily.low).toBe(10);
    });

    it('saves thresholds to localStorage', () => {
        const newThresholds = { ...DEFAULT_THRESHOLDS };
        newThresholds.weekly.high = 999;

        saveThresholds(newThresholds);

        const stored = localStorage.getItem('nomi-log-color-thresholds');
        expect(stored).toBeTruthy();
        expect(JSON.parse(stored!)).toEqual(newThresholds);
    });

    it('resets thresholds (removes from localStorage)', () => {
        localStorage.setItem('nomi-log-color-thresholds', '{}');
        resetThresholds();
        expect(localStorage.getItem('nomi-log-color-thresholds')).toBeNull();
    });

    it('handles corrupted JSON in localStorage by returning defaults', () => {
        localStorage.setItem('nomi-log-color-thresholds', 'not-json');
        const t = getThresholds();
        expect(t).toEqual(DEFAULT_THRESHOLDS);
    });
});
