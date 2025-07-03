// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideZoneChangeDetection } from '@angular/core';

import { routes } from './app.routes';
import { Scene001 } from './engine/scenes/scene001.scene';
import { MathUtils } from './engine/utils/math-utils.service';
import { PerformanceSettingsService } from './engine/performance/performance-settings.service';
import { PerformanceService } from './engine/performance/performance.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    Scene001,
    MathUtils,
    PerformanceSettingsService,
    PerformanceService
  ]
};