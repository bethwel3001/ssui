import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebSocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-aws-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-card animate-fade" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <h2 class="modal-title">WebSocket Settings</h2>
          <button type="button" class="close-btn" (click)="close.emit()">✕</button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <p class="desc">
            Connect to a real-time WebSocket endpoint to sync live rooms and questions.
          </p>

          <div class="field-group">
            <label for="ws-url" class="label">WebSocket Endpoint URL</label>
            <input 
              id="ws-url"
              type="text" 
              [(ngModel)]="endpointUrl" 
              placeholder="wss://api-id.execute-api.region.amazonaws.com/prod" 
              class="input" />
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-cancel" (click)="close.emit()">Cancel</button>
            <button type="button" class="btn-save" (click)="save()">Save</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .modal-card {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xl);
      max-width: 460px;
      width: 100%;
      box-shadow: var(--shadow-dropdown);
      overflow: hidden;
    }

    .modal-header {
      padding: 18px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-subtle);
    }

    .modal-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
    }

    .close-btn {
      color: var(--text-muted);
      font-size: 14px;
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);

      &:hover {
        background-color: var(--bg-subtle);
        color: var(--text-main);
      }
    }

    .modal-body {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .desc {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.45;
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
    }

    .input {
      width: 100%;
      background-color: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 9px 12px;
      font-size: 13px;
      color: var(--text-main);
      transition: border-color 0.15s ease;

      &:focus {
        border-color: var(--border-focus);
      }
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 4px;
    }

    .btn-cancel {
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);

      &:hover {
        color: var(--text-main);
      }
    }

    .btn-save {
      padding: 8px 18px;
      border-radius: var(--radius-full);
      font-size: 13px;
      font-weight: 600;
      background-color: var(--accent-black);
      color: var(--text-white);
      transition: background-color 0.15s ease;

      &:hover {
        background-color: var(--accent-black-hover);
      }
    }
  `]
})
export class AwsSettingsModalComponent {
  wsService = inject(WebSocketService);

  @Output() close = new EventEmitter<void>();

  endpointUrl: string = this.wsService.wsUrl();

  save() {
    this.wsService.saveEndpoint(this.endpointUrl);
    this.close.emit();
  }
}
