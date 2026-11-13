import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Question } from '../../models/qna.model';
import { QnaStoreService } from '../../services/qna-store.service';
import { RoomStoreService } from '../../services/room-store.service';

@Component({
  selector: 'app-question-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="card" [class.pinned]="question.isPinned" [class.answered]="question.isAnswered">
      <div class="card-inner">
        <!-- Upvote / SSUI Button -->
        <button 
          type="button" 
          class="upvote-btn" 
          [class.active]="hasVoted()" 
          (click)="onUpvote()"
          title="Upvote">
          <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
          <span class="count">{{ question.upvotes }}</span>
          <span class="ssui-tag">SSUI</span>
        </button>

        <!-- Content -->
        <div class="card-content">
          <div class="meta-row">
            <div class="author-meta">
              <span class="avatar">{{ question.author.charAt(0).toUpperCase() }}</span>
              <span class="author-name">{{ question.author }}</span>
              <span class="dot">•</span>
              <span class="time">{{ formatTime(question.createdAt) }}</span>
            </div>

            <div class="badges-row">
              @if (question.syncStatus === 'pending') {
                <span class="sync-status-badge pending" title="Saved locally. Will sync once connection returns.">
                  <span class="sync-spinner"></span>
                  <span>Pending connection...</span>
                </span>
              }
              @if (question.isPinned) {
                <span class="pinned-badge">Pinned</span>
              }
              <span class="category-badge">{{ question.category }}</span>
              @if (question.isAnswered) {
                <span class="status-badge answered">Answered</span>
              }
            </div>
          </div>

          <p class="question-text">{{ question.content }}</p>

          <!-- Creator Actions (Only visible to Room Creator/Host) -->
          @if (roomStore.isCreatorMode()) {
            <div class="actions-row">
              <button 
                type="button" 
                class="subtle-btn" 
                [class.active-answered]="question.isAnswered"
                (click)="qnaStore.toggleAnswered(question.id)">
                {{ question.isAnswered ? 'Mark Unanswered' : '✓ Mark Answered' }}
              </button>

              <button 
                type="button" 
                class="subtle-btn" 
                (click)="qnaStore.togglePinned(question.id)">
                {{ question.isPinned ? 'Unpin' : 'Pin to Top' }}
              </button>

              <button 
                type="button" 
                class="subtle-btn delete" 
                (click)="qnaStore.deleteQuestion(question.id)">
                Delete
              </button>
            </div>
          }
        </div>
      </div>
    </article>
  `,
  styles: [`
    .card {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      margin-bottom: 12px;
      box-shadow: var(--shadow-sm);
      transition: border-color 0.15s ease;

      &:hover {
        border-color: #D4D4D8;
      }

      &.pinned {
        border-color: #CBD5E1;
        background-color: #FCFCFD;
      }

      &.answered {
        opacity: 0.85;
      }
    }

    .card-inner {
      display: flex;
      padding: 18px 20px;
      gap: 16px;
    }

    .upvote-btn {
      flex-shrink: 0;
      width: 54px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 8px 4px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      background-color: var(--bg-app);
      color: var(--text-muted);
      transition: all 0.15s ease;

      &:hover {
        background-color: var(--bg-subtle);
        border-color: #A1A1AA;
        color: var(--text-main);
      }

      &.active {
        background-color: var(--accent-black);
        border-color: var(--accent-black);
        color: var(--text-white);

        .chevron {
          stroke: var(--accent-gold);
        }

        .ssui-tag {
          color: var(--accent-gold);
          opacity: 1;
        }
      }
    }

    .count {
      font-size: 14px;
      font-weight: 700;
      margin-top: 2px;
    }

    .ssui-tag {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.05em;
      opacity: 0.7;
    }

    .card-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .author-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .avatar {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background-color: var(--bg-subtle);
      color: var(--text-main);
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .author-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
    }

    .dot {
      color: var(--text-faint);
      font-size: 12px;
    }

    .time {
      font-size: 12px;
      color: var(--text-muted);
    }

    .badges-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .sync-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 9px;
      border-radius: var(--radius-full);
      letter-spacing: -0.01em;

      &.pending {
        background-color: #FEF3C7;
        color: #92400E;
        border: 1px solid #FDE68A;
      }
    }

    .sync-spinner {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #D97706;
      display: inline-block;
      animation: pulseSync 1.4s infinite ease-in-out;
    }

    @keyframes pulseSync {
      0%, 100% {
        opacity: 0.35;
        transform: scale(0.85);
      }
      50% {
        opacity: 1;
        transform: scale(1.2);
      }
    }

    .pinned-badge {
      font-size: 10px;
      font-weight: 700;
      color: #1E293B;
      background-color: #E2E8F0;
      padding: 2px 7px;
      border-radius: var(--radius-full);
      text-transform: uppercase;
    }

    .category-badge {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      background-color: var(--bg-subtle);
      padding: 2px 8px;
      border-radius: var(--radius-full);
    }

    .status-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: var(--radius-full);

      &.answered {
        background-color: #ECFDF5;
        color: #047857;
      }
    }

    .question-text {
      font-size: 15px;
      line-height: 1.5;
      color: var(--text-main);
      font-weight: 400;
    }

    .actions-row {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-top: 6px;
      padding-top: 8px;
      border-top: 1px solid var(--border-subtle);
    }

    .subtle-btn {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      transition: color 0.15s ease;

      &:hover {
        color: var(--text-main);
      }

      &.active-answered {
        color: #047857;
        font-weight: 600;
      }

      &.delete:hover {
        color: #EF4444;
      }
    }
  `]
})
export class QuestionCardComponent {
  @Input({ required: true }) question!: Question;

  qnaStore = inject(QnaStoreService);
  roomStore = inject(RoomStoreService);

  hasVoted(): boolean {
    return this.qnaStore.userUpvotedIds().has(this.question.id);
  }

  onUpvote() {
    this.qnaStore.upvote(this.question.id);
  }

  formatTime(timestamp: number): string {
    const diffMin = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours}h ago`;
  }
}
