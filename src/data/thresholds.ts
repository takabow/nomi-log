export interface ColorThresholds {
    /** Below or equal to this → teal/blue (safe) */
    low: number;
    /** Below or equal to this → yellow/primary (moderate); above → red/danger */
    high: number;
}

export interface AllThresholds {
    daily: ColorThresholds;
    weekly: ColorThresholds;
    monthly: ColorThresholds;
}

const DEFAULT_THRESHOLDS: AllThresholds = {
    daily: { low: 20, high: 40 },
    weekly: { low: 140, high: 280 },
    monthly: { low: 600, high: 1200 },
};

const STORAGE_KEY = 'nomi-log-color-thresholds';

export function getThresholds(): AllThresholds {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
    } catch {
        // ignore
    }
    return DEFAULT_THRESHOLDS;
}

export function saveThresholds(t: AllThresholds): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

export function resetThresholds(): void {
    localStorage.removeItem(STORAGE_KEY);
}

export { DEFAULT_THRESHOLDS };
