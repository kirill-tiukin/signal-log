/**
 * Deterministic row generation.
 *
 * The log is a pure function of time. Row `n` (zero-based) is emitted at
 * `EPOCH + n * INTERVAL_MS`. Its word and sequence are derived only from `n`,
 * so every visitor — and every scraper — sees exactly the same table and the
 * same "last updated" timestamp.
 */

/** Fixed start of the log. Change this to move the whole timeline. */
export const EPOCH_MS = Date.UTC(2026, 7, 1, 0, 0, 0); // 2026-08-01 00:00 UTC

/** One row every 3 minutes. */
export const INTERVAL_MS = 3 * 60 * 1000;

/** Newest N rows kept in the DOM. History before that still counts toward totals. */
export const MAX_VISIBLE_ROWS = 250;

const SEQUENCE_GROUPS = 3;
const SEQUENCE_GROUP_LEN = 4;
const SEQUENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1

const WORDS = [
  'harbor', 'lantern', 'cinder', 'meadow', 'quartz', 'thicket', 'ripple', 'gantry',
  'ember', 'willow', 'basalt', 'drift', 'pewter', 'hollow', 'marrow', 'slate',
  'tundra', 'vellum', 'cobalt', 'furrow', 'nimbus', 'placid', 'reef', 'saffron',
  'talon', 'umber', 'verge', 'wisp', 'yarrow', 'zephyr', 'anvil', 'brine',
  'cairn', 'dune', 'fathom', 'glint', 'husk', 'kelp', 'loam', 'mica',
  'oaken', 'plume', 'render', 'shale', 'trove', 'vane', 'wharf', 'axle',
  'beacon', 'crag', 'delta', 'flint', 'grove', 'ledger', 'moss', 'orbit',
];

/** mulberry32 — small, fast, deterministic PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface LogRow {
  readonly index: number;
  readonly timestamp: number;
  readonly word: string;
  readonly sequence: string;
}

function sequenceFor(rand: () => number): string {
  const groups: string[] = [];
  for (let g = 0; g < SEQUENCE_GROUPS; g++) {
    let group = '';
    for (let c = 0; c < SEQUENCE_GROUP_LEN; c++) {
      group += SEQUENCE_ALPHABET[Math.floor(rand() * SEQUENCE_ALPHABET.length)];
    }
    groups.push(group);
  }
  return groups.join('-');
}

export function rowAt(index: number): LogRow {
  const rand = mulberry32(index * 2654435761 + 1013904223);
  const word = WORDS[Math.floor(rand() * WORDS.length)];
  return {
    index,
    timestamp: EPOCH_MS + index * INTERVAL_MS,
    word,
    sequence: sequenceFor(rand),
  };
}

/** Total rows emitted at time `now` (ms). At least 1 once past the epoch. */
export function rowCountAt(now: number): number {
  if (now < EPOCH_MS) return 0;
  return Math.floor((now - EPOCH_MS) / INTERVAL_MS) + 1;
}

/** Newest-first slice of the log, capped at MAX_VISIBLE_ROWS. */
export function visibleRowsAt(now: number): LogRow[] {
  const count = rowCountAt(now);
  if (count === 0) return [];
  const start = Math.max(0, count - MAX_VISIBLE_ROWS);
  const rows: LogRow[] = [];
  for (let i = count - 1; i >= start; i--) rows.push(rowAt(i));
  return rows;
}

/** Timestamp (ms) of the most recently emitted row, or null before the epoch. */
export function lastUpdatedAt(now: number): number | null {
  const count = rowCountAt(now);
  return count === 0 ? null : EPOCH_MS + (count - 1) * INTERVAL_MS;
}

/** Milliseconds until the next row is emitted. */
export function msUntilNextRow(now: number): number {
  if (now < EPOCH_MS) return EPOCH_MS - now;
  const sinceLast = (now - EPOCH_MS) % INTERVAL_MS;
  return INTERVAL_MS - sinceLast;
}
