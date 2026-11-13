import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QnaStoreService } from '../../services/qna-store.service';
import { Question } from '../../models/qna.model';

@Component({
  selector: 'app-ask-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-card animate-fade" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <h2 class="modal-title">New Question</h2>
          <button type="button" class="close-btn" (click)="close.emit()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Form -->
        <form (ngSubmit)="submit()" class="form-body">
          <div class="field-group">
            <label for="q-content" class="label">Question</label>
            <textarea 
              id="q-content"
              [(ngModel)]="content" 
              name="content"
              rows="4" 
              placeholder="What would you like to ask or discuss?"
              class="textarea"
              required></textarea>
          </div>

          <div class="field-group">
            <label class="label">Category</label>
            <div class="cat-pills">
              @for (cat of categories; track cat) {
                <button 
                  type="button" 
                  class="cat-pill"
                  [class.active]="selectedCategory === cat"
                  (click)="selectedCategory = cat">
                  {{ cat }}
                </button>
              }
            </div>
          </div>

          <div class="field-group">
            <label for="q-author" class="label">Name (Optional)</label>
            <input 
              id="q-author"
              type="text" 
              [(ngModel)]="author" 
              name="author"
              placeholder="Your name or handle"
              class="input" />
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-cancel" (click)="close.emit()">Cancel</button>
            <button 
              type="submit" 
              class="btn-submit"
              [disabled]="!content.trim()">
              Post Question
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
      width: 28px;
      height: 28px;
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
      gap: 16px;
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

    .textarea {
      width: 100%;
      background-color: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 10px 14px;
      font-size: 14px;
      color: var(--text-main);
      resize: vertical;
      min-height: 90px;
      transition: border-color 0.15s ease;

      &:focus {
        border-color: var(--border-focus);
      }
    }

    .cat-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .cat-pill {
      padding: 5px 12px;
      border-radius: var(--radius-full);
      font-size: 12px;
      font-weight: 500;
      background-color: var(--bg-app);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      cursor: pointer;

      &:hover {
        color: var(--text-main);
      }

      &.active {
        background-color: var(--accent-black);
        border-color: var(--accent-black);
        color: var(--text-white);
        font-weight: 600;
      }
    }

    .input {
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

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 8px;
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
      transition: background-color 0.15s ease;

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
export class AskModalComponent {
  qnaStore = inject(QnaStoreService);

  @Output() close = new EventEmitter<void>();

  content = '';
  author = '';
  selectedCategory: Question['category'] = 'Engineering';
  categories: Question['category'][] = ['Engineering', 'Product', 'Design', 'General'];

  /**
   * Submits a new question with instant Optimistic UI:
   * Immediately updates the local Signal list and closes the modal
   * while routing to WebSocket (if online) or IndexedDB (if offline).
   */
  submit() {
    const trimmed = this.content.trim();
    if (!trimmed) return;

    // Trigger optimistic submission
    this.qnaStore.askQuestion(trimmed, this.author, this.selectedCategory);

    // Reset inputs and close modal instantly for 0ms perceptual latency
    this.content = '';
    this.author = '';
    this.close.emit();
  }
}
