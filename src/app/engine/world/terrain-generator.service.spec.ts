import { TestBed } from '@angular/core/testing';

import { TerrainGeneratorService } from './terrain-generator.service';

describe('TerrainGeneratorService', () => {
  let service: TerrainGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TerrainGeneratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
