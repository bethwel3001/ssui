import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QnaStoreService } from '../../services/qna-store.service';

@Component({
  selector: 'app-stats-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-label">Total Questions</span>
        <div class="stat-value-row">
          <span class="stat-num">{{ qnaStore.totalQuestions() }}</span>
        </div>
      </div>

      <div class="stat-card">
        <span class="stat-label">Total Upvotes</span>
        <div class="stat-value-row">
          <span class="stat-num">{{ qnaStore.totalUpvotes() }}</span>
        </div>
      </div>

      <div class="stat-card">
        <span class="stat-label">Answered</span>
        <div class="stat-value-row">
          <span class="stat-num">{{ qnaStore.answeredCount() }}</span>
        </div>
      </div>

      <div class="stat-card">
        <span class="stat-label">Pending</span>
        <div class="stat-value-row">
          <span class="stat-num">{{ qnaStore.unansweredCount() }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }

    .stat-card {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 18px 20px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .stat-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
    }

    .stat-value-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
    }

    .stat-num {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: var(--text-main);
    }

    @media (max-width: 900px) {
      .stats-row {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 480px) {
      .stats-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class StatsBarComponent {
  qnaStore = inject(QnaStoreService);
}
