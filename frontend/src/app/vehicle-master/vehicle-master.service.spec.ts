import { TestBed } from '@angular/core/testing';

import { VehicleMasterService } from './vehicle-master.service';

describe('VehicleMasterService', () => {
  let service: VehicleMasterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VehicleMasterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
