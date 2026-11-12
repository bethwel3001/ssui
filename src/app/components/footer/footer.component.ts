import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoomStoreService } from '../../services/room-store.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="app-footer">
      <div class="footer-container">
        <!-- Minimal Top Row -->
        <div class="footer-top">
          <div class="brand-area" (click)="roomStore.leaveRoom()">
            <span class="footer-logo">ssui<span class="dot">!</span></span>
            <span class="tagline">Real-time Q&A and community boards</span>
          </div>

          <nav class="footer-nav">
            <a href="#explore-rooms" (click)="roomStore.leaveRoom()">Rooms</a>
            <a href="#how-it-works">How it works</a>
            <a href="https://github.com" target="_blank" rel="noopener">GitHub</a>
          </nav>
        </div>

        <!-- Big Bold Watermark Typography: SSUI! -->
        <div class="big-watermark-wrap" aria-hidden="true">
          <span class="big-watermark">SSUI!</span>
        </div>

        <!-- Clean Copyright Line -->
        <div class="footer-bottom">
          <span>© 2026 ssui!. All rights reserved.</span>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .app-footer {
      background-color: #0F1115;
      color: #E4E4E7;
      padding: 60px 24px 32px 24px;
      position: relative;
      overflow: hidden;
    }

    .footer-container {
      max-width: 1140px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 40px;
    }

    .footer-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
    }

    .brand-area {
      display: flex;
      align-items: baseline;
      gap: 12px;
      cursor: pointer;
      user-select: none;
      flex-wrap: wrap;
    }

    .footer-logo {
      font-size: 26px;
      font-weight: 800;
      font-style: normal;
      letter-spacing: -0.04em;
      color: #FFFFFF;

      .dot {
        color: var(--accent-gold);
      }
    }

    .tagline {
      font-size: 13px;
      color: #71717A;
    }

    .footer-nav {
      display: flex;
      align-items: center;
      gap: 20px;

      a {
        font-size: 14px;
        font-weight: 500;
        color: #A1A1AA;
        text-decoration: none;
        transition: color 0.15s ease;

        &:hover {
          color: #FFFFFF;
        }
      }
    }

    /* Big Bold Watermark: SSUI! */
    .big-watermark-wrap {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      user-select: none;
      pointer-events: none;
      overflow: hidden;
      padding: 16px 0 0 0;
    }

    .big-watermark {
      font-size: clamp(64px, 18vw, 220px);
      font-weight: 900;
      letter-spacing: -0.05em;
      line-height: 0.85;
      text-align: center;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      display: block;
      width: 100%;
    }

    .footer-bottom {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: #52525B;
    }

    @media (max-width: 640px) {
      .footer-top {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }
    }
  `]
})
export class FooterComponent {
  roomStore = inject(RoomStoreService);
}
