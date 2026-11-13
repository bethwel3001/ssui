import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoomStoreService } from '../../services/room-store.service';
import { Room } from '../../models/room.model';

@Component({
  selector: 'app-home-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="home-container animate-view">
      <!-- Full-Height Hero Section -->
      <section class="hero-section">
        <div class="hero-content">
          <div class="hero-badge">Real-Time Q&A & Community Boards</div>
          <h1 class="hero-title">Ask questions, vote live, and connect with any room</h1>
          <p class="hero-subtext">
            Enter a room code to participate in live discussions, or launch your own interactive space in seconds.
          </p>

          <!-- 2 Main CTAs Container -->
          <div class="hero-ctas">
            <!-- CTA 1: Join with Code Box -->
            <form (ngSubmit)="joinByCode()" class="cta-join-box">
              <svg class="hash-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="4" y1="9" x2="20" y2="9"></line>
                <line x1="4" y1="15" x2="20" y2="15"></line>
                <line x1="10" y1="3" x2="8" y2="21"></line>
                <line x1="16" y1="3" x2="14" y2="21"></line>
              </svg>
              <input 
                type="text" 
                [(ngModel)]="inputCode" 
                name="inputCode"
                placeholder="Enter room code..." 
                class="cta-code-input" />
              <button type="submit" class="btn-join" [disabled]="!inputCode.trim()">
                Join Room
              </button>
            </form>

            <span class="or-separator">or</span>

            <!-- CTA 2: Create Room -->
            <button type="button" class="btn-hero-create" (click)="openCreateModal.emit()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Create a Room</span>
            </button>
          </div>
        </div>

        <!-- Scroll Indicator -->
        <a href="#how-it-works" class="hero-scroll-prompt">
          <span>Scroll to explore</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="19 12 12 19 5 12"></polyline>
          </svg>
        </a>
      </section>

      <!-- 3-Step Instruction Section -->
      <section id="how-it-works" class="instructions-section">
        <div class="instructions-content">
          <div class="section-header">
            <h2 class="section-title">How it works</h2>
            <p class="section-desc">Join any discussion in three straightforward steps</p>
          </div>

          <div class="steps-grid">
            <div class="step-card">
              <div class="step-number">01</div>
              <h3 class="step-title">Enter or Create Room</h3>
              <p class="step-body">
                Type the room code provided by your event organizer, or launch a fresh room for your team.
              </p>
            </div>

            <div class="step-card">
              <div class="step-number">02</div>
              <h3 class="step-title">Check Q&A Status</h3>
              <p class="step-body">
                See whether the host has opened questions or paused submissions to focus on answering.
              </p>
            </div>

            <div class="step-card">
              <div class="step-number">03</div>
              <h3 class="step-title">Ask & Upvote</h3>
              <p class="step-body">
                Submit your questions and give a SSUI! upvote to bring the most critical questions to the top.
              </p>
            </div>
          </div>
        </div>

        <!-- Scroll Prompt to Explore Rooms -->
        <a href="#explore-rooms" class="hero-scroll-prompt">
          <span>Explore active rooms</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="19 12 12 19 5 12"></polyline>
          </svg>
        </a>
      </section>

      <!-- Active Rooms Directory Section -->
      <section id="explore-rooms" class="rooms-section">
        <div class="rooms-content-wrap">
          <div class="rooms-header-row">
          <div>
            <h2 class="section-title">Explore Active Rooms</h2>
            <p class="section-desc">Join an open room and start asking questions</p>
          </div>

          <div class="cat-filters">
            <button 
              type="button" 
              class="cat-pill" 
              [class.active]="selectedCategory() === 'All'" 
              (click)="selectedCategory.set('All')">
              All
            </button>
            <button 
              type="button" 
              class="cat-pill" 
              [class.active]="selectedCategory() === 'Tech'" 
              (click)="selectedCategory.set('Tech')">
              Tech
            </button>
            <button 
              type="button" 
              class="cat-pill" 
              [class.active]="selectedCategory() === 'Product'" 
              (click)="selectedCategory.set('Product')">
              Product
            </button>
            <button 
              type="button" 
              class="cat-pill" 
              [class.active]="selectedCategory() === 'Community'" 
              (click)="selectedCategory.set('Community')">
              Community
            </button>
          </div>
        </div>


        <!-- Loading Skeletons -->
        @if (roomStore.isLoadingRooms()) {
          <div class="rooms-grid">
            <div class="room-skeleton-card"></div>
            <div class="room-skeleton-card"></div>
          </div>
        } @else {
          <!-- Real Rooms Grid fetched from backend -->
          <div class="rooms-grid">
            @for (room of filteredRooms(); track room.code) {
              <div class="room-card" (click)="roomStore.joinRoom(room.code)">
                <div class="room-card-header">
                  <span class="room-code-tag">#{{ room.code }}</span>
                  <span class="status-pill" [class.open]="room.isQaOpen" [class.paused]="!room.isQaOpen">
                    <span class="dot"></span>
                    {{ room.isQaOpen ? 'Q&A Open' : 'Q&A Paused' }}
                  </span>
                </div>

                <h3 class="room-name">{{ room.name }}</h3>
                <p class="room-desc">{{ room.description }}</p>

                <div class="room-footer">
                  <div class="host-info">
                    <span class="host-avatar">{{ room.host.charAt(0) }}</span>
                    <span class="host-name">Hosted by {{ room.host }}</span>
                  </div>

                  <div class="btn-enter-room">
                    <span>Enter Room</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </div>
                </div>
              </div>
            } @empty {
              <!-- Empty state when no rooms are found -->
              <div class="empty-rooms-box">
                <p class="empty-rooms-title">No rooms found</p>
                <p class="empty-rooms-desc">
                  There are currently no active discussion rooms. Create one to get started!
                </p>
                <button type="button" class="btn-create-empty" (click)="openCreateModal.emit()">
                  + Create First Room
                </button>
              </div>
            }
          </div>
        }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .home-container {
      max-width: 1140px;
      margin: 0 auto;
      padding: 0 24px 80px 24px;
    }

    /* Hero */
    .hero-section {
      min-height: calc(100vh - 84px);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 40px 0 32px 0;
      position: relative;
    }

    .hero-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 820px;
      margin: auto 0;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      padding: 5px 16px;
      border-radius: var(--radius-full);
      margin-bottom: 24px;
      letter-spacing: 0.02em;
    }

    .hero-title {
      font-size: clamp(34px, 6vw, 54px);
      font-weight: 800;
      line-height: 1.12;
      letter-spacing: -0.035em;
      color: var(--text-main);
      margin-bottom: 20px;
    }

    .hero-subtext {
      font-size: clamp(16px, 2.2vw, 19px);
      color: var(--text-muted);
      max-width: 620px;
      line-height: 1.6;
      margin-bottom: 40px;
    }

    /* 2 CTAs */
    .hero-ctas {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      justify-content: center;
      width: 100%;
    }

    .cta-join-box {
      display: flex;
      align-items: center;
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
      padding: 5px 6px 5px 18px;
      box-shadow: 0 4px 18px -2px rgba(0, 0, 0, 0.04);
      transition: border-color 0.15s ease;
      max-width: 100%;

      &:focus-within {
        border-color: var(--border-focus);
      }
    }

    .hash-icon {
      color: var(--text-faint);
      margin-right: 8px;
      flex-shrink: 0;
    }

    .cta-code-input {
      border: none;
      background: none;
      font-size: 14px;
      color: var(--text-main);
      width: 250px;

      &::placeholder {
        color: var(--text-faint);
      }
    }

    .btn-join {
      padding: 10px 22px;
      border-radius: var(--radius-full);
      background-color: var(--accent-black);
      color: var(--text-white);
      font-size: 13px;
      font-weight: 600;
      flex-shrink: 0;
      transition: background-color 0.15s ease;

      &:hover:not([disabled]) {
        background-color: var(--accent-black-hover);
      }

      &[disabled] {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    .or-separator {
      font-size: 13px;
      color: var(--text-faint);
    }

    .btn-hero-create {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 24px;
      border-radius: var(--radius-full);
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      color: var(--text-main);
      font-size: 14px;
      font-weight: 600;
      box-shadow: var(--shadow-sm);
      transition: all 0.15s ease;

      &:hover {
        background-color: var(--bg-subtle);
      }
    }

    .hero-scroll-prompt {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      text-decoration: none;
      padding-bottom: 12px;
      transition: color 0.15s ease;

      &:hover {
        color: var(--text-main);
      }
    }

    /* Instructions Section - Full Viewport Long */
    .instructions-section {
      min-height: calc(100vh - 84px);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 48px 0 24px 0;
      position: relative;
      scroll-margin-top: 84px;
    }

    .instructions-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      margin: auto 0;
    }

    .section-header {
      text-align: center;
      margin-bottom: 40px;
    }

    .section-title {
      font-size: clamp(28px, 4vw, 38px);
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--text-main);
    }

    .section-desc {
      font-size: clamp(15px, 2vw, 17px);
      color: var(--text-muted);
      margin-top: 8px;
    }

    .steps-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      width: 100%;
      margin-bottom: 24px;
    }

    .step-card {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xl);
      padding: 32px 28px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-3px);
        box-shadow: var(--shadow-card);
      }
    }

    .step-number {
      font-size: 14px;
      font-weight: 800;
      color: var(--accent-gold);
      letter-spacing: 0.05em;
    }

    .step-title {
      font-size: 19px;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.02em;
    }

    .step-body {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.6;
    }

    /* Rooms Directory - Full Viewport Long */
    .rooms-section {
      min-height: calc(100vh - 84px);
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 48px 0 32px 0;
      position: relative;
      scroll-margin-top: 84px;
    }

    .rooms-content-wrap {
      width: 100%;
      margin: auto 0;
    }

    .rooms-header-row {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 28px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .cat-filters {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }
    }

    .cat-pill {
      padding: 6px 14px;
      border-radius: var(--radius-full);
      font-size: 12px;
      font-weight: 500;
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      cursor: pointer;
      white-space: nowrap;

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

    .rooms-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .room-skeleton-card {
      height: 180px;
      background: linear-gradient(90deg, #F4F4F5 25%, #E4E4E7 50%, #F4F4F5 75%);
      background-size: 200% 100%;
      animation: skeletonPulse 1.5s infinite;
      border-radius: var(--radius-lg);
    }

    @keyframes skeletonPulse {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .room-card {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 26px;
      box-shadow: var(--shadow-sm);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover {
        border-color: #A1A1AA;
        transform: translateY(-2px);
        box-shadow: var(--shadow-card);
      }
    }

    .room-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .room-code-tag {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-main);
      background-color: var(--bg-subtle);
      padding: 2px 8px;
      border-radius: var(--radius-full);
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      padding: 3px 9px;
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

    .room-name {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.01em;
    }

    .room-desc {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .room-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 8px;
      margin-top: auto;
    }

    .host-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .host-avatar {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background-color: var(--bg-subtle);
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .host-name {
      font-size: 12px;
      color: var(--text-muted);
    }

    .btn-enter-room {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
      transition: transform 0.15s ease;
    }

    .room-card:hover .btn-enter-room {
      transform: translateX(2px);
    }

    .empty-rooms-box {
      grid-column: span 2;
      background: var(--bg-surface);
      border: 1px dashed var(--border-subtle);
      border-radius: var(--radius-xl);
      padding: 48px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .empty-rooms-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
    }

    .empty-rooms-desc {
      font-size: 13px;
      color: var(--text-muted);
      max-width: 440px;
      line-height: 1.5;
    }

    .btn-create-empty {
      margin-top: 10px;
      padding: 9px 20px;
      border-radius: var(--radius-full);
      background: var(--accent-black);
      color: white;
      font-size: 13px;
      font-weight: 600;

      &:hover {
        background: var(--accent-black-hover);
      }
    }

    @media (max-width: 960px) {
      .steps-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .steps-grid .step-card:last-child {
        grid-column: span 2;
      }
      .rooms-grid {
        grid-template-columns: 1fr;
      }
      .empty-rooms-box {
        grid-column: span 1;
      }
    }

    @media (max-width: 640px) {
      .home-container {
        padding: 0 16px 56px 16px;
      }
      .hero-section,
      .instructions-section,
      .rooms-section {
        min-height: calc(100vh - 76px);
      }
      .hero-ctas {
        flex-direction: column;
        width: 100%;
        max-width: 320px;
        margin: 0 auto;
        gap: 10px;
      }
      .cta-join-box {
        width: 100%;
        justify-content: space-between;
        padding: 3px 4px 3px 12px;
      }
      .hash-icon {
        width: 13px;
        height: 13px;
        margin-right: 6px;
      }
      .cta-code-input {
        width: 100%;
        min-width: 0;
        font-size: 12.5px;
      }
      .btn-join {
        padding: 7px 14px;
        font-size: 12px;
        border-radius: var(--radius-full);
      }
      .or-separator {
        display: block;
        font-size: 11px;
        color: var(--text-faint);
        margin: -2px 0;
      }
      .btn-hero-create {
        width: 100%;
        justify-content: center;
        padding: 9px 16px;
        font-size: 12.5px;
        gap: 6px;

        svg {
          width: 13px;
          height: 13px;
        }
      }
      .steps-grid {
        grid-template-columns: 1fr;
      }
      .steps-grid .step-card:last-child {
        grid-column: span 1;
      }
    }
  `]
})
export class HomeViewComponent {
  roomStore = inject(RoomStoreService);

  @Output() openCreateModal = new EventEmitter<void>();
  @Output() openSettings = new EventEmitter<void>();

  inputCode = '';
  selectedCategory = signal<'All' | 'Tech' | 'Product' | 'Community'>('All');

  get filteredRooms(): () => Room[] {
    return () => {
      const cat = this.selectedCategory();
      const all = this.roomStore.rooms();
      if (cat === 'All') return all;
      return all.filter(r => r.category === cat);
    };
  }

  joinByCode() {
    if (this.inputCode.trim()) {
      this.roomStore.joinRoom(this.inputCode);
      this.inputCode = '';
    }
  }
}
