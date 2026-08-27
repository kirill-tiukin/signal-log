# Signal Log

An Angular single-page app that behaves like a live emitter: every **3 minutes**
it appends one row — a **word** and a **random character sequence** — to a table,
newest first.

The log is **deterministic**. Row `n` is emitted at `EPOCH + n × 3min`, and its
word and sequence are seeded from `n` alone. So every visitor (and every scraper)
sees the same table and the same "last updated" timestamp. Reloading changes
nothing.

## Run

Requires Node 20+.

```bash
npm install
npm start          # ng serve → http://localhost:4200
```

Build a static bundle for hosting anywhere:

```bash
npm run build      # output in dist/signal-log/browser
```

## Configuration

All knobs live in `src/app/generator.ts`:

| Constant            | Meaning                                            |
| ------------------- | ------------------------------------------------- |
| `EPOCH_MS`          | Fixed start of the timeline                        |
| `INTERVAL_MS`       | Time between rows (default 3 min)                  |
| `MAX_VISIBLE_ROWS`  | Newest N rows rendered (history still counts)      |
| `WORDS`             | Word pool                                          |
| `SEQUENCE_*`        | Sequence length / grouping / alphabet             |

## For the scraper (the second tool)

The page exposes the update time in three machine-readable spots:

- `<meta name="last-updated" content="…ISO8601…">` in `<head>`, kept in sync as
  rows arrive.
- `<time id="last-updated" datetime="…ISO8601…">` in the status strip.
- Every row has `<time datetime="…ISO8601Z…">`; the first `<tbody> tr` is the
  newest emission.

Because emission is deterministic, a scraper can also compute the expected last
update itself: `EPOCH_MS + (floor((now - EPOCH_MS) / INTERVAL_MS)) × INTERVAL_MS`.

## Project layout

```
src/app/
  generator.ts       pure deterministic row logic (no Angular)
  feed.service.ts    RxJS 1s timer → signals for rows, totals, countdown
  app.component.*    the readout UI
```
