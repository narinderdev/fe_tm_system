import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-delete-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delete-modal.html',
  styleUrls: ['./delete-modal.css']
})
export class DeleteModalComponent {
  @Input() isOpen = false;
  @Input() title = 'Delete Item';
  @Input() message = 'Are you sure you want to delete this item?';
  @Input() deleting = false;
  @Input() confirmLabel = 'Delete';

  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  onCancel(): void {
    this.cancel.emit();
  }

  onConfirm(): void {
    this.confirm.emit();
  }
}
