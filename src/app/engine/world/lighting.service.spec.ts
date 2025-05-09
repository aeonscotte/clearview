import { TestBed } from '@angular/core/testing';

import { LightingService } from './light.service';

describe('LightingService', () => {
    let service: LightingService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(LightingService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
