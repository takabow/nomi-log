import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getVolumePresets, saveVolumePresets, resetVolumePresets, DEFAULT_VOLUME_PRESETS } from './volumePresets';

describe('volumePresets Data Logic', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('returns default presets when storage is empty', () => {
        const presets = getVolumePresets();
        expect(presets).toEqual(DEFAULT_VOLUME_PRESETS);
        expect(presets.length).toBeGreaterThan(0);
    });

    it('returns stored presets from localStorage', () => {
        const custom = [{ ml: 999, label: 'Mega Pint' }];
        localStorage.setItem('nomi-log-volume-presets', JSON.stringify(custom));

        const presets = getVolumePresets();
        expect(presets).toEqual(custom);
        expect(presets[0].ml).toBe(999);
    });

    it('saves presets to localStorage', () => {
        const newPresets = [{ ml: 123, label: 'Custom' }];
        saveVolumePresets(newPresets);

        const stored = localStorage.getItem('nomi-log-volume-presets');
        expect(stored).toBeTruthy();
        expect(JSON.parse(stored!)).toEqual(newPresets);
    });

    it('resets presets (removes from localStorage)', () => {
        localStorage.setItem('nomi-log-volume-presets', '[]');
        resetVolumePresets();
        expect(localStorage.getItem('nomi-log-volume-presets')).toBeNull();
    });
});
