import { TestBed } from '@angular/core/testing';

import { MathUtilsService } from './math-utils.service';

describe('MathUtilsService', () => {
  let service: MathUtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MathUtilsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
