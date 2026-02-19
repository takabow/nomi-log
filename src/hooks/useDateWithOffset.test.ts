import { renderHook } from '@testing-library/react';
import { useDateWithOffset } from './useDateWithOffset';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

describe('useDateWithOffset', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns date in YYYY-MM-DD format without spaces', () => {
        // Mock date to 2026-02-19 12:00:00
        const date = new Date(2026, 1, 19, 12, 0, 0);
        vi.setSystemTime(date);

        const { result } = renderHook(() => useDateWithOffset());

        // Check strict equality to ensure no spaces
        expect(result.current.dateStr).toBe('2026-02-19');
        expect(result.current.dateStr).not.toMatch(/\s/);
    });
});
