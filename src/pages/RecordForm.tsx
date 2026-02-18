import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, Check, ChevronDown, Trash2 } from 'lucide-react';
import { calcPureAlcohol } from '../types';
import { db } from '../data/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { getVolumePresets } from '../data/volumePresets';
import { getDrinkTypes, getDefaultTypeId } from '../data/drinkTypes';
import { trySync } from '../data/sync';

import { useState, useRef, useEffect } from 'react';

export default function RecordForm() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = Boolean(id);
    const existing = useLiveQuery(
        () => (id ? db.records.get(id) : undefined),
        [id],
    );
    const today = new Date().toISOString().split('T')[0];

    const drinkTypes = getDrinkTypes();
    const defaultTypeId = getDefaultTypeId();
    const defaultType = drinkTypes.find(d => d.id === defaultTypeId) || drinkTypes[0];

    // Initialize state from existing record if available
    // The component is keyed by existing.id, so it remounts when data loads/changes
    const [date, setDate] = useState(existing?.date ?? today);
    const [percentage, setPercentage] = useState(existing?.percentage ?? defaultType.percent);
    const [amountMl, setAmountMl] = useState(existing?.amountMl ?? 350);
    const [typeName, setTypeName] = useState<string>(existing?.type ?? defaultType.name);
    const [name, setName] = useState(existing?.name ?? '');

    // Update state when existing record is loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (existing) {
            setDate(existing.date);
            setPercentage(existing.percentage);
            setAmountMl(existing.amountMl);
            setTypeName(existing.type);
            setName(existing.name || '');
        }
    }, [existing]);

    // Helper to find type by name
    const currentTypeObj = drinkTypes.find(d => d.name === typeName) || { emoji: '🍺', name: typeName, percent: 5, id: 'custom' };

    // Volume dropdown state
    const [showDropdown, setShowDropdown] = useState(false);
    const [customInput, setCustomInput] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const presets = getVolumePresets();

    // Find matching preset label
    const currentPreset = presets.find((p) => p.ml === amountMl);

    const alcohol = calcPureAlcohol(amountMl, percentage);

    // Type Dropdown state
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const typeDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
                setShowTypeDropdown(false);
            }
        }
        if (showTypeDropdown) {
            document.addEventListener('mousedown', handleClick);
            return () => document.removeEventListener('mousedown', handleClick);
        }
    }, [showTypeDropdown]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const now = new Date().toISOString();
        const recordData = {
            date, name, type: typeName, percentage, amountMl,
            updatedAt: now, synced: false,
        };

        if (isEdit && id) {
            await db.records.update(id, recordData);
        } else {
            await db.records.add({
                ...recordData,
                id: now, // ID is timestamp for new records
                createdAt: now,
                deleted: false,
            });
        }
        navigate('/');
        trySync();
    };

    const handleDelete = async () => {
        if (!id) return;
        if (!confirm('この記録を削除しますか？')) return;
        await db.records.update(id, {
            deleted: true,
            updatedAt: new Date().toISOString(),
            synced: false,
        });
        navigate('/');
        trySync();
    };

    return (
        <div key={existing?.id ?? 'new'} className="max-w-lg mx-auto h-[100dvh] flex flex-col bg-bg-dark">
            {/* Header */}
            <header className="px-5 pt-safe-top pb-2 flex items-center justify-between shrink-0 z-10 bg-bg-dark/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-xl bg-bg-surface border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-border-light transition-all btn-press"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-bold text-text-primary">
                        {isEdit ? '記録を編集' : '記録を追加'}
                    </h1>
                </div>
                {isEdit && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="w-10 h-10 rounded-xl bg-bg-surface border border-border flex items-center justify-center text-danger hover:text-danger hover:border-danger/30 hover:bg-danger/10 transition-all btn-press"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4 animate-fade-in custom-scrollbar">
                {/* Preview card - Compact */}
                <div className="glass-card p-3 flex items-center gap-3 shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xl shrink-0">
                        {currentTypeObj.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-secondary truncate">{name || typeName}</p>
                        <p className="text-xl font-extrabold gradient-text tabular-nums leading-tight">
                            {alcohol.toFixed(1)}
                            <span className="text-xs ml-1 font-normal text-text-muted">g</span>
                        </p>
                    </div>
                    <div className="text-right text-[10px] text-text-muted leading-tight shrink-0">
                        <p>{amountMl}ml</p>
                        <p>{percentage}%</p>
                    </div>
                </div>

                {/* Date & Percentage Row */}
                <div className="flex gap-2">
                    {/* Date */}
                    <div className="flex-1 min-w-0">
                        <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                            日付
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                            className="w-full px-1 py-2.5 bg-bg-surface border border-border rounded-xl text-base font-bold text-text-primary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all text-center"
                        />
                    </div>

                    {/* Percentage */}
                    <div className="flex-1 min-w-0">
                        <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5 ">
                            度数%
                        </label>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setPercentage(Math.max(0.1, +(percentage - 0.5).toFixed(1)))}
                                className="w-8 h-10 rounded-xl border border-border bg-bg-surface flex items-center justify-center text-text-primary hover:bg-border hover:border-border-light transition-all btn-press shrink-0"
                            >
                                <Minus size={14} />
                            </button>
                            <input
                                type="number"
                                value={percentage}
                                onChange={(e) => setPercentage(Number(e.target.value))}
                                step="0.1"
                                min="0.1"
                                max="100"
                                required
                                className="flex-1 px-0 py-2.5 bg-bg-surface border border-border rounded-xl text-center text-base font-bold text-text-primary focus:outline-none focus:border-primary/50 transition-all tabular-nums min-w-0"
                            />
                            <button
                                type="button"
                                onClick={() => setPercentage(Math.min(100, +(percentage + 0.5).toFixed(1)))}
                                className="w-8 h-10 rounded-xl border border-border bg-bg-surface flex items-center justify-center text-text-primary hover:bg-border hover:border-border-light transition-all btn-press shrink-0"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Amount — Dropdown selector */}
                <div>
                    <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                        量 (ml)
                    </label>
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => { setShowDropdown(!showDropdown); setCustomInput(false); }}
                            className="w-full px-4 py-2.5 bg-bg-surface border border-border rounded-xl text-text-primary flex items-center justify-between hover:border-border-light transition-all"
                        >
                            <span className="font-bold text-base tabular-nums">{amountMl}ml</span>
                            <span className="flex items-center gap-2">
                                {currentPreset && (
                                    <span className="text-[10px] text-text-muted truncate max-w-[120px]">{currentPreset.label}</span>
                                )}
                                <ChevronDown size={16} className={`text-text-muted transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                            </span>
                        </button>

                        {showDropdown && (
                            <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl bg-[#1a1a2e] border border-border shadow-xl shadow-black/50 custom-scrollbar">
                                {presets.map((p) => {
                                    const isSelected = amountMl === p.ml;
                                    return (
                                        <button
                                            key={p.ml}
                                            type="button"
                                            ref={isSelected ? (el) => el?.scrollIntoView({ block: 'center' }) : undefined}
                                            onClick={() => { setAmountMl(p.ml); setShowDropdown(false); setCustomInput(false); }}
                                            className={`w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-bg-surface transition-colors ${isSelected ? 'bg-primary/10' : ''}`}
                                        >
                                            <span className={`text-xs ${isSelected ? 'text-primary font-semibold' : 'text-text-secondary'}`}>{p.label}</span>
                                            <span className={`text-xs tabular-nums font-semibold ${isSelected ? 'text-primary' : 'text-text-primary'}`}>
                                                {p.ml}ml
                                            </span>
                                        </button>
                                    );
                                })}
                                <div className="border-t border-border p-2">
                                    {customInput ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                autoFocus
                                                placeholder="ml"
                                                min="1"
                                                className="flex-1 px-3 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary/50 tabular-nums"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = Number((e.target as HTMLInputElement).value);
                                                        if (val > 0) { setAmountMl(val); setShowDropdown(false); setCustomInput(false); }
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="px-3 py-2 rounded-lg bg-primary text-bg-dark text-xs font-bold btn-press"
                                                onClick={(e) => {
                                                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                                    const val = Number(input.value);
                                                    if (val > 0) { setAmountMl(val); setShowDropdown(false); setCustomInput(false); }
                                                }}
                                            >
                                                OK
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setCustomInput(true)}
                                            className="w-full py-1.5 text-center text-xs text-primary font-medium hover:bg-bg-surface rounded-lg transition-colors"
                                        >
                                            カスタム入力...
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Type Selection */}
                <div>
                    <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                        酒類
                    </label>
                    <div className="relative" ref={typeDropdownRef}>
                        <button
                            type="button"
                            onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                            className="w-full px-4 py-3 bg-bg-surface border border-border rounded-xl text-text-primary flex items-center justify-between hover:border-border-light transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{currentTypeObj.emoji}</span>
                                <span className="font-bold text-lg">{typeName}</span>
                            </div>
                            <ChevronDown size={18} className={`text-text-muted transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showTypeDropdown && (
                            <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-xl bg-[#1a1a2e] border border-border shadow-2xl shadow-black/40">
                                {drinkTypes.map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => {
                                            setTypeName(t.name);
                                            setPercentage(t.percent);
                                            if (t.defaultAmount) {
                                                setAmountMl(t.defaultAmount);
                                            }
                                            setShowTypeDropdown(false);
                                        }}
                                        className={`w-full px-4 py-3 flex items-center justify-between text-left hover:bg-bg-surface transition-colors ${typeName === t.name ? 'bg-primary/15' : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl w-6 text-center">{t.emoji}</span>
                                            <span className={`text-sm ${typeName === t.name ? 'text-primary font-bold' : 'text-text-primary'}`}>
                                                {t.name}
                                            </span>
                                        </div>
                                        <span className="text-xs text-text-muted">{t.percent}%</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Name */}
                <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                        名前
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="例: スーパードライ"
                        className="w-full px-4 py-3 bg-bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-text-muted"
                    />
                </div>

                {/* Footer Actions */}
                <div className="mt-6 mb-safe-bottom">
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="flex-[0.4] py-3.5 rounded-xl border border-border text-text-secondary hover:bg-bg-surface hover:border-border-light transition-all font-semibold btn-press text-sm"
                        >
                            キャンセル
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-bg-dark font-bold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-primary/25 btn-press text-sm"
                        >
                            <Check size={18} strokeWidth={2.5} />
                            保存する
                        </button>
                    </div>
                </div>
            </div>




        </div >
    );
}
