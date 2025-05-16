import { TestBed } from '@angular/core/testing';

import { AssetManagerService } from './asset-manager.service';

describe('AssetManagerService', () => {
  let service: AssetManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AssetManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
