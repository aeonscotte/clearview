import { TestBed } from '@angular/core/testing';

import { MathUtils } from './math-utils.service';

describe('MathUtilsService', () => {
  let service: MathUtils;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MathUtils);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
