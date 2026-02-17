import { describe, it, expect } from 'vitest';
import { calcPureAlcohol, calcCannedBeerEquiv, calcStandardUnit, calcCalories } from './index';

describe('Alcohol Calculations', () => {
    describe('calcPureAlcohol', () => {
        it('calculates pure alcohol correctly', () => {
            // 350ml, 5% => 350 * 0.05 * 0.8 = 14g
            expect(calcPureAlcohol(350, 5)).toBe(14);
        });

        it('handles zero values', () => {
            expect(calcPureAlcohol(0, 5)).toBe(0);
            expect(calcPureAlcohol(350, 0)).toBe(0);
        });
    });

    describe('calcCannedBeerEquiv', () => {
        it('converts pure alcohol to beer cans (14g unit)', () => {
            expect(calcCannedBeerEquiv(14)).toBe(1);
            expect(calcCannedBeerEquiv(28)).toBe(2);
            expect(calcCannedBeerEquiv(7)).toBe(0.5);
        });
    });

    describe('calcStandardUnit', () => {
        it('converts pure alcohol to standard units (20g unit)', () => {
            expect(calcStandardUnit(20)).toBe(1);
            expect(calcStandardUnit(40)).toBe(2);
            expect(calcStandardUnit(10)).toBe(0.5);
        });
    });

    describe('calcCalories', () => {
        it('calculates calories with default coefficient (1.0)', () => {
            // 10g alcohol * 7.1kcal/g * 1.0 = 71kcal
            expect(calcCalories(10)).toBe(71);
        });

        it('calculates calories with custom coefficient', () => {
            // 10g alcohol * 7.1kcal/g * 1.5 (beer) = 106.5kcal
            expect(calcCalories(10, 1.5)).toBe(106.5);
        });
    });
});
