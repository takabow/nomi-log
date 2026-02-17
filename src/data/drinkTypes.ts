export interface DrinkType {
    id: string;
    name: string;
    emoji: string;
    percent: number;
    defaultAmount?: number;
    coef?: number; // Calorie coefficient (default 1.0)
}

const STORAGE_KEY_TYPES = 'nomi-log-drink-types';
const STORAGE_KEY_DEFAULT_ID = 'nomi-log-default-type-id';

// Default drink types
const DEFAULT_DRINK_TYPES: DrinkType[] = [
    { id: 'beer', name: 'ビール', emoji: '🍺', percent: 5, defaultAmount: 350, coef: 1.5 },
    { id: 'craft_beer', name: 'クラフトビール(IPA)', emoji: '🍺', percent: 7, defaultAmount: 350, coef: 1.7 },
    { id: 'chu-hi', name: 'チューハイ/サワー', emoji: '🍋', percent: 5, defaultAmount: 350, coef: 1.0 },
    { id: 'highball', name: 'ハイボール', emoji: '🥃', percent: 7, defaultAmount: 350, coef: 1.0 },
    { id: 'wine', name: 'ワイン', emoji: '🍷', percent: 12, defaultAmount: 120, coef: 1.1 },
    { id: 'sake', name: '日本酒', emoji: '🍶', percent: 15, defaultAmount: 180, coef: 1.3 },
    { id: 'shochu', name: '焼酎', emoji: '🫗', percent: 25, defaultAmount: 60, coef: 1.0 },
    { id: 'whisky', name: 'ウイスキー', emoji: '🥃', percent: 40, defaultAmount: 30, coef: 1.0 },
    { id: 'other', name: 'その他', emoji: '🍸', percent: 5, coef: 1.0 },
];

export function getDrinkTypes(): DrinkType[] {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_TYPES);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch {
        // ignore
    }
    return DEFAULT_DRINK_TYPES;
}

export function saveDrinkTypes(types: DrinkType[]): void {
    localStorage.setItem(STORAGE_KEY_TYPES, JSON.stringify(types));
}

export function resetDrinkTypes(): void {
    localStorage.removeItem(STORAGE_KEY_TYPES);
}

export function getDefaultTypeId(): string {
    return localStorage.getItem(STORAGE_KEY_DEFAULT_ID) || 'beer';
}

export function setDefaultTypeId(id: string): void {
    localStorage.setItem(STORAGE_KEY_DEFAULT_ID, id);
}

export { DEFAULT_DRINK_TYPES };
