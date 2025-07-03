import { TestBed } from '@angular/core/testing';
import { PerformanceService } from './performance.service';

describe('PerformanceService', () => {
  let service: PerformanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PerformanceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should emit fps values', (done) => {
    service['fpsSubject'].next(60);
    service.fps$.subscribe(v => {
      expect(v).toBe(60);
      done();
    });
  });
});
