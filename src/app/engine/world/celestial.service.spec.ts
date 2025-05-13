import { TestBed } from '@angular/core/testing';

import { CelestialService } from './celestial.service';

describe('CelestialService', () => {
  let service: CelestialService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CelestialService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
