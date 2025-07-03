import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Engine } from '@babylonjs/core/Engines/engine';

@Injectable({ providedIn: 'root' })
export class PerformanceService {
  private fpsSubject = new BehaviorSubject<number>(0);
  private cpuFrameTimeSubject = new BehaviorSubject<number>(0);
  private engine: Engine | null = null;
  private frameStart = 0;

  get fps$(): Observable<number> {
    return this.fpsSubject.asObservable();
  }

  get cpuFrameTime$(): Observable<number> {
    return this.cpuFrameTimeSubject.asObservable();
  }

  initialize(engine: Engine): void {
    this.engine = engine;
  }

  beginFrame(): void {
    this.frameStart = performance.now();
  }

  endFrame(): void {
    const end = performance.now();
    this.cpuFrameTimeSubject.next(end - this.frameStart);
    if (this.engine) {
      this.fpsSubject.next(Math.round(this.engine.getFps()));
    }
  }
}
