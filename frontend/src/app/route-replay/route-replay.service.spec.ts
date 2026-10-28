import { TestBed } from '@angular/core/testing';

import { RouteReplayService } from './route-replay.service';

describe('RouteReplayService', () => {
  let service: RouteReplayService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RouteReplayService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
