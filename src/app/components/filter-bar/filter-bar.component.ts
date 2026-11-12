import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QnaStoreService } from '../../services/qna-store.service';
import { QuestionFilter, QuestionSort } from '../../models/qna.model';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="filter-bar">
      <!-- Search -->
      <div class="search-wrap">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input 
          type="text" 
          placeholder="Search questions or authors..."
          [ngModel]="qnaStore.searchQuery()"
          (ngModelChange)="qnaStore.searchQuery.set($event)"
          class="search-input" />
        @if (qnaStore.searchQuery()) {
          <button type="button" class="clear-btn" (click)="qnaStore.searchQuery.set('')">✕</button>
        }
      </div>

      <!-- Filter Tabs & Sort -->
      <div class="controls-row">
        <div class="tabs-scroll">
          <button 
            type="button" 
            class="tab-pill" 
            [class.active]="qnaStore.filter() === 'all'" 
            (click)="setFilter('all')">
            All ({{ qnaStore.totalQuestions() }})
          </button>

          <button 
            type="button" 
            class="tab-pill" 
            [class.active]="qnaStore.filter() === 'popular'" 
            (click)="setFilter('popular')">
            Popular
          </button>

          <button 
            type="button" 
            class="tab-pill" 
            [class.active]="qnaStore.filter() === 'unanswered'" 
            (click)="setFilter('unanswered')">
            Unanswered
          </button>

          <button 
            type="button" 
            class="tab-pill" 
            [class.active]="qnaStore.filter() === 'answered'" 
            (click)="setFilter('answered')">
            Answered
          </button>

          <span class="divider"></span>

          <button 
            type="button" 
            class="tab-pill cat" 
            [class.active]="qnaStore.filter() === 'Engineering'" 
            (click)="setFilter('Engineering')">
            Engineering
          </button>

          <button 
            type="button" 
            class="tab-pill cat" 
            [class.active]="qnaStore.filter() === 'Product'" 
            (click)="setFilter('Product')">
            Product
          </button>

          <button 
            type="button" 
            class="tab-pill cat" 
            [class.active]="qnaStore.filter() === 'Design'" 
            (click)="setFilter('Design')">
            Design
          </button>
        </div>

        <!-- Sort Select -->
        <div class="sort-wrap">
          <select 
            [ngModel]="qnaStore.sort()" 
            (ngModelChange)="qnaStore.sort.set($event)" 
            class="sort-select">
            <option value="upvotes">Most Upvoted</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .filter-bar {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    .search-wrap {
      position: relative;
      width: 100%;
    }

    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-faint);
    }

    .search-input {
      width: 100%;
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 12px 36px 12px 40px;
      font-size: 14px;
      color: var(--text-main);
      box-shadow: var(--shadow-sm);
      transition: border-color 0.15s ease;

      &::placeholder {
        color: var(--text-faint);
      }

      &:focus {
        border-color: var(--border-focus);
      }
    }

    .clear-btn {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 12px;
      color: var(--text-muted);
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: var(--bg-subtle);
    }

    .controls-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .tabs-scroll {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }
    }

    .tab-pill {
      white-space: nowrap;
      padding: 6px 14px;
      border-radius: var(--radius-full);
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      transition: all 0.15s ease;

      &:hover {
        background-color: var(--bg-subtle);
        color: var(--text-main);
      }

      &.active {
        background-color: var(--accent-black);
        border-color: var(--accent-black);
        color: var(--text-white);
        font-weight: 600;
      }
    }

    .divider {
      width: 1px;
      height: 18px;
      background-color: var(--border-subtle);
      margin: 0 4px;
    }

    .sort-select {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-main);
      cursor: pointer;

      &:focus {
        border-color: var(--border-focus);
      }
    }
  `]
})
export class FilterBarComponent {
  qnaStore = inject(QnaStoreService);

  setFilter(filter: QuestionFilter) {
    this.qnaStore.filter.set(filter);
  }
}
