import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecordList from './RecordList';
import { BrowserRouter } from 'react-router-dom';
import 'dexie-react-hooks';

// Mock types
vi.mock('../types', () => ({
    calcPureAlcohol: () => 10,
    calcCannedBeerEquiv: () => 1,
    calcCalories: () => 100,
}));

// Mock db
vi.mock('../data/db', () => ({
    db: {
        records: {
            filter: () => ({
                reverse: () => ({
                    sortBy: () => Promise.resolve([
                        { id: '1', date: '2024-02-19', type: 'Beer', name: 'Asahi', amountMl: 350, percentage: 5 }
                    ])
                })
            })
        }
    }
}));

// Mock sync
vi.mock('../data/sync', () => ({
    trySync: vi.fn(),
    isConfigured: () => false,
}));

// Mock drinkTypes
vi.mock('../data/drinkTypes', () => ({
    getDrinkTypes: () => [{ name: 'Beer', emoji: '🍺', coef: 1 }],
}));

// Mock dexie-react-hooks
// We need to verify if useLiveQuery works with our mock
vi.mock('dexie-react-hooks', () => ({
    useLiveQuery: () => {
        // Return dummy data immediately
        return [
            { id: '1', date: '2024-02-19', type: 'Beer', name: 'Asahi', amountMl: 350, percentage: 5 }
        ];
    },
}));

describe('RecordList', () => {
    it('renders without crashing', async () => {
        render(
            <BrowserRouter>
                <RecordList />
            </BrowserRouter>
        );

        // Check if "Nomilog" header is present
        expect(screen.getByText('Nomilog')).toBeInTheDocument();
        // Check if list item is present
        expect(screen.getByText('Asahi')).toBeInTheDocument();
        // Check if DailySummary is displaying date - wait this depends on useDateWithOffset
        // Since we are mocking Date to default, or relying on real date.
        // It shouldn't crash.
    });
});
