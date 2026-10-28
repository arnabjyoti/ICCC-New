import { TestBed } from '@angular/core/testing';

import { VehicleRoutesService } from './vehicle-routes.service';

describe('VehicleRoutesService', () => {
  let service: VehicleRoutesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VehicleRoutesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
