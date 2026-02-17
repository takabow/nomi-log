export interface VolumePreset {
    ml: number;
    label: string;
}

// Default volume presets with descriptive labels
const DEFAULT_VOLUME_PRESETS: VolumePreset[] = [
    { ml: 30, label: 'シングル / ショット' },
    { ml: 45, label: 'ジガー' },
    { ml: 60, label: 'ダブル' },
    { ml: 90, label: '半合（ぐい呑み）' },
    { ml: 120, label: 'ワイングラス (小)' },
    { ml: 135, label: '日本酒グラス（0.75合）' },
    { ml: 150, label: 'グラスワイン' },
    { ml: 180, label: '一合（正徳）' },
    { ml: 200, label: 'コップ1杯 / 小徳利' },
    { ml: 237, label: 'USハーフパイント / 8oz' },
    { ml: 240, label: 'ハーフパイント（日本）' },
    { ml: 250, label: 'タンブラー' },
    { ml: 270, label: '一合半 / 徳利（大）' },
    { ml: 280, label: '小ジョッキ' },
    { ml: 284, label: 'UKハーフパイント / 10oz' },
    { ml: 300, label: '冷酒ボトル' },
    { ml: 330, label: '小瓶・缶' },
    { ml: 350, label: 'ビール缶' },
    { ml: 355, label: 'US缶' },
    { ml: 360, label: '二合' },
    { ml: 375, label: 'ハーフボトル' },
    { ml: 420, label: '420ml' },
    { ml: 473, label: 'USパイント' },
    { ml: 500, label: 'ロング缶' },
    { ml: 510, label: '510ml' },
    { ml: 568, label: 'UKパイント / 20oz' },
    { ml: 633, label: '大瓶' },
    { ml: 700, label: 'ボトル' },
    { ml: 720, label: '四合瓶' },
    { ml: 750, label: 'ワインボトル' },
    { ml: 1000, label: '1リットル' },
    { ml: 1800, label: '一升瓶' },
];

const STORAGE_KEY = 'nomi-log-volume-presets';

export function getVolumePresets(): VolumePreset[] {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch {
        // ignore
    }
    return DEFAULT_VOLUME_PRESETS;
}

export function saveVolumePresets(presets: VolumePreset[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function resetVolumePresets(): void {
    localStorage.removeItem(STORAGE_KEY);
}

export { DEFAULT_VOLUME_PRESETS };
