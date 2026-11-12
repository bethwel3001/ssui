import { Injectable, inject, signal, computed } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { ConnectionStatus, WebSocketMessage } from '../models/qna.model';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private toastService = inject(ToastService);
  private socket: WebSocket | null = null;
  private reconnectTimer: any = null;
  private readonly STORAGE_KEY = 'ssui_ws_endpoint';

  // Signals
  readonly status = signal<ConnectionStatus>('disconnected');
  readonly wsUrl = signal<string>(this.loadEndpoint());
  readonly isConnected = computed(() => this.status() === 'connected');

  // Incoming messages stream
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
      this.toastService.info('Connecting to AWS WebSocket...');
      this.connect(trimmed);
    } else {
      this.disconnect();
      this.status.set('disconnected');
    }
  }

  connect(url: string) {
    this.disconnect();
    this.status.set('connecting');

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.status.set('connected');
        this.toastService.success('Connected to AWS WebSocket.');
        // Request active rooms list on connection
        this.send('list_rooms', {});
      };

      this.socket.onmessage = (event) => {
        try {
          const parsed: WebSocketMessage = JSON.parse(event.data);
          this.messageSubject.next(parsed);
        } catch {
          console.warn('[WS] Received non-JSON payload:', event.data);
        }
      };

      this.socket.onclose = () => {
        if (this.status() === 'connected') {
          this.toastService.error('WebSocket connection closed.');
        }
        this.status.set('disconnected');
        this.scheduleReconnect(url);
      };

      this.socket.onerror = () => {
        this.status.set('disconnected');
        this.toastService.error('Failed to reach WebSocket server.');
        this.socket?.close();
      };
    } catch (err: any) {
      this.status.set('disconnected');
      this.toastService.error(`Connection failed: ${err?.message || 'Invalid endpoint'}`);
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

  send(action: WebSocketMessage['action'], payload: any): boolean {
    const msg: WebSocketMessage = {
      action,
      payload,
      timestamp: Date.now()
    };

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
      return true;
    } else {
      if (!this.wsUrl()) {
        this.toastService.error('No AWS WebSocket URL configured. Click the Settings icon in the navbar to connect.');
      } else {
        this.toastService.error('Backend unreachable. Reconnecting to AWS...');
      }
      return false;
    }
  }

  private scheduleReconnect(url: string) {
    if (this.reconnectTimer || !url.startsWith('wss://')) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.status() !== 'connected') {
        this.connect(url);
      }
    }, 6000);
  }
}
