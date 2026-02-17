export interface DrinkingRecord {
    id: string;
    date: string; // YYYY-MM-DD
    name: string;
    type: DrinkType;
    percentage: number;
    amountMl: number;
    createdAt: string;
    updatedAt: string;
    deleted: boolean;
    synced: boolean;
}

export type DrinkType = string; // Changed to string to allow custom types

export const DRINK_TYPES: string[] = [
    'ビール',
    'チューハイ/サワー',
    'ハイボール',
    'ワイン',
    '日本酒',
    '焼酎',
    'ウイスキー',
    'その他',
];

export const AMOUNT_PRESETS = [180, 350, 500, 700, 750];

export function calcPureAlcohol(amountMl: number, percentage: number): number {
    return amountMl * (percentage / 100) * 0.8;
}

export function calcCannedBeerEquiv(pureAlcoholG: number): number {
    return pureAlcoholG / 14;
}

export function calcStandardUnit(pureAlcoholG: number): number {
    return pureAlcoholG / 20;
}

export function calcCalories(pureAlcoholG: number, coef: number = 1): number {
    return pureAlcoholG * 7.1 * coef;
}
