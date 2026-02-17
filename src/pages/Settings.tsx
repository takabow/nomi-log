import { useState, useEffect, useCallback } from 'react';
import { CloudOff, Cloud, RefreshCw, Download, Upload, Info, Plus, X, RotateCcw, ArrowUpFromLine, ArrowDownToLine, Star } from 'lucide-react';
import { getVolumePresets, saveVolumePresets, resetVolumePresets, type VolumePreset } from '../data/volumePresets';
import { getThresholds, saveThresholds, resetThresholds, type AllThresholds } from '../data/thresholds';
import { getDrinkTypes, saveDrinkTypes, resetDrinkTypes, getDefaultTypeId, setDefaultTypeId, type DrinkType } from '../data/drinkTypes';
import {
    getGasUrl, setGasUrl, isConfigured, getLastSyncTime,
    pushToSheets, pullFromSheets, fullSync, getUnsyncedCount,
    pushSettings, pullSettings,
} from '../data/sync';
import { db } from '../data/db';

type Tab = 'data' | 'customize';

export default function SettingsPage() {
    const [tab, setTab] = useState<Tab>('data');

    const [presets, setPresets] = useState<VolumePreset[]>(getVolumePresets);
    const [addMl, setAddMl] = useState('');
    const [addLabel, setAddLabel] = useState('');
    const [thresh, setThresh] = useState<AllThresholds>(getThresholds);

    // Sync state
    const [gasUrl, setGasUrlState] = useState(getGasUrl);
    const [urlEditing, setUrlEditing] = useState(false);
    const [urlDraft, setUrlDraft] = useState(gasUrl);
    const [syncing, setSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [unsyncedCount, setUnsyncedCount] = useState(0);
    const [lastSync, setLastSync] = useState(getLastSyncTime());

    const refreshSyncStatus = useCallback(async () => {
        setUnsyncedCount(await getUnsyncedCount());
        setLastSync(getLastSyncTime());
    }, []);

    useEffect(() => { refreshSyncStatus(); }, [refreshSyncStatus]);

    // Persistence effect
    useEffect(() => {
        saveThresholds(thresh);
    }, [thresh]);

    const updateThresh = (period: keyof AllThresholds, field: 'low' | 'high', value: number) => {
        setThresh(prev => {
            const current = prev[period];
            // Just update the value, validation happens on blur
            const newLow = field === 'low' ? value : current.low;
            const newHigh = field === 'high' ? value : current.high;
            return { ...prev, [period]: { low: newLow, high: newHigh } };
        });
    };

    const handleResetThresh = () => {
        if (!confirm('グラフ色しきい値を初期値に戻しますか？')) return;
        resetThresholds();
        setThresh(getThresholds());
    };

    const handleInputBlur = (
        _e: React.FocusEvent<HTMLInputElement>,
        period: keyof AllThresholds,
        field: 'low' | 'high'
    ) => {
        setThresh(prev => {
            const current = prev[period];
            let { low, high } = current;

            // Enforce low <= high
            if (low > high) {
                if (field === 'low') {
                    // If we just finished editing low and it's higher than high, raise high
                    high = low;
                } else {
                    // If we just finished editing high and it's lower than low, lower low
                    low = high;
                }
            }
            return { ...prev, [period]: { low, high } };
        });
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        period: keyof AllThresholds,
        field: 'low' | 'high'
    ) => {
        const val = e.target.value.replace(/[^0-9]/g, '');
        const num = Number(val);
        updateThresh(period, field, num);
    };

    const [editingPresetAmount, setEditingPresetAmount] = useState<number | null>(null);

    const handleAddPreset = () => {
        const ml = Number(addMl);
        if (ml > 0 && addLabel.trim()) {
            let updated = [...presets];
            if (editingPresetAmount !== null) {
                // Remove the old preset if we are editing
                updated = updated.filter(p => p.ml !== editingPresetAmount);
            }
            // Add new/updated preset
            // If ml already exists (and not the one we are editing), it will be overwritten (filtered out and re-added)
            // or we should check for duplicates? The current logic allows overwrites which is fine.
            // Let's filter out ANY existing with same ml to avoid duplicates
            updated = updated.filter(p => p.ml !== ml);

            updated.push({ ml, label: addLabel.trim() });
            updated.sort((a, b) => a.ml - b.ml);

            setPresets(updated);
            saveVolumePresets(updated);
            setAddMl('');
            setAddLabel('');
            setEditingPresetAmount(null);
        }
    };

    const handleSelectPreset = (preset: VolumePreset) => {
        setAddMl(preset.ml.toString());
        setAddLabel(preset.label);
        setEditingPresetAmount(preset.ml);
    };

    const handleCancelEditPreset = () => {
        setAddMl('');
        setAddLabel('');
        setEditingPresetAmount(null);
    };

    /* ──────────────── Drink Types Logic ──────────────── */
    const [drinkTypes, setDrinkTypes] = useState<DrinkType[]>(getDrinkTypes);
    const [defaultTypeId, setDefaultType] = useState(getDefaultTypeId);
    const [addDrinkName, setAddDrinkName] = useState('');
    const [addDrinkEmoji, setAddDrinkEmoji] = useState('🍺');
    const [addDrinkPercent, setAddDrinkPercent] = useState('5');
    const [addDrinkAmount, setAddDrinkAmount] = useState('');
    const [addDrinkCoef, setAddDrinkCoef] = useState('1.0');
    const [editingDrinkId, setEditingDrinkId] = useState<string | null>(null);

    const handleAddDrinkType = () => {
        if (!addDrinkName.trim()) return;

        let updated = [...drinkTypes];
        const defaultAmount = addDrinkAmount ? Number(addDrinkAmount) : undefined;
        const coef = addDrinkCoef ? Number(addDrinkCoef) : 1.0;

        if (editingDrinkId) {
            // Update existing
            updated = updated.map(t => t.id === editingDrinkId ? {
                ...t,
                name: addDrinkName.trim(),
                emoji: addDrinkEmoji,
                percent: Number(addDrinkPercent),
                defaultAmount,
                coef,
            } : t);
        } else {
            // Add new
            const newType: DrinkType = {
                id: crypto.randomUUID(),
                name: addDrinkName.trim(),
                emoji: addDrinkEmoji,
                percent: Number(addDrinkPercent),
                defaultAmount,
                coef,
            };
            updated.push(newType);
        }

        setDrinkTypes(updated);
        saveDrinkTypes(updated);
        setAddDrinkName('');
        setAddDrinkEmoji('🍺');
        setAddDrinkPercent('5');
        setAddDrinkAmount('');
        setAddDrinkCoef('1.0');
        setEditingDrinkId(null);
    };

    const handleSelectDrinkType = (type: DrinkType) => {
        setAddDrinkName(type.name);
        setAddDrinkEmoji(type.emoji);
        setAddDrinkPercent(type.percent.toString());
        setAddDrinkAmount(type.defaultAmount?.toString() || '');
        setAddDrinkCoef(type.coef?.toString() || '1.0');
        setEditingDrinkId(type.id);
    };

    const handleCancelEditDrink = () => {
        setAddDrinkName('');
        setAddDrinkEmoji('🍺');
        setAddDrinkPercent('5');
        setAddDrinkAmount('');
        setAddDrinkCoef('1.0');
        setEditingDrinkId(null);
    };

    const handleDeleteDrinkType = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent selection when deleting
        if (drinkTypes.length <= 1) {
            alert('これ以上削除できません');
            return;
        }
        if (id === defaultTypeId) {
            alert('デフォルトの酒類は削除できません');
            return;
        }
        if (!confirm('この酒類を削除しますか？')) return;
        const updated = drinkTypes.filter(d => d.id !== id);
        setDrinkTypes(updated);
        saveDrinkTypes(updated);
        if (editingDrinkId === id) {
            handleCancelEditDrink();
        }
    };

    const handleSetDefaultType = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDefaultType(id);
        setDefaultTypeId(id);
    };

    const handleResetDrinkTypes = () => {
        if (!confirm('酒類設定を初期状態に戻しますか？')) return;
        resetDrinkTypes();
        setDrinkTypes(getDrinkTypes());
        setDefaultType(getDefaultTypeId());
        handleCancelEditDrink();
    };

    const handleDeletePreset = (ml: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`量プリセット (${ml}ml) を削除しますか？`)) return;
        const updated = presets.filter((p) => p.ml !== ml);
        setPresets(updated);
        saveVolumePresets(updated);
        if (editingPresetAmount === ml) {
            handleCancelEditPreset();
        }
    };

    const handleReset = () => {
        if (!confirm('量プリセットを初期状態に戻しますか？')) return;
        resetVolumePresets();
        setPresets(getVolumePresets());
        handleCancelEditPreset();
    };

    const handleSaveUrl = () => {
        setGasUrl(urlDraft.trim());
        setGasUrlState(urlDraft.trim());
        setUrlEditing(false);
    };

    const handleDisconnect = () => {
        if (!confirm('連携を解除しますか？\n（URL設定がクリアされます）')) return;
        setGasUrl('');
        setGasUrlState('');
        showMsg('ok', '連携を解除しました');
        refreshSyncStatus();
    };

    const showMsg = (type: 'ok' | 'err', text: string) => {
        setSyncMsg({ type, text });
        setTimeout(() => setSyncMsg(null), 4000);
    };

    const handlePush = async (e: React.MouseEvent) => {
        e.preventDefault();
        setSyncing(true);
        try {
            const [rec, set] = await Promise.all([pushToSheets(), pushSettings()]);
            showMsg('ok', `↑${rec.updated}件の記録、${set.updated}件の設定を送信しました`);
            await refreshSyncStatus();
        } catch (e: unknown) {
            showMsg('err', e instanceof Error ? e.message : 'Unknown error');
        } finally {
            setSyncing(false);
        }
    };

    const handlePull = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!confirm('Sheets のデータでローカルを上書きしますか？（updatedAt が新しい方が優先）')) return;
        setSyncing(true);
        try {
            const [rec, set] = await Promise.all([pullFromSheets(), pullSettings()]);
            showMsg('ok', `↓${rec.merged}件の記録と設定を取得しました`);

            // Refresh settings UI
            if (set.updated > 0) {
                setPresets(getVolumePresets());
                setThresh(getThresholds());
                setDrinkTypes(getDrinkTypes());
                setDefaultType(getDefaultTypeId());
            }
            await refreshSyncStatus();
        } catch (e: unknown) {
            showMsg('err', e instanceof Error ? e.message : 'Unknown error');
        } finally {
            setSyncing(false);
        }
    };

    const handleFullSync = async (e: React.MouseEvent) => {
        e.preventDefault();
        setSyncing(true);
        try {
            const result = await fullSync();
            // Refresh settings UI if pulled
            if (result.settingsPulled > 0) {
                setPresets(getVolumePresets());
                setThresh(getThresholds());
                setDrinkTypes(getDrinkTypes());
                setDefaultType(getDefaultTypeId());
            }
            showMsg('ok', `↑${result.pushed}件送信 ↓${result.pulled}件取得 (設定含む)`);
            await refreshSyncStatus();
        } catch (e: unknown) {
            showMsg('err', e instanceof Error ? e.message : 'Unknown error');
        } finally {
            setSyncing(false);
        }
    };

    const handleExport = async () => {
        const records = await db.records.toArray();
        const settings = {
            presets: getVolumePresets(),
            thresholds: getThresholds(),
            // gasUrl excluded by user request
        };
        const data = {
            version: 1,
            exportedAt: new Date().toISOString(),
            records,
            settings,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nomi-log-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportTrigger = () => {
        document.getElementById('import-file')?.click();
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm('現在のデータを上書き・またはマージしますか？')) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const text = ev.target?.result as string;
                const data = JSON.parse(text);

                if (!data.records || !Array.isArray(data.records)) throw new Error('Invalid format');

                await db.transaction('rw', db.records, async () => {
                    await db.records.bulkPut(data.records);
                });

                if (data.settings) {
                    if (data.settings.presets) saveVolumePresets(data.settings.presets);
                    if (data.settings.thresholds) saveThresholds(data.settings.thresholds);
                    // GAS URL is optional to import, maybe skip for security? or ask?
                    // For migration, importing GAS URL is useful.
                    if (data.settings.gasUrl) setGasUrl(data.settings.gasUrl);
                }

                setPresets(getVolumePresets());
                setThresh(getThresholds());
                setGasUrlState(getGasUrl());
                await refreshSyncStatus();

                showMsg('ok', `インポート完了: ${data.records.length}件の記録`);
                // Clear file input
                e.target.value = '';
            } catch (err: unknown) {
                showMsg('err', 'インポート失敗: ' + (err instanceof Error ? err.message : 'Unknown error'));
            }
        };
        reader.readAsText(file);
    };

    const formatLastSync = () => {
        if (!lastSync) return '--';
        const d = new Date(lastSync);
        return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const connected = isConfigured();

    return (
        <div className="max-w-lg mx-auto">
            {/* Tab bar */}
            <div className="px-5 pt-5">
                <div className="flex rounded-xl overflow-hidden border border-border bg-bg-surface/50">
                    <button
                        onClick={() => setTab('data')}
                        className={`flex-1 py-2.5 text-sm font-semibold transition-all ${tab === 'data'
                            ? 'bg-primary/20 text-primary border-b-2 border-primary'
                            : 'text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        📊 データ・同期
                    </button>
                    <button
                        onClick={() => setTab('customize')}
                        className={`flex-1 py-2.5 text-sm font-semibold transition-all ${tab === 'customize'
                            ? 'bg-primary/20 text-primary border-b-2 border-primary'
                            : 'text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        ⚙️ カスタマイズ
                    </button>
                </div>
            </div>

            <div className="px-5 pt-4 pb-28 space-y-4 animate-fade-in" key={tab}>

                {/* ═══════════ Data & Sync Tab ═══════════ */}
                {tab === 'data' && (
                    <>
                        {/* Google Sheets Sync */}
                        <div className="glass-card overflow-hidden">
                            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                                <span className="text-base">📊</span>
                                <h2 className="font-bold text-sm text-text-primary">Google Sheets 同期</h2>
                            </div>
                            <div className="p-4 space-y-3">
                                {/* Connection status */}
                                <div className="flex items-center gap-2.5 px-1">
                                    {connected ? (
                                        <>
                                            <Cloud size={16} className="text-accent-teal" />
                                            <span className="text-sm text-accent-teal font-medium">接続済み</span>
                                        </>
                                    ) : (
                                        <>
                                            <CloudOff size={16} className="text-text-muted" />
                                            <span className="text-sm text-text-muted">未接続</span>
                                        </>
                                    )}
                                    {unsyncedCount > 0 && (
                                        <span className="ml-auto text-xs text-primary font-medium">
                                            未同期: {unsyncedCount}件
                                        </span>
                                    )}
                                </div>

                                {/* GAS URL input */}
                                {urlEditing ? (
                                    <div className="space-y-2">
                                        <input
                                            type="url"
                                            value={urlDraft}
                                            onChange={(e) => setUrlDraft(e.target.value)}
                                            placeholder="GAS デプロイ URL を貼り付け"
                                            className="w-full px-3 py-2.5 bg-bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary/50 placeholder:text-text-muted"
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setUrlEditing(false); setUrlDraft(gasUrl); }}
                                                className="flex-1 py-2 glass-card-sm text-text-muted text-sm font-medium btn-press"
                                            >
                                                キャンセル
                                            </button>
                                            <button
                                                onClick={handleSaveUrl}
                                                disabled={!urlDraft.trim()}
                                                className="flex-1 py-2 bg-gradient-to-r from-primary to-primary-dark text-bg-dark text-sm font-bold rounded-xl btn-press disabled:opacity-30"
                                            >
                                                保存
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setUrlDraft(gasUrl); setUrlEditing(true); }}
                                            className="flex-[2] py-3 glass-card-sm text-text-primary font-semibold text-sm hover:border-border-light transition-all flex items-center justify-center gap-2.5 btn-press"
                                        >
                                            {connected ? '🔗 URL を変更' : '🔗 GAS URL を設定'}
                                        </button>
                                        {connected && (
                                            <button
                                                onClick={handleDisconnect}
                                                className="flex-1 py-3 glass-card-sm text-text-secondary font-semibold text-sm hover:text-danger hover:border-danger/30 transition-all flex items-center justify-center gap-1 btn-press"
                                            >
                                                解除
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Sync buttons (only when connected) */}
                                {connected && (
                                    <div className="space-y-2">
                                        <button
                                            onClick={handleFullSync}
                                            disabled={syncing}
                                            className="w-full py-3 glass-card-sm text-text-primary font-semibold text-sm hover:border-border-light transition-all flex items-center justify-center gap-2.5 btn-press disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                                            {syncing ? '同期中...' : '同期する'}
                                        </button>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handlePush}
                                                disabled={syncing}
                                                className="flex-1 py-2.5 glass-card-sm text-text-secondary text-xs font-medium hover:border-border-light transition-all flex items-center justify-center gap-1.5 btn-press disabled:opacity-40"
                                            >
                                                <ArrowUpFromLine size={13} />
                                                Sheets に送信
                                            </button>
                                            <button
                                                onClick={handlePull}
                                                disabled={syncing}
                                                className="flex-1 py-2.5 glass-card-sm text-text-secondary text-xs font-medium hover:border-border-light transition-all flex items-center justify-center gap-1.5 btn-press disabled:opacity-40"
                                            >
                                                <ArrowDownToLine size={13} />
                                                Sheets から復元
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {syncMsg && (
                                    <p className={`text-xs px-1 font-medium animate-fade-in ${syncMsg.type === 'ok' ? 'text-accent-teal' : 'text-danger'
                                        }`}>
                                        {syncMsg.type === 'ok' ? '✓' : '✗'} {syncMsg.text}
                                    </p>
                                )}

                                <p className="text-[11px] text-text-muted px-1">
                                    最終同期: {formatLastSync()}
                                </p>
                            </div>
                        </div>

                        {/* Data Management */}
                        <div className="glass-card overflow-hidden">
                            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                                <span className="text-base">💾</span>
                                <h2 className="font-bold text-sm text-text-primary">データ管理</h2>
                            </div>
                            <div className="p-4 space-y-2.5">
                                <button
                                    onClick={handleExport}
                                    className="w-full py-3 glass-card-sm text-text-primary font-semibold text-sm hover:border-border-light transition-all flex items-center justify-center gap-2.5 btn-press"
                                >
                                    <Download size={16} />
                                    データをエクスポート (JSON)
                                </button>
                                <button
                                    onClick={handleImportTrigger}
                                    className="w-full py-3 glass-card-sm text-text-primary font-semibold text-sm hover:border-border-light transition-all flex items-center justify-center gap-2.5 btn-press"
                                >
                                    <Upload size={16} />
                                    データをインポート
                                </button>
                                <input
                                    type="file"
                                    id="import-file"
                                    accept=".json"
                                    className="hidden"
                                    onChange={handleImportFile}
                                />
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="glass-card overflow-hidden border-danger/30">
                            <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-danger/5">
                                <span className="text-base">⚠️</span>
                                <h2 className="font-bold text-sm text-danger">Danger Zone</h2>
                            </div>
                            <div className="p-4 space-y-3">
                                <p className="text-xs text-text-muted leading-relaxed">
                                    データベースを完全にリセットします。この操作は取り消せません。<br />
                                    <span className="text-danger font-bold">※ Google Sheets 連携中は実行できません。</span>
                                </p>
                                <button
                                    onClick={async () => {
                                        if (connected) return;
                                        if (!confirm('本当に全データを削除しますか？\n（復元するにはエクスポート、またはSheets同期が必要です）')) return;
                                        if (!confirm('これが最後の確認です。よろしいですか？')) return;

                                        await db.records.clear();
                                        resetVolumePresets();
                                        setPresets(getVolumePresets());
                                        resetThresholds();
                                        setThresh(getThresholds());
                                        showMsg('ok', '全データを削除しました');
                                        await refreshSyncStatus();
                                    }}
                                    disabled={connected}
                                    className="w-full py-3 bg-bg-surface border border-danger/30 text-danger font-bold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all btn-press disabled:opacity-50 disabled:cursor-not-allowed disabled:border-border"
                                >
                                    <RotateCcw size={16} />
                                    {connected ? '連携を解除してから実行してください' : 'Reset Database (全削除)'}
                                </button>
                            </div>
                        </div>

                        {/* App Info */}
                        <div className="glass-card overflow-hidden">
                            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                                <span className="text-base">ℹ️</span>
                                <h2 className="font-bold text-sm text-text-primary">アプリ情報</h2>
                            </div>
                            <div className="p-4 text-sm text-text-muted space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <Info size={14} />
                                    <span>nomi-log v{__APP_VERSION__}</span>
                                </div>
                                <p className="text-xs pl-[22px]">Drinking Record PWA</p>
                            </div>
                        </div>
                    </>
                )}

                {/* ═══════════ Customize Tab ═══════════ */}
                {tab === 'customize' && (
                    <>
                        {/* Drink Types */}
                        <div className="glass-card overflow-hidden">
                            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-base">🍺</span>
                                    <h2 className="font-bold text-sm text-text-primary">酒類設定</h2>
                                </div>
                                <button
                                    onClick={handleResetDrinkTypes}
                                    className="flex items-center gap-1 text-[11px] text-text-muted hover:text-primary transition-colors"
                                >
                                    <RotateCcw size={12} />
                                    初期値に戻す
                                </button>
                            </div>
                            <div className="p-3 space-y-1 max-h-72 overflow-y-auto">
                                {drinkTypes.map((t) => (
                                    <div
                                        key={t.id}
                                        onClick={() => handleSelectDrinkType(t)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors group cursor-pointer ${editingDrinkId === t.id
                                            ? 'bg-primary/10 border border-primary/20'
                                            : 'hover:bg-bg-surface'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl w-8 text-center">{t.emoji}</span>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-text-primary">
                                                        {t.name}
                                                    </span>
                                                    {t.id === defaultTypeId && (
                                                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium">
                                                            標準
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-text-muted">
                                                    {t.percent}% / <span className="text-accent-blue">x{t.coef || 1.0}</span>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {t.id !== defaultTypeId && (
                                                <button
                                                    onClick={(e) => handleSetDefaultType(t.id, e)}
                                                    className="p-1.5 rounded text-text-muted/0 group-hover:text-text-muted hover:text-accent-teal transition-colors"
                                                    title="デフォルトに設定"
                                                >
                                                    <Star size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => handleDeleteDrinkType(t.id, e)}
                                                className="p-1.5 rounded text-text-muted/0 group-hover:text-text-muted hover:text-danger transition-colors disabled:opacity-30"
                                                disabled={t.id === defaultTypeId}
                                                title="削除"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Add new drink type */}
                            {/* Add new drink type */}
                            <div className={`border-t border-border p-3 transition-colors ${editingDrinkId ? 'bg-primary/5' : ''}`}>
                                <div className="space-y-2">
                                    {/* Row 1: Emoji & Name */}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="🍺"
                                            value={addDrinkEmoji}
                                            onChange={(e) => setAddDrinkEmoji(e.target.value)}
                                            className="w-10 px-0 py-2 bg-transparent text-center text-xl focus:outline-none border-b border-transparent focus:border-primary/50 transition-colors"
                                        />
                                        <input
                                            type="text"
                                            placeholder="名前 (例: ハイボール)"
                                            value={addDrinkName}
                                            onChange={(e) => setAddDrinkName(e.target.value)}
                                            className="flex-1 px-3 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary/50 placeholder:text-text-muted"
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddDrinkType()}
                                        />
                                    </div>

                                    {/* Row 2: Specs & Actions */}
                                    <div className="flex items-end gap-2">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-text-muted font-medium ml-1">度数</span>
                                            <div className="relative w-16">
                                                <input
                                                    type="number"
                                                    placeholder="%"
                                                    value={addDrinkPercent}
                                                    onChange={(e) => setAddDrinkPercent(e.target.value)}
                                                    step="0.1"
                                                    className="w-full pl-2 pr-4 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary/50 tabular-nums"
                                                />
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-muted">%</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-text-muted font-medium ml-1">標準の量</span>
                                            <div className="relative w-20">
                                                <input
                                                    type="number"
                                                    placeholder="ml"
                                                    value={addDrinkAmount}
                                                    onChange={(e) => setAddDrinkAmount(e.target.value)}
                                                    className="w-full pl-2 pr-5 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary/50 tabular-nums placeholder:text-text-muted/50"
                                                />
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-muted">ml</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-text-muted font-medium ml-1">カロリー係数</span>
                                            <div className="relative w-20">
                                                <input
                                                    type="number"
                                                    placeholder="x1.0"
                                                    value={addDrinkCoef}
                                                    onChange={(e) => setAddDrinkCoef(e.target.value)}
                                                    step="0.1"
                                                    className="w-full pl-6 pr-1 py-2 bg-bg-surface border border-border rounded-lg text-sm text-accent-blue font-medium focus:outline-none focus:border-primary/50 tabular-nums placeholder:text-text-muted/50"
                                                />
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-muted">🔥</span>
                                            </div>
                                        </div>

                                        <div className="flex-1"></div>

                                        {editingDrinkId && (
                                            <button
                                                type="button"
                                                onClick={handleCancelEditDrink}
                                                className="p-2 rounded-lg bg-bg-surface border border-border text-text-muted hover:text-text-primary btn-press transition-all mb-[1px]"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleAddDrinkType}
                                            disabled={!addDrinkName.trim()}
                                            className={`p-2 rounded-lg text-bg-dark disabled:opacity-30 disabled:cursor-not-allowed btn-press transition-all ${editingDrinkId ? 'bg-accent-teal' : 'bg-primary'
                                                }`}
                                        >
                                            {editingDrinkId ? <RefreshCw size={16} /> : <Plus size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Volume Presets */}
                        <div className="glass-card overflow-hidden">
                            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-base">🍶</span>
                                    <h2 className="font-bold text-sm text-text-primary">量プリセット</h2>
                                </div>
                                <button
                                    onClick={handleReset}
                                    className="flex items-center gap-1 text-[11px] text-text-muted hover:text-primary transition-colors"
                                >
                                    <RotateCcw size={12} />
                                    初期値に戻す
                                </button>
                            </div>
                            <div className="p-3 space-y-1 max-h-72 overflow-y-auto">
                                {presets.map((p) => (
                                    <div
                                        key={p.ml}
                                        onClick={() => handleSelectPreset(p)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors group cursor-pointer ${editingPresetAmount === p.ml
                                            ? 'bg-primary/10 border border-primary/20'
                                            : 'hover:bg-bg-surface'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-text-primary tabular-nums w-14">
                                                {p.ml}ml
                                            </span>
                                            <span className="text-xs text-text-muted">{p.label}</span>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeletePreset(p.ml, e)}
                                            className="p-1 rounded text-text-muted/0 group-hover:text-text-muted hover:text-danger transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {/* Add new preset */}
                            <div className={`border-t border-border p-3 transition-colors ${editingPresetAmount ? 'bg-primary/5' : ''}`}>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        placeholder="ml"
                                        value={addMl}
                                        onChange={(e) => setAddMl(e.target.value)}
                                        className="w-20 px-3 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary/50 tabular-nums"
                                    />
                                    <input
                                        type="text"
                                        placeholder="ラベル (例: 中ジョッキ)"
                                        value={addLabel}
                                        onChange={(e) => setAddLabel(e.target.value)}
                                        className="flex-1 px-3 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary/50 placeholder:text-text-muted"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddPreset()}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddPreset}
                                        disabled={!addMl || !addLabel.trim()}
                                        className={`p-2 rounded-lg text-bg-dark disabled:opacity-30 disabled:cursor-not-allowed btn-press transition-all ${editingPresetAmount ? 'bg-accent-teal' : 'bg-primary'
                                            }`}
                                    >
                                        {editingPresetAmount ? <RefreshCw size={16} /> : <Plus size={16} />}
                                    </button>
                                    {editingPresetAmount && (
                                        <button
                                            type="button"
                                            onClick={handleCancelEditPreset}
                                            className="p-2 rounded-lg bg-bg-surface border border-border text-text-muted hover:text-text-primary btn-press transition-all"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Color Thresholds */}
                        <div className="glass-card overflow-hidden">
                            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-base">🎨</span>
                                    <h2 className="font-bold text-sm text-text-primary">グラフ色しきい値 (純アルコール量 g)</h2>
                                </div>
                                <button
                                    onClick={handleResetThresh}
                                    className="flex items-center gap-1 text-[11px] text-text-muted hover:text-primary transition-colors"
                                >
                                    <RotateCcw size={12} />
                                    初期値に戻す
                                </button>
                            </div>
                            <div className="p-4 space-y-4">
                                {([
                                    { key: 'daily' as const, label: '日別' },
                                    { key: 'weekly' as const, label: '週別' },
                                    { key: 'monthly' as const, label: '月別' },
                                ]).map(({ key, label }) => {
                                    const low = thresh[key].low;
                                    const high = thresh[key].high;
                                    // Visual bar calculations
                                    const max = Math.max(high * 1.3, high + 10);
                                    const pLow = Math.min(100, Math.max(0, (low / max) * 100));
                                    const pWarn = Math.min(100 - pLow, Math.max(0, ((high - low) / max) * 100));
                                    const pDang = Math.max(0, 100 - pLow - pWarn);

                                    return (
                                        <div key={key} className="space-y-2">
                                            <p className="text-sm font-bold text-text-primary">{label}</p>

                                            {/* Visual Bar */}
                                            <div className="h-2.5 w-full rounded-full flex overflow-hidden bg-bg-surface border border-border/50">
                                                <div style={{ width: `${pLow}%` }} className="bg-accent-teal transition-all duration-300" />
                                                <div style={{ width: `${pWarn}%` }} className="bg-primary transition-all duration-300" />
                                                <div style={{ width: `${pDang}%` }} className="bg-danger transition-all duration-300" />
                                            </div>

                                            {/* Inputs */}
                                            <div className="flex gap-3 pt-1">
                                                <div className="flex-1">
                                                    <label className="text-[10px] text-accent-teal font-semibold block mb-1">
                                                        適正量 (〜{low}g)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        value={low}
                                                        onChange={(e) => handleInputChange(e, key, 'low')}
                                                        onBlur={(e) => handleInputBlur(e, key, 'low')}
                                                        className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-teal/50 tabular-nums font-medium transition-all"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-[10px] text-danger font-semibold block mb-1">
                                                        危険域 ({high}g〜)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        value={high}
                                                        onChange={(e) => handleInputChange(e, key, 'high')}
                                                        onBlur={(e) => handleInputBlur(e, key, 'high')}
                                                        className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-danger/50 tabular-nums font-medium transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
