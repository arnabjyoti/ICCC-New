import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TovnavComponent } from './tovnav.component';

describe('TovnavComponent', () => {
  let component: TovnavComponent;
  let fixture: ComponentFixture<TovnavComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TovnavComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TovnavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});