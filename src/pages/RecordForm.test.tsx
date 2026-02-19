import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecordForm from './RecordForm';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import 'dexie-react-hooks';

// Mock types
vi.mock('../types', () => ({
    calcPureAlcohol: () => 10,
}));

// Mock db
vi.mock('../data/db', () => ({
    db: {
        records: {
            get: vi.fn(),
            add: vi.fn(),
            update: vi.fn(),
        }
    }
}));

// Mock sync
vi.mock('../data/sync', () => ({
    trySync: vi.fn(),
}));

// Mock presets/volume
vi.mock('../data/volumePresets', () => ({
    getVolumePresets: () => [{ label: 'Can', ml: 350 }],
}));

vi.mock('../data/drinkTypes', () => ({
    getDrinkTypes: () => [{ id: '1', name: 'Beer', percent: 5, emoji: '🍺' }],
    getDefaultTypeId: () => '1',
}));

// Mock dexie-react-hooks
const useLiveQueryMock = vi.fn();
vi.mock('dexie-react-hooks', () => ({
    useLiveQuery: (fn: unknown) => useLiveQueryMock(fn),
}));

describe('RecordForm', () => {
    it('renders Add mode without crashing', async () => {
        // Mock useLiveQuery to return undefined (new record)
        useLiveQueryMock.mockReturnValue(undefined);

        render(
            <MemoryRouter initialEntries={['/add']}>
                <Routes>
                    <Route path="/add" element={<RecordForm />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('記録を追加')).toBeInTheDocument();
        expect(screen.getByText('保存する')).toBeInTheDocument();
    });

    it('renders Edit mode without crashing', async () => {
        // Mock useLiveQuery to return existing record
        const record = { id: '123', date: '2024-02-19', type: 'Beer', name: 'Asahi', amountMl: 500, percentage: 5 };
        useLiveQueryMock.mockReturnValue(record);

        render(
            <MemoryRouter initialEntries={['/edit/123']}>
                <Routes>
                    <Route path="/edit/:id" element={<RecordForm />} />
                </Routes>
            </MemoryRouter>
        );

        // Expect fields to be populated
        // This implicitly tests if useEffect runs and sets state without crashing
        expect(screen.getByText('記録を編集')).toBeInTheDocument();
        // Check if values are set (might need to check input values)
        // Check "500ml" is displayed (based on logic)
    });
});
