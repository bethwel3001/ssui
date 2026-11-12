import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoomStoreService } from '../../services/room-store.service';
import { QnaStoreService } from '../../services/qna-store.service';
import { FilterBarComponent } from '../filter-bar/filter-bar.component';
import { QuestionCardComponent } from '../question-card/question-card.component';
import { PollWidgetComponent } from '../poll-widget/poll-widget.component';

@Component({
  selector: 'app-room-view',
  standalone: true,
  imports: [
    CommonModule,
    FilterBarComponent,
    QuestionCardComponent,
    PollWidgetComponent
  ],
  template: `
    @if (roomStore.activeRoom(); as room) {
      <div class="room-page animate-room-enter">
        <!-- Room Top Bar Navigation -->
        <div class="room-topbar">
          <div class="topbar-left">
            <button type="button" class="back-link" (click)="roomStore.leaveRoom()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>All Rooms</span>
            </button>
            <span class="sep">•</span>
            <span class="room-code">#{{ room.code }}</span>
          </div>

          <!-- Role Toggle (Attendee vs Creator Mode) -->
          <div class="role-switcher">
            <span class="role-label">Mode:</span>
            <button 
              type="button" 
              class="role-pill" 
              [class.active]="!roomStore.isCreatorMode()"
              (click)="roomStore.isCreatorMode.set(false)">
              Attendee
            </button>
            <button 
              type="button" 
              class="role-pill" 
              [class.active]="roomStore.isCreatorMode()"
              (click)="roomStore.isCreatorMode.set(true)">
              Creator
            </button>
          </div>
        </div>

        <!-- Room Header Card -->
        <div class="room-hero-card">
          <div class="room-hero-main">
            <div class="status-indicator-wrap">
              <span class="status-pill" [class.open]="room.isQaOpen" [class.paused]="!room.isQaOpen">
                <span class="dot"></span>
                {{ room.isQaOpen ? 'Q&A Open' : 'Q&A Paused' }}
              </span>
              <span class="host-meta">Hosted by {{ room.host }}</span>
            </div>

            <h1 class="room-title">{{ room.name }}</h1>
            <p class="room-description">{{ room.description }}</p>
          </div>

          <!-- Ask CTA if Q&A is open -->
          <div class="room-hero-actions">
            @if (room.isQaOpen) {
              <button type="button" class="btn-ask-primary" (click)="openAskModal.emit()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Ask Question</span>
              </button>
            }
          </div>
        </div>

        <!-- Host / Creator Controls Bar (Visible in Creator Mode) -->
        @if (roomStore.isCreatorMode()) {
          <div class="creator-control-strip">
            <div class="creator-left">
              <span class="creator-badge">Creator Mode</span>
              <span class="creator-summary">
                {{ qnaStore.unansweredCount() }} unanswered / {{ qnaStore.totalQuestions() }} total
              </span>
            </div>

            <div class="creator-actions">
              <button 
                type="button" 
                class="btn-toggle-qa"
                [class.btn-pause]="room.isQaOpen"
                [class.btn-open]="!room.isQaOpen"
                (click)="roomStore.toggleQa(room.code)">
                {{ room.isQaOpen ? 'Pause Q&A Submissions' : 'Open Q&A Submissions' }}
              </button>
            </div>
          </div>
        }

        <!-- Paused Warning Banner for Attendees -->
        @if (!room.isQaOpen) {
          <div class="paused-banner">
            <div class="paused-text">
              <strong>Q&A Submissions are paused.</strong> The host is currently reviewing questions. You can still upvote existing questions below.
            </div>
          </div>
        }

        <!-- Community Poll for this room if present -->
        @if (qnaStore.activeRoomPoll()) {
          <app-poll-widget></app-poll-widget>
        }

        <!-- Filter & Search Controls -->
        <app-filter-bar></app-filter-bar>

        <!-- Question List -->
        <section class="questions-stream">
          @for (q of qnaStore.filteredQuestions(); track q.id) {
            <app-question-card [question]="q"></app-question-card>
          } @empty {
            <div class="empty-room-state">
              <p class="empty-title">No questions yet</p>
              <p class="empty-sub">
                @if (room.isQaOpen) {
                  Be the first to post a question in this room!
                } @else {
                  No questions currently in this room.
                }
              </p>
              @if (room.isQaOpen) {
                <button type="button" class="btn-ask-empty" (click)="openAskModal.emit()">
                  Ask First Question
                </button>
              }
            </div>
          }
        </section>
      </div>
    }
  `,
  styles: [`
    .room-page {
      max-width: 1080px;
      margin: 0 auto;
      padding: 32px 24px 64px 24px;
    }

    .room-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
      cursor: pointer;

      &:hover {
        color: var(--text-main);
      }
    }

    .sep {
      color: var(--text-faint);
    }

    .room-code {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
    }

    .role-switcher {
      display: flex;
      align-items: center;
      gap: 6px;
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
      padding: 3px 4px;
    }

    .role-label {
      font-size: 12px;
      color: var(--text-muted);
      margin-left: 8px;
    }

    .role-pill {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      padding: 4px 12px;
      border-radius: var(--radius-full);
      transition: all 0.15s ease;

      &.active {
        background-color: var(--accent-black);
        color: var(--text-white);
        font-weight: 600;
      }
    }

    /* Room Hero Card */
    .room-hero-card {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xl);
      padding: 28px;
      margin-bottom: 24px;
      box-shadow: var(--shadow-sm);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
    }

    .room-hero-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .status-indicator-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
      flex-wrap: wrap;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: var(--radius-full);

      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }

      &.open {
        background-color: #ECFDF5;
        color: #047857;
        .dot { background-color: #10B981; }
      }

      &.paused {
        background-color: var(--bg-subtle);
        color: var(--text-muted);
        .dot { background-color: var(--text-faint); }
      }
    }

    .host-meta {
      font-size: 13px;
      color: var(--text-muted);
    }

    .room-title {
      font-size: clamp(22px, 3.5vw, 28px);
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text-main);
    }

    .room-description {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    .btn-ask-primary {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 11px 22px;
      border-radius: var(--radius-full);
      background-color: var(--accent-black);
      color: var(--text-white);
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      transition: background-color 0.15s ease;

      &:hover {
        background-color: var(--accent-black-hover);
      }
    }

    /* Creator Control Strip */
    .creator-control-strip {
      background-color: #18181B;
      color: white;
      border-radius: var(--radius-lg);
      padding: 14px 20px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .creator-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .creator-badge {
      font-size: 11px;
      font-weight: 700;
      color: var(--accent-gold);
      background-color: rgba(245, 158, 11, 0.15);
      padding: 3px 8px;
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .creator-summary {
      font-size: 13px;
      color: #A1A1AA;
    }

    .btn-toggle-qa {
      padding: 7px 16px;
      border-radius: var(--radius-full);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;

      &.btn-pause {
        background-color: rgba(239, 68, 68, 0.2);
        color: #FCA5A5;
        border: 1px solid rgba(239, 68, 68, 0.4);

        &:hover {
          background-color: rgba(239, 68, 68, 0.35);
        }
      }

      &.btn-open {
        background-color: rgba(16, 185, 129, 0.2);
        color: #6EE7B7;
        border: 1px solid rgba(16, 185, 129, 0.4);

        &:hover {
          background-color: rgba(16, 185, 129, 0.35);
        }
      }
    }

    /* Paused Banner */
    .paused-banner {
      background-color: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px 18px;
      margin-bottom: 24px;
      font-size: 13px;
      color: var(--text-muted);
    }

    .empty-room-state {
      background-color: var(--bg-surface);
      border: 1px dashed var(--border-subtle);
      border-radius: var(--radius-xl);
      padding: 48px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .empty-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
    }

    .empty-sub {
      font-size: 13px;
      color: var(--text-muted);
    }

    .btn-ask-empty {
      margin-top: 8px;
      padding: 9px 20px;
      border-radius: var(--radius-full);
      background-color: var(--accent-black);
      color: var(--text-white);
      font-size: 13px;
      font-weight: 600;
    }

    @media (max-width: 640px) {
      .room-page {
        padding: 20px 16px 48px 16px;
      }
      .room-hero-card {
        padding: 20px;
      }
      .btn-ask-primary {
        width: 100%;
        justify-content: center;
      }
      .creator-control-strip {
        flex-direction: column;
        align-items: flex-start;
      }
      .btn-toggle-qa {
        width: 100%;
        text-align: center;
      }
    }
  `]
})
export class RoomViewComponent {
  roomStore = inject(RoomStoreService);
  qnaStore = inject(QnaStoreService);

  @Output() openAskModal = new EventEmitter<void>();
}
