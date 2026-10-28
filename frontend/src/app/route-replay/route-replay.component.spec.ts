import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RouteReplayComponent } from './route-replay.component';

describe('RouteReplayComponent', () => {
  let component: RouteReplayComponent;
  let fixture: ComponentFixture<RouteReplayComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RouteReplayComponent]
    });
    fixture = TestBed.createComponent(RouteReplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
