import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import BulkEditTable from '../components/BulkEditTable';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { calcPureAlcohol, calcCannedBeerEquiv } from '../types';
import type { DrinkingRecord } from '../types';
import { getThresholds } from '../data/thresholds';

const EMPTY_ARRAY: DrinkingRecord[] = [];

export default function CalendarView() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const thresholds = useMemo(() => getThresholds(), []);

    const days = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
        const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
        return eachDayOfInterval({ start: calStart, end: calEnd });
    }, [currentMonth]);

    const records = useLiveQuery(
        () => db.records.filter(r => !r.deleted).toArray(),
    );
    const allRecords = records ?? EMPTY_ARRAY;

    const dailyTotals = useMemo(() => {
        const map: Record<string, { beers: number; count: number }> = {};
        allRecords.forEach((r: DrinkingRecord) => {
            const alcohol = calcPureAlcohol(r.amountMl, r.percentage);
            const beers = calcCannedBeerEquiv(alcohol);
            const key = r.date;
            if (!map[key]) map[key] = { beers: 0, count: 0 };
            map[key].beers += beers;
            map[key].count += 1;
        });
        return map;
    }, [allRecords]);

    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

    // Convert thresholds (g) to beer cans (1 unit = 14g)
    const safeBeers = calcCannedBeerEquiv(thresholds.daily.low);
    const dangerBeers = calcCannedBeerEquiv(thresholds.daily.high);

    const getBadgeStyle = (beers: number) => {
        if (beers <= safeBeers) return 'bg-accent-teal/80 text-white';
        if (beers < dangerBeers) return 'bg-primary/80 text-bg-dark';
        return 'bg-danger/80 text-white';
    };

    return (
        <div className="max-w-lg mx-auto">
            {/* Month Navigation */}
            <div className="flex items-center justify-between px-5 pt-6 mb-4">
                <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="w-10 h-10 rounded-xl bg-bg-surface border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-border-light transition-all btn-press"
                >
                    <ChevronLeft size={20} />
                </button>
                <span className="font-bold text-text-primary text-xl tracking-tight">
                    {format(currentMonth, 'yyyy年 M月', { locale: ja })}
                </span>
                <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="w-10 h-10 rounded-xl bg-bg-surface border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-border-light transition-all btn-press"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Calendar card */}
            <div className="px-5">
                <div className="glass-card overflow-hidden animate-fade-in">
                    {/* Week Day Headers */}
                    <div className="grid grid-cols-7 border-b border-border">
                        {weekDays.map((d, i) => (
                            <div
                                key={d}
                                className={`text-center text-[11px] py-2.5 font-bold uppercase tracking-wider ${i === 0 ? 'text-danger/70' : i === 6 ? 'text-accent-blue/70' : 'text-text-muted'
                                    }`}
                            >
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7">
                        {days.map((day, idx) => {
                            const dateKey = format(day, 'yyyy-MM-dd');
                            const data = dailyTotals[dateKey];
                            const inMonth = isSameMonth(day, currentMonth);
                            const today = isToday(day);

                            return (
                                <div
                                    key={dateKey}
                                    className={`aspect-square flex flex-col items-center justify-start pt-1.5 relative transition-colors ${inMonth ? '' : 'opacity-25'
                                        } ${idx % 7 !== 6 ? 'border-r border-border' : ''} ${idx < days.length - 7 ? 'border-b border-border' : ''
                                        }`}
                                >
                                    <span
                                        className={`text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium transition-all ${today
                                            ? 'bg-gradient-to-br from-primary to-primary-dark text-bg-dark font-bold shadow-md shadow-primary/30'
                                            : inMonth
                                                ? 'text-text-primary'
                                                : 'text-text-muted'
                                            }`}
                                    >
                                        {format(day, 'd')}
                                    </span>
                                    {data && inMonth && (
                                        <span
                                            className={`mt-auto mb-1.5 text-[9px] rounded-full px-1.5 py-0.5 font-bold tabular-nums ${getBadgeStyle(data.beers)}`}
                                        >
                                            🍺{data.beers.toFixed(1)}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Legend */}
                {/* Legend */}
                <div className="flex flex-col items-center gap-1 mt-4">
                    <span className="text-[10px] text-text-muted/70">※ 350ml 缶ビール換算 (本)</span>
                    <div className="flex items-center justify-center gap-2 text-[11px] text-text-muted font-medium bg-bg-surface/50 py-2 rounded-xl border border-border/50 mx-auto w-fit px-4">
                        <span className="w-6 h-2 rounded-full bg-accent-teal/80" />
                        <span>≦ {safeBeers.toFixed(1)}</span>
                        <span className="text-text-muted/50">&lt;</span>
                        <span className="w-6 h-2 rounded-full bg-primary/80" />
                        <span className="text-text-muted/50">&lt;</span>
                        <span>{dangerBeers.toFixed(1)} ≦</span>
                        <span className="w-6 h-2 rounded-full bg-danger/80" />
                    </div>
                </div>
            </div>

            {/* Bulk Edit Table */}
            <BulkEditTable currentMonth={currentMonth} />
        </div>
    );
}
