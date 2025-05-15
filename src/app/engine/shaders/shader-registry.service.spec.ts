import { TestBed } from '@angular/core/testing';

import { ShaderRegistryService } from './shader-registry.service';

describe('ShaderRegistryService', () => {
  let service: ShaderRegistryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShaderRegistryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
