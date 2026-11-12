import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoomStoreService } from '../../services/room-store.service';
import { WebSocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="navbar-wrapper">
      <nav class="navbar-pill">
        <!-- Logo: Clean, Upright (No Italics), Bold -->
        <div class="logo-wrap" (click)="roomStore.leaveRoom()" title="ssui! Home">
          <span class="logo-text">ssui</span><span class="logo-dot">!</span>
        </div>

        <!-- Center Nav Links (Home view) -->
        @if (!roomStore.activeRoom()) {
          <div class="nav-center">
            <a href="#explore-rooms" class="nav-pill-link">Rooms</a>
            <a href="#how-it-works" class="nav-pill-link">How it works</a>
            <a href="#explore-rooms" class="nav-pill-link">Community</a>
          </div>
        } @else {
          <!-- In-Room Active Breadcrumb -->
          <div class="in-room-breadcrumb">
            <span class="slash">/</span>
            <span class="room-tag">#{{ roomStore.activeRoom()?.code }}</span>
          </div>
        }

        <!-- Right Action Area (Clean & Not Repetitive) -->
        <div class="nav-right">
          @if (roomStore.activeRoom()) {
            <!-- In-Room Exit Button -->
            <button type="button" class="btn-exit" (click)="roomStore.leaveRoom()">
              <span>Exit Room</span>
            </button>
          } @else {
            <!-- Explore Anchor CTA -->
            <a href="#explore-rooms" class="btn-pill-action">
              <span>Explore</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </a>
          }

          <!-- Endpoint Settings Modal Trigger -->
          <button 
            type="button" 
            class="icon-settings-btn" 
            (click)="openSettings.emit()" 
            title="WebSocket Endpoint Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>
      </nav>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: sticky;
      top: 14px;
      z-index: 1000;
      width: 100%;
    }

    .navbar-wrapper {
      display: flex;
      justify-content: center;
      padding: 0 16px;
      width: 100%;
    }

    .navbar-pill {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      width: 100%;
      max-width: 860px;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: var(--radius-full);
      padding: 8px 14px 8px 22px;
      box-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04);
      transition: all 0.2s ease;
    }

    .logo-wrap {
      cursor: pointer;
      user-select: none;
      display: flex;
      align-items: baseline;
    }

    .logo-text {
      font-size: 25px;
      font-weight: 800;
      font-style: normal;
      letter-spacing: -0.04em;
      color: var(--text-main);
    }

    .logo-dot {
      font-size: 25px;
      font-weight: 800;
      font-style: normal;
      color: var(--accent-gold);
    }

    .nav-center {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .nav-pill-link {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
      text-decoration: none;
      padding: 6px 14px;
      border-radius: var(--radius-full);
      transition: all 0.15s ease;

      &:hover {
        color: var(--text-main);
        background-color: var(--bg-subtle);
      }
    }

    .in-room-breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .slash {
      color: var(--text-faint);
      font-size: 13px;
    }

    .room-tag {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
      background-color: var(--bg-subtle);
      padding: 3px 10px;
      border-radius: var(--radius-full);
    }

    .nav-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-pill-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 16px;
      border-radius: var(--radius-full);
      background-color: var(--accent-black);
      color: var(--text-white);
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: background-color 0.15s ease;

      &:hover {
        background-color: var(--accent-black-hover);
      }
    }

    .btn-exit {
      padding: 6px 14px;
      border-radius: var(--radius-full);
      background-color: var(--bg-subtle);
      color: var(--text-main);
      font-size: 12px;
      font-weight: 600;
      transition: background-color 0.15s ease;

      &:hover {
        background-color: var(--bg-hover);
      }
    }

    .icon-settings-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      background-color: transparent;
      transition: all 0.15s ease;

      &:hover {
        background-color: var(--bg-subtle);
        color: var(--text-main);
      }
    }

    @media (max-width: 640px) {
      :host {
        top: 10px;
      }
      .navbar-wrapper {
        padding: 0 10px;
      }
      .navbar-pill {
        padding: 6px 10px 6px 16px;
      }
      .nav-center {
        display: none;
      }
      .logo-text, .logo-dot {
        font-size: 22px;
      }
    }
  `]
})
export class NavbarComponent {
  roomStore = inject(RoomStoreService);
  wsService = inject(WebSocketService);

  @Output() openSettings = new EventEmitter<void>();
}
