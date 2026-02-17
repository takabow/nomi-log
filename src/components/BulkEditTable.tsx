import { useState, useMemo, useCallback } from 'react';
import { Save, RotateCcw, Trash2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import type { DrinkingRecord, DrinkType } from '../types';
import { getDrinkTypes } from '../data/drinkTypes';
import { getVolumePresets } from '../data/volumePresets';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { trySync } from '../data/sync';

interface Props {
    currentMonth: Date;
}

type EditableFields = Pick<DrinkingRecord, 'name' | 'type' | 'percentage' | 'amountMl'>;

export default function BulkEditTable({ currentMonth }: Props) {
    const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

    const records = useLiveQuery(
        () =>
            db.records
                .filter(r => !r.deleted && r.date >= monthStart && r.date <= monthEnd)
                .toArray()
                .then(recs => recs.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))),
        [monthStart, monthEnd],
    );

    const presets = getVolumePresets();
    const drinkTypes = useMemo(() => getDrinkTypes(), []);

    // Track edits: { [recordId]: { field: newValue } }
    const [edits, setEdits] = useState<Record<string, Partial<EditableFields>>>({});
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const hasEdits = useMemo(() => Object.keys(edits).length > 0, [edits]);
    const hasSelection = useMemo(() => selectedIds.size > 0, [selectedIds]);

    const getField = useCallback(
        <K extends keyof EditableFields>(record: DrinkingRecord, field: K): EditableFields[K] => {
            return edits[record.id]?.[field] ?? record[field];
        },
        [edits],
    );

    const setField = useCallback(
        <K extends keyof EditableFields>(record: DrinkingRecord, field: K, value: EditableFields[K]) => {
            setEdits(prev => {
                const current = prev[record.id] ?? {};
                // If value matches original, remove the edit
                if (value === record[field]) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { [field]: _, ...rest } = current;
                    if (Object.keys(rest).length === 0) {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { [record.id]: __, ...remaining } = prev;
                        return remaining;
                    }
                    return { ...prev, [record.id]: rest };
                }
                return { ...prev, [record.id]: { ...current, [field]: value } };
            });
        },
        [],
    );

    const isEdited = useCallback(
        (recordId: string, field?: keyof EditableFields) => {
            if (!edits[recordId]) return false;
            if (field) return field in edits[recordId];
            return Object.keys(edits[recordId]).length > 0;
        },
        [edits],
    );

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (!records) return;
        if (selectedIds.size === records.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(records.map(r => r.id)));
        }
    };

    const handleSave = async () => {
        if (!hasEdits) return;
        setSaving(true);
        const now = new Date().toISOString();

        await db.transaction('rw', db.records, async () => {
            for (const [id, changes] of Object.entries(edits)) {
                await db.records.update(id, {
                    ...changes,
                    updatedAt: now,
                    synced: false,
                });
            }
        });

        trySync(); // Auto-sync after bulk save

        setEdits({});
        setSaving(false);
        setSavedMsg(true);
        setTimeout(() => setSavedMsg(false), 2000);
    };

    const handleBulkDelete = async () => {
        if (!hasSelection) return;
        if (!confirm(`${selectedIds.size}件の記録を削除しますか？`)) return;

        const now = new Date().toISOString();
        await db.transaction('rw', db.records, async () => {
            for (const id of selectedIds) {
                await db.records.update(id, {
                    deleted: true,
                    updatedAt: now,
                    synced: false,
                });
            }
        });

        trySync();
        setSelectedIds(new Set());
    };

    const handleReset = () => {
        setEdits({});
    };

    if (!records) {
        return (
            <div className="px-5 mt-6">
                <div className="glass-card p-6 text-center text-text-muted text-sm">読み込み中...</div>
            </div>
        );
    }

    if (records.length === 0) {
        return (
            <div className="px-5 mt-6">
                <div className="glass-card p-6 text-center text-text-muted text-sm">
                    この月の記録はありません
                </div>
            </div>
        );
    }

    return (
        <div className="px-5 mt-6 mb-28">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-text-primary tracking-tight">
                    📝 一括編集
                    <span className="ml-2 text-text-muted font-normal">{records.length}件</span>
                </h3>
                <div className="flex items-center gap-2">
                    {savedMsg && (
                        <span className="text-xs text-accent-teal font-medium animate-fade-in">
                            ✓ 保存しました
                        </span>
                    )}
                    {hasSelection && (
                        <button
                            onClick={handleBulkDelete}
                            className="text-xs bg-danger/10 text-danger hover:bg-danger/20 font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                        >
                            <Trash2 size={12} />
                            削除 ({selectedIds.size})
                        </button>
                    )}
                    {hasEdits && (
                        <>
                            <button
                                onClick={handleReset}
                                className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1"
                            >
                                <RotateCcw size={12} />
                                リセット
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="text-xs bg-gradient-to-r from-primary to-primary-dark text-bg-dark font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-1 disabled:opacity-50"
                            >
                                <Save size={12} />
                                {saving ? '保存中...' : '一括保存'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-border text-text-muted">
                                <th className="w-8 py-2.5 px-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === records.length && records.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded border-border bg-transparent text-primary focus:ring-primary/20 cursor-pointer"
                                    />
                                </th>
                                <th className="text-left py-2.5 px-1 font-semibold whitespace-nowrap">日付</th>
                                <th className="text-left py-2.5 px-1 font-semibold whitespace-nowrap">名前</th>
                                <th className="text-left py-2.5 px-1 font-semibold whitespace-nowrap">酒類</th>
                                <th className="text-right py-2.5 px-1 font-semibold whitespace-nowrap">度数%</th>
                                <th className="text-right py-2.5 px-2 font-semibold whitespace-nowrap">量ml</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((record) => {
                                const rowEdited = isEdited(record.id);
                                const isSelected = selectedIds.has(record.id);

                                return (
                                    <tr
                                        key={record.id}
                                        className={`border-b border-border/50 last:border-0 transition-colors ${isSelected ? 'bg-primary/10' : rowEdited ? 'bg-primary/5' : 'hover:bg-bg-surface/50'
                                            }`}
                                    >
                                        <td className="py-2 px-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelect(record.id)}
                                                className="rounded border-border bg-transparent text-primary focus:ring-primary/20 cursor-pointer"
                                            />
                                        </td>

                                        {/* Date (read-only) */}
                                        <td className="py-2 px-1 text-text-muted whitespace-nowrap tabular-nums">
                                            {record.date.slice(5).replace('-', '/')}
                                        </td>

                                        {/* Name (editable) */}
                                        <td className="py-1 px-1">
                                            <input
                                                type="text"
                                                value={getField(record, 'name')}
                                                onChange={(e) => setField(record, 'name', e.target.value)}
                                                className={`w-full min-w-[80px] bg-transparent border rounded px-1.5 py-1 text-base text-text-primary outline-none transition-colors ${isEdited(record.id, 'name')
                                                    ? 'border-primary/50 bg-primary/5'
                                                    : 'border-transparent hover:border-border focus:border-border-light'
                                                    }`}
                                                placeholder="名前"
                                            />
                                        </td>

                                        {/* Type (editable select) */}
                                        <td className="py-1 px-1">
                                            <select
                                                value={getField(record, 'type')}
                                                onChange={(e) => setField(record, 'type', e.target.value as DrinkType)}
                                                className={`w-full min-w-[80px] bg-transparent border rounded px-1 py-1 text-base text-text-primary outline-none appearance-none cursor-pointer transition-colors ${isEdited(record.id, 'type')
                                                    ? 'border-primary/50 bg-primary/5'
                                                    : 'border-transparent hover:border-border focus:border-border-light'
                                                    }`}
                                            >
                                                {drinkTypes.map((t) => (
                                                    <option key={t.id} value={t.name}>{t.name}</option>
                                                ))}
                                            </select>
                                        </td>

                                        {/* Percentage (editable) */}
                                        <td className="py-1 px-1">
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                max="100"
                                                value={getField(record, 'percentage')}
                                                onChange={(e) => setField(record, 'percentage', Number(e.target.value))}
                                                className={`w-full min-w-[50px] bg-transparent border rounded px-1.5 py-1 text-right text-base text-text-primary outline-none tabular-nums transition-colors ${isEdited(record.id, 'percentage')
                                                    ? 'border-primary/50 bg-primary/5'
                                                    : 'border-transparent hover:border-border focus:border-border-light'
                                                    }`}
                                            />
                                        </td>

                                        {/* Amount (editable dropdown) */}
                                        <td className="py-1 px-1">
                                            <select
                                                value={getField(record, 'amountMl')}
                                                onChange={(e) => setField(record, 'amountMl', Number(e.target.value))}
                                                className={`w-full min-w-[70px] bg-transparent border rounded px-1 py-1 text-right text-base text-text-primary outline-none appearance-none cursor-pointer tabular-nums transition-colors ${isEdited(record.id, 'amountMl')
                                                    ? 'border-primary/50 bg-primary/5'
                                                    : 'border-transparent hover:border-border focus:border-border-light'
                                                    }`}
                                            >
                                                {presets.map((p) => (
                                                    <option key={p.ml} value={p.ml}>
                                                        {p.ml}
                                                    </option>
                                                ))}
                                                {/* Show current value even if not in presets */}
                                                {!presets.some(p => p.ml === getField(record, 'amountMl')) && (
                                                    <option value={getField(record, 'amountMl')}>{getField(record, 'amountMl')}</option>
                                                )}
                                            </select>
                                        </td>


                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit count indicator */}
            {hasEdits && (
                <div className="mt-3 text-center">
                    <span className="text-xs text-primary font-medium">
                        {Object.keys(edits).length}件を変更中
                    </span>
                </div>
            )}
        </div>
    );
}
