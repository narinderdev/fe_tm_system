import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { DeleteModalComponent } from './delete-modal';

describe('DeleteModalComponent', () => {
  let component: DeleteModalComponent;
  let fixture: ComponentFixture<DeleteModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit cancel event', () => {
    const cancelSpy = vi.fn();
    component.cancel.subscribe(cancelSpy);

    component.onCancel();

    expect(cancelSpy).toHaveBeenCalled();
  });

  it('should emit confirm event', () => {
    const confirmSpy = vi.fn();
    component.confirm.subscribe(confirmSpy);

    component.onConfirm();

    expect(confirmSpy).toHaveBeenCalled();
  });
});
