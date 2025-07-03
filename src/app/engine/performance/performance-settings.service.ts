import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface PerformanceSettings {
  quality: 'low' | 'medium' | 'high';
  showFps: boolean;
}

@Injectable({ providedIn: 'root' })
export class PerformanceSettingsService {
  private settings: PerformanceSettings = { quality: 'high', showFps: true };
  private subject = new BehaviorSubject<PerformanceSettings>(this.settings);

  constructor() {
    const saved = localStorage.getItem('performanceSettings');
    if (saved) {
      this.settings = { ...this.settings, ...JSON.parse(saved) };
      this.subject.next(this.settings);
    }
  }

  get settings$(): Observable<PerformanceSettings> {
    return this.subject.asObservable();
  }

  getSettings(): PerformanceSettings {
    return this.settings;
  }

  update(partial: Partial<PerformanceSettings>): void {
    this.settings = { ...this.settings, ...partial };
    localStorage.setItem('performanceSettings', JSON.stringify(this.settings));
    this.subject.next(this.settings);
  }
}
