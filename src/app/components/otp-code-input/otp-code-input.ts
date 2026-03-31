import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  QueryList,
  SimpleChanges,
  ViewChildren
} from '@angular/core';

@Component({
  selector: 'app-otp-code-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './otp-code-input.html',
  styleUrls: ['./otp-code-input.css']
})
export class OtpCodeInputComponent implements OnChanges, AfterViewInit {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  @Input() length = 6;
  @Input() value = '';
  @Input() disabled = false;
  @Input() autoFocus = true;
  @Input() size: 'default' | 'compact' = 'default';
  @Input() groupAriaLabel = 'One-time password';
  @Input() inputAriaLabelPrefix = 'OTP digit';

  @Output() valueChange = new EventEmitter<string>();
  @Output() completed = new EventEmitter<string>();

  digits: string[] = [];
  private ignoreNextInput = false;

  trackByIndex(index: number): number {
    return index;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['length']) {
      const normalizedLength = Number.isFinite(this.length) ? Math.max(1, Math.floor(this.length)) : 6;
      this.length = normalizedLength;
      this.syncDigitsFromValue(this.value);
      return;
    }

    if (changes['value']) {
      // Skip re-sync when the incoming value matches current digits to prevent
      // the circular-update loop (child emits → parent sets [value] → ngOnChanges
      // → syncDigitsFromValue → new array ref → *ngFor re-renders → focus jumps).
      const incomingNormalized = String(this.value ?? '').replace(/\D/g, '').slice(0, this.length);
      if (incomingNormalized !== this.digits.join('')) {
        this.syncDigitsFromValue(this.value);
      }
    }
  }

  ngAfterViewInit(): void {
    if (!this.autoFocus || this.disabled) {
      return;
    }
    setTimeout(() => this.focusInput(0));
  }

  onInput(index: number, event: Event): void {
    if (this.disabled) {
      return;
    }

    const input = event.target as HTMLInputElement;
    if (this.ignoreNextInput) {
      this.ignoreNextInput = false;
      input.value = this.digits[index] ?? '';
      return;
    }

    const rawDigits = (input.value || '').replace(/\D/g, '');

    if (!rawDigits) {
      this.digits[index] = '';
      input.value = '';
      this.emitChanges();
      return;
    }

    if (rawDigits.length === 1) {
      this.digits[index] = rawDigits;
      input.value = rawDigits;
      if (index < this.length - 1) {
        this.focusInput(index + 1);
      }
      this.emitChanges();
      return;
    }

    for (let i = index; i < this.length; i++) {
      this.digits[i] = rawDigits[i - index] ?? '';
    }
    input.value = this.digits[index] ?? '';
    this.focusInput(Math.min(index + rawDigits.length, this.length - 1));
    this.emitChanges();
  }

  onKeyDown(index: number, event: KeyboardEvent): void {
    const key = event.key;

    if (/^\d$/.test(key)) {
      event.preventDefault();
      this.ignoreNextInput = true;
      this.digits[index] = key;
      if (index < this.length - 1) {
        this.focusInput(index + 1);
      }
      this.emitChanges();
      return;
    }

    if (key === 'Backspace') {
      event.preventDefault();
      if (this.digits[index]) {
        // Current box has a digit — clear it and stay
        this.digits[index] = '';
        (event.target as HTMLInputElement).value = '';
        this.emitChanges();
      } else if (index > 0) {
        // Current box is empty — move to previous box and clear it
        this.digits[index - 1] = '';
        this.focusInput(index - 1);
        this.emitChanges();
      }
      return;
    }

    if (key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusInput(index - 1);
      return;
    }

    if (key === 'ArrowRight' && index < this.length - 1) {
      event.preventDefault();
      this.focusInput(index + 1);
      return;
    }

    if (key === 'Home') {
      event.preventDefault();
      this.focusInput(0);
      return;
    }

    if (key === 'End') {
      event.preventDefault();
      this.focusInput(this.length - 1);
      return;
    }

    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && !/^\d$/.test(key)) {
      event.preventDefault();
    }
  }

  onPaste(event: ClipboardEvent): void {
    if (this.disabled) {
      return;
    }

    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const incomingDigits = text.replace(/\D/g, '').slice(0, this.length).split('');

    for (let i = 0; i < this.length; i++) {
      this.digits[i] = incomingDigits[i] ?? '';
    }

    const targetIndex = Math.min(incomingDigits.length, this.length - 1);
    this.focusInput(targetIndex);
    this.emitChanges();
  }

  onFocus(event: FocusEvent): void {
    const input = event.target as HTMLInputElement | null;
    input?.select();
  }

  private syncDigitsFromValue(rawValue: string): void {
    const normalized = String(rawValue ?? '').replace(/\D/g, '').slice(0, this.length);
    this.digits = Array.from({ length: this.length }, (_, index) => normalized[index] ?? '');
  }

  private emitChanges(): void {
    const otpValue = this.digits.join('');
    this.value = otpValue;
    this.valueChange.emit(otpValue);
    if (this.digits.every((digit) => /^\d$/.test(digit))) {
      this.completed.emit(otpValue);
    }
  }

  private focusInput(index: number): void {
    const items = this.otpInputs?.toArray() ?? [];
    const target = items[index]?.nativeElement;
    if (!target) {
      return;
    }
    target.focus();
    target.select();
  }
}
