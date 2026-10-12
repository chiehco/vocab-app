import type { Table } from 'dexie';
import type { CardState, ReviewLogEntry } from '../db/types';

/** Optional session coordination; ordinary callers keep their existing scheduling behavior. */
export interface LearningCommitGuard {
  tables: Table[];
  before: (card?:CardState) => Promise<boolean>;
  after: (log:ReviewLogEntry & {id:number}) => Promise<void>;
}
