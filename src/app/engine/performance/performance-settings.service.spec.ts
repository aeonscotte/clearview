import { TestBed } from '@angular/core/testing';
import { PerformanceSettingsService } from './performance-settings.service';

describe('PerformanceSettingsService', () => {
  let service: PerformanceSettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PerformanceSettingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should update settings', () => {
    service.update({ quality: 'low' });
    expect(service.getSettings().quality).toBe('low');
  });
});
