import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoomStoreService } from '../../services/room-store.service';

@Component({
  selector: 'app-create-room-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-card animate-fade" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <h2 class="modal-title">Create a Q&A Room</h2>
          <button type="button" class="close-btn" (click)="close.emit()">✕</button>
        </div>

        <form (ngSubmit)="create()" class="form-body">
          <div class="field-group">
            <label for="room-name" class="label">Room Name</label>
            <input 
              id="room-name"
              type="text" 
              [(ngModel)]="name" 
              name="name" 
              placeholder="E.g. Weekly Tech Sync or Product AMA"
              class="input"
              required />
          </div>

          <div class="field-group">
            <label for="room-code" class="label">Custom Room Code (Optional)</label>
            <input 
              id="room-code"
              type="text" 
              [(ngModel)]="code" 
              name="code" 
              placeholder="E.g. weekly-sync (auto-generated if left blank)"
              class="input" />
          </div>

          <div class="field-group">
            <label for="room-host" class="label">Your Name / Host Alias</label>
            <input 
              id="room-host"
              type="text" 
              [(ngModel)]="host" 
              name="host" 
              placeholder="E.g. Bethwel"
              class="input" />
          </div>

          <div class="field-group">
            <label for="room-desc" class="label">Description (Optional)</label>
            <textarea 
              id="room-desc"
              [(ngModel)]="description" 
              name="description" 
              rows="2"
              placeholder="What is this Q&A room about?"
              class="textarea"></textarea>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-cancel" (click)="close.emit()">Cancel</button>
            <button 
              type="submit" 
              class="btn-submit"
              [disabled]="!name.trim()">
              Create & Enter Room
            </button>
          </div>
        </form>
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
      max-width: 480px;
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

    .form-body {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
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

    .input, .textarea {
      width: 100%;
      background-color: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 9px 12px;
      font-size: 14px;
      color: var(--text-main);

      &:focus {
        border-color: var(--border-focus);
      }
    }

    .textarea {
      resize: vertical;
      min-height: 60px;
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 6px;
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

    .btn-submit {
      padding: 8px 18px;
      border-radius: var(--radius-full);
      font-size: 13px;
      font-weight: 600;
      background-color: var(--accent-black);
      color: var(--text-white);

      &:hover {
        background-color: var(--accent-black-hover);
      }

      &[disabled] {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  `]
})
export class CreateRoomModalComponent {
  roomStore = inject(RoomStoreService);

  @Output() close = new EventEmitter<void>();

  name = '';
  code = '';
  host = '';
  description = '';

  create() {
    if (!this.name.trim()) return;
    this.roomStore.createRoom(this.name, this.code, this.host, this.description);
    this.close.emit();
  }
}
