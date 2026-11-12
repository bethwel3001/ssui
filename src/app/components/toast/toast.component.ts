import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast-card" [class]="'toast-' + toast.type">
          <div class="toast-indicator"></div>
          <span class="toast-message">{{ toast.message }}</span>
          <button type="button" class="toast-close" (click)="toastService.dismiss(toast.id)">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 2000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      max-width: 380px;
      width: calc(100% - 48px);
    }

    .toast-card {
      pointer-events: auto;
      background: #FFFFFF;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 12px 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 12px;
      animation: toastSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes toastSlide {
      from {
        opacity: 0;
        transform: translateY(-8px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .toast-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      background-color: var(--text-faint);
    }

    .toast-success .toast-indicator {
      background-color: #10B981;
    }

    .toast-error .toast-indicator {
      background-color: #EF4444;
    }

    .toast-message {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-main);
      flex: 1;
      line-height: 1.4;
    }

    .toast-close {
      color: var(--text-muted);
      font-size: 12px;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;

      &:hover {
        background-color: var(--bg-subtle);
        color: var(--text-main);
      }
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);
}
