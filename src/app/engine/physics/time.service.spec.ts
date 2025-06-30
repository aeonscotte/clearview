import { TestBed } from '@angular/core/testing';

import { TimeService } from './time.service';

describe('TimeService', () => {
  let service: TimeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TimeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('update should advance time', () => {
    const initial = service.getElapsed();
    service.update(1000);
    expect(service.getElapsed()).toBeGreaterThan(initial);
  });

  it('pause and resume should stop and restart time', () => {
    service.pause();
    const paused = service.getElapsed();
    service.update(1000);
    expect(service.getElapsed()).toBe(paused);
    service.resume();
    service.update(1000);
    expect(service.getElapsed()).toBeGreaterThan(paused);
  });
});
