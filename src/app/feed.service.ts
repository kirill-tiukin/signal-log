import { DOCUMENT } from '@angular/common';
import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import {
  INTERVAL_MS,
  LogRow,
  lastUpdatedAt,
  msUntilNextRow,
  rowCountAt,
  visibleRowsAt,
} from './generator';

const TICK_MS = 1000;

/**
 * Owns the live view of the deterministic log: current time, the visible rows,
 * the total emitted count, and the countdown to the next emission. Everything
 * derives from `now()`, so the component just reads signals.
 */
@Injectable({ providedIn: 'root' })
export class FeedService implements OnDestroy {
  private readonly doc = inject(DOCUMENT);
  private readonly now = signal(Date.now());
  private sub?: Subscription;

  /** Index of the row currently at the top — used to trigger the arrival wash. */
  readonly newestIndex = computed(() => this.rows()[0]?.index ?? -1);

  readonly rows = computed<LogRow[]>(() => visibleRowsAt(this.now()));
  readonly totalCount = computed(() => rowCountAt(this.now()));

  readonly lastUpdated = computed(() => {
    const ms = lastUpdatedAt(this.now());
    return ms === null ? null : new Date(ms);
  });

  readonly msToNext = computed(() => msUntilNextRow(this.now()));

  /** 0 → 1 progress through the current 3-minute window. */
  readonly windowProgress = computed(() => 1 - this.msToNext() / INTERVAL_MS);

  readonly clock = computed(() => new Date(this.now()));

  start(): void {
    if (this.sub) return;
    this.now.set(Date.now());
    this.syncLastUpdatedMeta();
    this.sub = interval(TICK_MS).subscribe(() => {
      const previousCount = this.totalCount();
      this.now.set(Date.now());
      if (this.totalCount() !== previousCount) this.syncLastUpdatedMeta();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /** Keep <meta name="last-updated"> current for scrapers that read the DOM. */
  private syncLastUpdatedMeta(): void {
    const meta = this.doc.querySelector('meta[name="last-updated"]');
    const value = this.lastUpdated();
    if (meta && value) meta.setAttribute('content', value.toISOString());
  }
}
