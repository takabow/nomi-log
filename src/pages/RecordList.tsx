import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Cloud } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { calcPureAlcohol } from '../types';
import type { DrinkingRecord } from '../types';
import { trySync, isConfigured } from '../data/sync';
import { getDrinkTypes } from '../data/drinkTypes';



import DailySummary from '../components/DailySummary';
import { useDateWithOffset } from '../hooks/useDateWithOffset';

export default function RecordList() {
    const navigate = useNavigate();
    const { dateStr: today, isLateNight, displayDate } = useDateWithOffset();
    const records = useLiveQuery(
        () => db.records.filter(r => !r.deleted).reverse().sortBy('date'),
    );

    const [drinkTypeMaps] = useState(() => {
        const types = getDrinkTypes();
        const coef: Record<string, number> = {};
        const emoji: Record<string, string> = {};

        types.forEach(t => {
            if (t.coef) coef[t.name] = t.coef;
            emoji[t.name] = t.emoji;
        });
        return { coef, emoji };
    });

    const coefMap = drinkTypeMaps.coef;
    const emojiMap = drinkTypeMaps.emoji;

    const handleOkawari = async (record: DrinkingRecord) => {
        // No confirm needed as per user request
        const now = new Date().toISOString();
        const today = now.split('T')[0]; // YYYY-MM-DD
        const newRecord: DrinkingRecord = {
            id: now,
            date: today,
            type: record.type,
            name: record.name,
            amountMl: record.amountMl,
            percentage: record.percentage,
            createdAt: now,
            updatedAt: now,
            deleted: false,
            synced: false,
        };

        try {
            await db.records.add(newRecord as DrinkingRecord);
            if (navigator.vibrate) navigator.vibrate(50); // Feedback
            if (!isConfigured()) {
                console.warn('[nomi-log] Sync not configured');
            } else {
                trySync(); // Auto-sync after add
            }
        } catch (e) {
            console.error(e);
            alert('エラーが発生しました');
        }
    };

    const handleDelete = async (record: DrinkingRecord) => {
        if (!confirm('この記録を削除しますか？')) return;
        try {
            await db.records.update(record.id, {
                deleted: true,
                updatedAt: new Date().toISOString(),
                synced: false,
            });
            if (!isConfigured()) {
                console.warn('[nomi-log] Sync not configured');
            } else {
                trySync(); // Auto-sync after delete
            }
        } catch (e) {
            console.error(e);
            alert('削除に失敗しました');
        }
    };

    if (!records) return <div className="flex items-center justify-center h-40 text-text-muted">読み込み中...</div>;

    const grouped = records.reduce<Record<string, DrinkingRecord[]>>((acc, r) => {
        const dateKey = r.date.split('T')[0];
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(r);
        return acc;
    }, {});

    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
    };

    if (records.length === 0) {
        // ... (existing empty state) ...
    }

    return (
        <div className="max-w-lg mx-auto">
            {/* Record List */}
            <div className="px-5 pt-6 space-y-5 stagger-children">
                {/* Header */}
                <div className="flex items-center justify-between pb-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent-teal bg-clip-text text-transparent">
                            Nomilog
                        </h1>
                        {/* Daily Summary (Inline) */}
                        <div className="mt-0.5">
                            <DailySummary
                                records={records}
                                dateStr={today}
                                coefMap={coefMap}
                                label={isLateNight ? `${displayDate} (深夜)` : `${displayDate}の記録`}
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (!isConfigured()) {
                                alert('設定画面でGoogle Sheetsと連携してください');
                                navigate('/settings');
                            } else {
                                trySync();
                            }
                        }}
                        className="p-2 rounded-full text-text-muted hover:text-primary hover:bg-white/5 transition-colors active:scale-95"
                        title="同期する"
                    >
                        <Cloud size={20} />
                    </button>
                </div>

                {sortedDates.map((date) => (

                    <div key={date}>
                        {/* Date header */}
                        <div className="flex items-center gap-3 mb-3 px-1">
                            <span className="text-xs font-semibold text-text-secondary tracking-wide uppercase">
                                {formatDate(date)}
                            </span>
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-text-muted">
                                {grouped[date].length}杯
                            </span>
                        </div>

                        {/* Cards */}
                        <div className="space-y-2">
                            {grouped[date].map((record) => (
                                <SwipeableRecordItem
                                    key={record.id}
                                    record={record}
                                    onOkawari={handleOkawari}
                                    onDelete={handleDelete}
                                    navigate={navigate}
                                    emojiMap={emojiMap}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* FAB */}
            <button
                onClick={() => navigate('/add')}
                className="fixed bottom-24 right-5 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-bg-dark flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 fab-glow"
            >
                <Plus size={26} strokeWidth={2.5} />
            </button>
        </div>
    );
}

// Separate component to handle per-item scroll state
function SwipeableRecordItem({
    record,
    onOkawari,
    onDelete,
    navigate,
    emojiMap
}: {
    record: DrinkingRecord;
    onOkawari: (r: DrinkingRecord) => void;
    onDelete: (r: DrinkingRecord) => void;
    navigate: (path: string) => void;
    emojiMap: Record<string, string>;
}) {
    const alcohol = calcPureAlcohol(record.amountMl, record.percentage);

    return (
        <div className="relative w-full rounded-2xl overflow-hidden touch-pan-x">
            <div
                className="flex w-full overflow-x-auto snap-x no-scrollbar"
            >
                {/* Main Card */}
                <div className="min-w-full snap-start">
                    <div
                        className="glass-card-sm p-3 group hover:border-border-light transition-all duration-300 cursor-pointer active:scale-[0.98]"
                        onClick={() => navigate(`/edit/${record.id}`)}
                    >
                        {/* Reuse inner content */}
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-bg-surface flex items-center justify-center text-base shrink-0">
                                {emojiMap[record.type] || '🍸'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-text-primary text-sm truncate">
                                    {record.name || record.type}
                                </p>
                                <p className="text-[11px] text-text-muted mt-0.5">
                                    {record.type} · {record.amountMl}ml · {record.percentage}%
                                </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-baseline justify-end gap-1">
                                    <span className="text-base font-bold text-text-primary tabular-nums">
                                        {alcohol.toFixed(1)}
                                    </span>
                                    <span className="text-[10px] text-text-muted">g</span>
                                </div>
                                {/* Existing Okawari button as backup or alternative */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOkawari(record);
                                    }}
                                    className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-all border border-transparent hover:border-primary/20"
                                    title="おかわり (複製して追加)"
                                >
                                    <span className="block w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary text-xs font-bold">+</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Action (Delete - Left Swipe to Reveal) */}
                <div className="min-w-[80px] snap-center flex items-center justify-center ml-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(record);
                        }}
                        className="w-full h-full bg-danger/20 text-danger border border-danger/30 rounded-2xl flex flex-col items-center justify-center gap-1 active:bg-danger/30 transition-colors"
                    >
                        <Trash2 size={20} />
                        <span className="text-[10px] font-bold">削除</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
