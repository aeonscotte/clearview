import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClearviewComponent } from './clearview.component';

describe('ClearviewComponent', () => {
  let component: ClearviewComponent;
  let fixture: ComponentFixture<ClearviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClearviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClearviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
