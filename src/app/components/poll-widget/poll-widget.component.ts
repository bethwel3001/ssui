import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QnaStoreService } from '../../services/qna-store.service';

@Component({
  selector: 'app-poll-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (qnaStore.activeRoomPoll(); as poll) {
      <div id="polls" class="poll-card">
        <div class="poll-header">
          <div class="header-left">
            <span class="poll-badge">Community Poll</span>
            <span class="poll-meta">{{ poll.totalVotes }} responses</span>
          </div>
        </div>

        <h3 class="poll-question">{{ poll.question }}</h3>

        <div class="poll-options">
          @for (option of poll.options; track option.id) {
            @let percent = getPercentage(option.votes, poll.totalVotes);
            @let isSelected = qnaStore.userVotedOptionId() === option.id;

            <button 
              type="button" 
              class="poll-option-btn"
              [class.selected]="isSelected"
              (click)="vote(option.id)"
              [disabled]="!!qnaStore.userVotedOptionId()">
              
              <div class="progress-fill" [style.width.%]="percent"></div>

              <div class="option-content">
                <span class="option-text">{{ option.text }}</span>
                <span class="option-stats">{{ percent }}%</span>
              </div>
            </button>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .poll-card {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xl);
      padding: 24px;
      margin-bottom: 28px;
      box-shadow: var(--shadow-sm);
    }

    .poll-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .poll-badge {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      background-color: var(--bg-subtle);
      padding: 3px 8px;
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .poll-meta {
      font-size: 13px;
      color: var(--text-faint);
    }

    .poll-question {
      font-size: 17px;
      font-weight: 600;
      color: var(--text-main);
      margin-bottom: 16px;
      letter-spacing: -0.01em;
    }

    .poll-options {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .poll-option-btn {
      position: relative;
      background-color: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px 16px;
      text-align: left;
      overflow: hidden;
      transition: all 0.15s ease;

      &:not([disabled]):hover {
        border-color: #A1A1AA;
        background-color: var(--bg-subtle);
      }

      &.selected {
        border-color: var(--accent-black);
      }
    }

    .progress-fill {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      background: rgba(19, 19, 22, 0.06);
      transition: width 0.4s ease;
      z-index: 1;
    }

    .option-content {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .option-text {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-main);
    }

    .option-stats {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
    }

    @media (max-width: 640px) {
      .poll-options {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PollWidgetComponent {
  qnaStore = inject(QnaStoreService);

  getPercentage(votes: number, total: number): number {
    if (!total || total === 0) return 0;
    return Math.round((votes / total) * 100);
  }

  vote(optionId: string) {
    this.qnaStore.votePoll(optionId);
  }
}
