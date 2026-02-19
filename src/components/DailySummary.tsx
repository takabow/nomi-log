import { useMemo } from 'react';
import { calcPureAlcohol, calcCannedBeerEquiv, calcCalories } from '../types';
import type { DrinkingRecord } from '../types';

interface Props {
    records: DrinkingRecord[];
    dateStr: string; // YYYY-MM-DD
    coefMap?: Record<string, number>;
    label?: string; // Optional custom label (e.g. "2/19 (深夜)")
}

export default function DailySummary({ records, dateStr, coefMap, label }: Props) {
    const summary = useMemo(() => {
        // Filter records for the specific date
        const targetRecords = records.filter(r => r.date === dateStr);

        const totalCalories = targetRecords.reduce((sum, r) => {
            const pureAlcohol = calcPureAlcohol(r.amountMl, r.percentage);
            const coef = coefMap?.[r.type] ?? 1;
            return sum + calcCalories(pureAlcohol, coef);
        }, 0);

        const totalAlcohol = targetRecords.reduce((sum, r) => {
            return sum + calcPureAlcohol(r.amountMl, r.percentage);
        }, 0);

        return {
            alcohol: totalAlcohol,
            beers: calcCannedBeerEquiv(totalAlcohol),
            calories: totalCalories,
            count: targetRecords.length
        };
    }, [records, dateStr, coefMap]);

    if (summary.count === 0) return null;

    return (

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-3 px-3 py-2 sm:py-1 bg-bg-surface/50 rounded-lg border border-border/50 animate-fade-in">
            {/* Label */}
            <span className="text-[10px] font-bold text-text-muted shrink-0">{label || '今日の記録'}</span>

            {/* Values */}
            <div className="flex items-center gap-3">
                {/* Pure Alcohol */}
                <div className="flex items-baseline gap-1">
                    <span className="text-[10px] text-text-muted">💧</span>
                    <span className="text-xs font-bold text-primary tabular-nums">
                        {summary.alcohol.toFixed(1)}
                    </span>
                    <span className="text-[9px] text-text-secondary">g</span>
                </div>

                {/* Beer Equivalent */}
                <div className="flex items-baseline gap-1">
                    <span className="text-[10px] text-text-muted">🍺</span>
                    <span className="text-xs font-bold text-accent-teal tabular-nums">
                        {summary.beers.toFixed(1)}
                    </span>
                    <span className="text-[9px] text-text-secondary">本</span>
                </div>

                {/* Calories */}
                <div className="flex items-baseline gap-1">
                    <span className="text-[10px] text-text-muted">🔥</span>
                    <span className="text-xs font-bold text-accent-blue tabular-nums">
                        {summary.calories.toFixed(0)}
                    </span>
                    <span className="text-[9px] text-text-secondary">kcal</span>
                </div>
            </div>
        </div>
    );
}
