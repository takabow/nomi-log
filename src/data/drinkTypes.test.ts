import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDrinkTypes, saveDrinkTypes, resetDrinkTypes, DEFAULT_DRINK_TYPES } from './drinkTypes';

describe('drinkTypes Data Logic', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('returns default drink types when storage is empty', () => {
        const types = getDrinkTypes();
        expect(types).toEqual(DEFAULT_DRINK_TYPES);
        expect(types.length).toBeGreaterThan(0);
    });

    it('returns stored drink types from localStorage', () => {
        const dummyTypes = [
            { id: 'test', name: 'Test Drink', emoji: '🧪', percent: 50, coef: 1.0 }
        ];
        localStorage.setItem('nomi-log-drink-types', JSON.stringify(dummyTypes));

        const types = getDrinkTypes();
        expect(types).toEqual(dummyTypes);
    });

    it('saves drink types to localStorage', () => {
        const newTypes = [...DEFAULT_DRINK_TYPES];
        newTypes[0].name = 'Modified Beer';

        saveDrinkTypes(newTypes);

        const stored = localStorage.getItem('nomi-log-drink-types');
        expect(stored).toBeTruthy();
        expect(JSON.parse(stored!)).toEqual(newTypes);
    });

    it('resets drink types (removes from localStorage)', () => {
        localStorage.setItem('nomi-log-drink-types', '[]');
        resetDrinkTypes();
        expect(localStorage.getItem('nomi-log-drink-types')).toBeNull();
    });

    it('handles corrupted JSON in localStorage by returning defaults', () => {
        localStorage.setItem('nomi-log-drink-types', '{invalid-json');
        const types = getDrinkTypes();
        expect(types).toEqual(DEFAULT_DRINK_TYPES);
    });
});
