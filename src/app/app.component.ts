import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FeedService } from './feed.service';
import { INTERVAL_MS, MAX_VISIBLE_ROWS } from './generator';

const FLASH_MS = 1400;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  protected readonly feed = inject(FeedService);
  protected readonly maxVisible = MAX_VISIBLE_ROWS;
  protected readonly intervalMinutes = INTERVAL_MS / 60_000;

  /** Index of the row that just arrived; drives the one-shot arrival wash. */
  protected readonly flashIndex = signal(-1);
  private lastSeenNewest = -1;
  private flashTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      const newest = this.feed.newestIndex();
      if (newest === -1 || newest === this.lastSeenNewest) return;
      const isFirstPaint = this.lastSeenNewest === -1;
      this.lastSeenNewest = newest;
      if (isFirstPaint) return;
      this.flashIndex.set(newest);
      clearTimeout(this.flashTimer);
      this.flashTimer = setTimeout(() => this.flashIndex.set(-1), FLASH_MS);
    });
  }

  ngOnInit(): void {
    this.feed.start();
  }

  protected isoUtc(ms: number): string {
    return new Date(ms).toISOString();
  }

  protected countdown(): string {
    const total = Math.max(0, Math.ceil(this.feed.msToNext() / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
