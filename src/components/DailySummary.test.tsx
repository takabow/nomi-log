import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DailySummary from './DailySummary';

// Mock types
vi.mock('../types', () => ({
    calcPureAlcohol: () => 10,
    calcCannedBeerEquiv: () => 1,
    calcCalories: () => 100,
}));

import type { DrinkingRecord } from '../types';

describe('DailySummary', () => {
    it('renders with label prop correctly', () => {
        const records = [
            { id: '1', date: '2024-02-19', type: 'Beer', name: 'Asahi', amountMl: 350, percentage: 5 }
        ] as DrinkingRecord[];

        const dateStr = '2024-02-19';
        const label = '2/19 (深夜)';

        render(
            <DailySummary
                records={records}
                dateStr={dateStr}
                label={label}
            />
        );

        expect(screen.getByText('2/19 (深夜)')).toBeInTheDocument();
        expect(screen.getByText('10.0')).toBeInTheDocument(); // Alcohol
    });

    it('renders null when count is 0', () => {
        const { container } = render(
            <DailySummary
                records={[]}
                dateStr={'2024-02-19'}
            />
        );
        expect(container).toBeEmptyDOMElement();
    });
});
