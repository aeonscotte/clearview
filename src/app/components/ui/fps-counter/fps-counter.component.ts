import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PerformanceService } from '../../../engine/performance/performance.service';

@Component({
  selector: 'app-fps-counter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fps-counter.component.html',
  styleUrls: ['./fps-counter.component.less']
})
export class FpsCounterComponent implements OnInit, OnDestroy {
  fps = 0;
  private sub?: Subscription;

  constructor(private perf: PerformanceService) {}

  ngOnInit(): void {
    this.sub = this.perf.fps$.subscribe(v => this.fps = v);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
