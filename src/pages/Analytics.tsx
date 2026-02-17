import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { getThresholds } from '../data/thresholds';
import { getDrinkTypes } from '../data/drinkTypes';
import {
    calcPureAlcohol,
    calcCannedBeerEquiv,
    calcStandardUnit,
    calcCalories,
} from '../types';
import type { DrinkingRecord } from '../types';
import {
    startOfDay, startOfWeek, startOfMonth,
    endOfDay, endOfWeek, endOfMonth,
    isWithinInterval, subWeeks, subMonths, format,
    eachDayOfInterval,
} from 'date-fns';
import { ja } from 'date-fns/locale';

type Period = 'recent' | 'week' | 'month';

const periodLabels: Record<Period, string> = {
    recent: '直近',
    week: '週間',
    month: '月間',
};

const parseLocalDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
};



const EMPTY_ARRAY: DrinkingRecord[] = [];

export default function Analytics() {
    const [period, setPeriod] = useState<Period>('recent');
    const [offset, setOffset] = useState(0);
    const records = useLiveQuery(
        () => db.records.filter(r => !r.deleted).toArray(),
    );
    const allRecords = records ?? EMPTY_ARRAY;

    const [coefMap] = useState<Record<string, number>>(() => {
        const types = getDrinkTypes();
        const map: Record<string, number> = {};
        types.forEach(t => {
            if (t.coef) map[t.name] = t.coef;
        });
        return map;
    });

    const { filtered, label, start, end } = useMemo(() => {
        const now = new Date();
        let s: Date, e: Date, lbl: string;

        if (period === 'recent') {
            const endDate = new Date(now);
            endDate.setDate(endDate.getDate() - offset * 7);
            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 6);
            s = startOfDay(startDate);
            e = endOfDay(endDate);
            lbl = `${format(s, 'MM/dd')} 〜 ${format(e, 'MM/dd')}`;
        } else if (period === 'week') {
            const target = subWeeks(now, offset);
            s = startOfWeek(target, { weekStartsOn: 1 });
            e = endOfWeek(target, { weekStartsOn: 1 });
            lbl = `${format(s, 'MM/dd (E)', { locale: ja })} 〜 ${format(e, 'MM/dd (E)', { locale: ja })}`;
        } else {
            const target = subMonths(now, offset);
            s = startOfMonth(target);
            e = endOfMonth(target);
            lbl = format(target, 'yyyy年M月', { locale: ja });
        }

        const recs = allRecords.filter((r: DrinkingRecord) =>
            isWithinInterval(parseLocalDate(r.date), { start: s, end: e })
        );
        return { filtered: recs, label: lbl, start: s, end: e };
    }, [period, offset, allRecords]);

    const stats = useMemo(() => {
        const count = filtered.length;
        const totalAlcohol = filtered.reduce(
            (sum, r) => sum + calcPureAlcohol(r.amountMl, r.percentage),
            0
        );
        const totalCalories = filtered.reduce((sum, r) => {
            const alcohol = calcPureAlcohol(r.amountMl, r.percentage);
            const coef = coefMap[r.type] ?? 1;
            return sum + calcCalories(alcohol, coef);
        }, 0);

        return {
            count,
            totalAlcohol,
            cannedBeer: calcCannedBeerEquiv(totalAlcohol),
            standardUnit: calcStandardUnit(totalAlcohol),
            calories: totalCalories,
        };
    }, [filtered, coefMap]);

    // Daily breakdown (for 直近 tab)
    const dailyData = useMemo(() => {
        if (period !== 'recent') return [];
        const days = eachDayOfInterval({ start, end });
        return days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayRecords = allRecords.filter((r: DrinkingRecord) => r.date === dateKey);
            const alcohol = dayRecords.reduce(
                (sum: number, r: DrinkingRecord) => sum + calcPureAlcohol(r.amountMl, r.percentage),
                0
            );
            return { label: format(day, 'M/d (E)', { locale: ja }), alcohol };
        }).reverse();
    }, [period, start, end, allRecords]);

    // Weekly breakdown (for 週間 tab) — show 8 weeks
    const weeklyData = useMemo(() => {
        if (period !== 'week') return [];
        const now = new Date();
        const weeks: { label: string; alcohol: number; isCurrent: boolean }[] = [];
        for (let i = 0; i <= 7; i++) {
            const target = subWeeks(now, i);
            const wStart = startOfWeek(target, { weekStartsOn: 1 });
            const wEnd = endOfWeek(target, { weekStartsOn: 1 });
            const alcohol = allRecords
                .filter((r: DrinkingRecord) => isWithinInterval(parseLocalDate(r.date), { start: wStart, end: wEnd }))
                .reduce((sum: number, r: DrinkingRecord) => sum + calcPureAlcohol(r.amountMl, r.percentage), 0);
            weeks.push({
                label: `${format(wStart, 'M/d')}〜`,
                alcohol,
                isCurrent: i === offset,
            });
        }
        return weeks;
    }, [period, offset, allRecords]);

    // Monthly breakdown (for 月間 tab) — show 6 months
    const monthlyData = useMemo(() => {
        if (period !== 'month') return [];
        const now = new Date();
        const months: { label: string; alcohol: number; isCurrent: boolean }[] = [];
        for (let i = 0; i <= 5; i++) {
            const target = subMonths(now, i);
            const mStart = startOfMonth(target);
            const mEnd = endOfMonth(target);
            const alcohol = allRecords
                .filter((r: DrinkingRecord) => isWithinInterval(parseLocalDate(r.date), { start: mStart, end: mEnd }))
                .reduce((sum: number, r: DrinkingRecord) => sum + calcPureAlcohol(r.amountMl, r.percentage), 0);
            months.push({
                label: format(target, 'M月', { locale: ja }),
                alcohol,
                isCurrent: i === offset,
            });
        }
        return months;
    }, [period, offset, allRecords]);

    const thresholds = getThresholds();
    const currentThresh = period === 'recent' ? thresholds.daily : period === 'week' ? thresholds.weekly : thresholds.monthly;

    const getBarColor = (alcohol: number) => {
        if (alcohol === 0) return 'bg-bg-surface';
        if (alcohol <= currentThresh.low) return 'bg-accent-teal';
        if (alcohol <= currentThresh.high) return 'bg-primary';
        return 'bg-danger';
    };

    // Pick the right chart data based on period
    const chartData = period === 'recent' ? dailyData.map((d) => ({ ...d, isCurrent: false }))
        : period === 'week' ? weeklyData
            : monthlyData;

    const maxAlcohol = useMemo(
        () => Math.max(...chartData.map((d) => d.alcohol), 1),
        [chartData]
    );

    const chartTitle = period === 'recent' ? '日別アルコール量'
        : period === 'week' ? '週別アルコール量'
            : '月別アルコール量';

    const summaryItems = [
        { label: '🍻 飲んだ数', value: `${stats.count}`, unit: '杯', color: 'text-primary' },
        { label: '💧 アルコール', value: stats.totalAlcohol.toFixed(1), unit: 'g', color: 'text-accent-purple' },
        { label: '🍺 缶ビール', value: stats.cannedBeer.toFixed(1), unit: '本', color: 'text-accent-blue' },
        { label: '📏 AL20g', value: stats.standardUnit.toFixed(1), unit: '杯', color: 'text-accent-teal' },
        { label: '🔥 カロリー', value: stats.calories.toFixed(0), unit: 'kcal', color: 'text-danger' },
    ];

    const avgDays = period === 'recent' ? 7
        : period === 'week' ? 7
            : Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return (
        <div className="max-w-lg mx-auto">
            {/* Period Selector */}
            <div className="px-5 pt-6 mb-4">
                <div className="glass-card-sm p-1.5 flex">
                    {(['recent', 'week', 'month'] as Period[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => { setPeriod(p); setOffset(0); }}
                            className={`flex-1 py-2.5 text-sm font-bold text-center rounded-xl transition-all duration-300 btn-press ${period === p
                                ? 'bg-gradient-to-r from-primary to-primary-dark text-bg-dark shadow-md shadow-primary/20'
                                : 'text-text-muted hover:text-text-secondary'
                                }`}
                        >
                            {periodLabels[p]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Period Navigation */}
            <div className="flex items-center justify-between px-5 mb-4">
                <button
                    onClick={() => setOffset(offset + 1)}
                    className="w-10 h-10 rounded-xl bg-bg-surface border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-border-light transition-all btn-press"
                >
                    <ChevronLeft size={20} />
                </button>
                <span className="font-bold text-text-primary text-base">{label}</span>
                <button
                    onClick={() => setOffset(Math.max(0, offset - 1))}
                    disabled={offset === 0}
                    className={`w-10 h-10 rounded-xl bg-bg-surface border border-border flex items-center justify-center transition-all btn-press ${offset === 0 ? 'text-text-muted cursor-not-allowed opacity-40' : 'text-text-secondary hover:text-text-primary hover:border-border-light'
                        }`}
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {filtered.length === 0 && period === 'recent' ? (
                <div className="p-12 text-center">
                    <p className="text-5xl mb-4">🍵</p>
                    <p className="text-text-muted font-medium">この期間の記録はありません</p>
                </div>
            ) : (
                <div className="px-5 space-y-3 animate-fade-in">
                    {/* Compact Summary Row */}
                    <div className="glass-card p-3">
                        <div className="grid grid-cols-5 gap-1">
                            {summaryItems.map(({ label, value, unit, color }) => (
                                <div key={label} className="text-center">
                                    <p className="text-[9px] text-text-muted leading-tight mb-1 truncate">{label}</p>
                                    <p className={`text-sm font-extrabold tabular-nums leading-none ${color}`}>{value}</p>
                                    <p className="text-[9px] text-text-muted mt-0.5">{unit}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bar Chart */}
                    <div className="glass-card p-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{chartTitle}</p>
                            <p className="text-[10px] text-text-muted">合計g · 🍺本</p>
                        </div>
                        <div className="space-y-1.5">
                            {chartData.map((d, idx) => {
                                const beer = calcCannedBeerEquiv(d.alcohol);
                                return (
                                    <div key={idx} className="flex items-center gap-1.5">
                                        <span className={`text-[11px] font-medium w-14 shrink-0 tabular-nums ${d.isCurrent ? 'text-primary font-bold' : 'text-text-muted'}`}>
                                            {d.label}
                                        </span>
                                        <div className="flex-1 h-5 rounded-md bg-bg-dark/50 overflow-hidden">
                                            {d.alcohol > 0 && (
                                                <div
                                                    className={`h-full rounded-md ${getBarColor(d.alcohol)} transition-all duration-500`}
                                                    style={{ width: `${Math.max((d.alcohol / maxAlcohol) * 100, 4)}%` }}
                                                />
                                            )}
                                        </div>
                                        <span className={`text-[11px] font-bold tabular-nums w-10 text-right shrink-0 ${d.alcohol > 0 ? (d.isCurrent ? 'text-primary' : 'text-text-primary') : 'text-text-muted/40'}`}>
                                            {d.alcohol > 0 ? d.alcohol.toFixed(1) : '—'}
                                        </span>
                                        <span className={`text-[11px] tabular-nums w-8 text-right shrink-0 ${d.alcohol > 0 ? 'text-text-muted' : 'text-text-muted/0'}`}>
                                            {d.alcohol > 0 ? beer.toFixed(1) : ''}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>



                    </div>

                    {/* Daily Average */}
                    <div className="glass-card p-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-text-muted">期間中の1日平均</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-extrabold text-primary tabular-nums">
                                    {(stats.totalAlcohol / avgDays).toFixed(1)}
                                </span>
                                <span className="text-[10px] text-text-muted font-medium">g/日</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
