import { TestBed } from '@angular/core/testing';

import { SkyService } from './sky.service';

describe('SkyService', () => {
  let service: SkyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SkyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
