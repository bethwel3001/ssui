import { Injectable, signal, computed } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { ConnectionStatus, WebSocketMessage } from '../models/qna.model';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectTimer: any = null;
  private readonly STORAGE_KEY = 'ssui_ws_endpoint';

  // State signals
  readonly status = signal<ConnectionStatus>('connected');
  readonly wsUrl = signal<string>(this.loadEndpoint());
  readonly isConnected = computed(() => this.status() === 'connected');

  // Message stream
  private messageSubject = new Subject<WebSocketMessage>();
  readonly messages$: Observable<WebSocketMessage> = this.messageSubject.asObservable();

  constructor() {
    const endpoint = this.loadEndpoint();
    if (endpoint && endpoint.startsWith('wss://')) {
      this.connect(endpoint);
    }
  }

  private loadEndpoint(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(this.STORAGE_KEY) || '';
  }

  saveEndpoint(url: string) {
    const trimmed = url.trim();
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, trimmed);
    }
    this.wsUrl.set(trimmed);

    if (trimmed.startsWith('wss://')) {
      this.connect(trimmed);
    } else {
      this.disconnect();
      this.status.set('connected'); // Local mode
    }
  }

  connect(url: string) {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.status.set('connecting');

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.status.set('connected');
        this.send('sync_state', {});
      };

      this.socket.onmessage = (event) => {
        try {
          const parsed: WebSocketMessage = JSON.parse(event.data);
          this.messageSubject.next(parsed);
        } catch {
          // ignore
        }
      };

      this.socket.onclose = () => {
        this.status.set('disconnected');
        this.scheduleReconnect(url);
      };

      this.socket.onerror = () => {
        this.socket?.close();
      };
    } catch {
      this.status.set('disconnected');
      this.scheduleReconnect(url);
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  send(action: WebSocketMessage['action'], payload: any) {
    const msg: WebSocketMessage = {
      action,
      payload,
      timestamp: Date.now()
    };

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    } else {
      // Echo locally for instant reactive updates
      setTimeout(() => {
        this.messageSubject.next(msg);
      }, 20);
    }
  }

  private scheduleReconnect(url: string) {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.status() !== 'connected' && url.startsWith('wss://')) {
        this.connect(url);
      }
    }, 5000);
  }
}
