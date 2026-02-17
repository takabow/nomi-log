import Dexie, { type EntityTable } from 'dexie';
import type { DrinkingRecord } from '../types';

const db = new Dexie('nomi-log') as Dexie & {
    records: EntityTable<DrinkingRecord, 'id'>;
};

db.version(1).stores({
    // Indexed fields: id (primary), date, deleted, synced
    records: 'id, date, deleted, synced, updatedAt',
});

export { db };
