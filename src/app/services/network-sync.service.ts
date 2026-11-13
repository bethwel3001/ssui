import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { OfflineStorageService } from './offline-storage.service';
import { WebSocketService } from './websocket.service';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class NetworkSyncService implements OnDestroy {
  private offlineStorage = inject(OfflineStorageService);
  private wsService = inject(WebSocketService);
  private toastService = inject(ToastService);

  // Network status tracking: Signal & RxJS BehaviorSubject
  private readonly initialStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;
  readonly isOnline = signal<boolean>(this.initialStatus);
  readonly isOnline$ = new BehaviorSubject<boolean>(this.initialStatus);

  // Emits IDs of offline questions that have been successfully replayed/synced
  readonly syncedQuestions$ = new Subject<string[]>();

  // Sync state tracking
  readonly isSyncing = signal<boolean>(false);

  private onlineListener?: () => void;
  private offlineListener?: () => void;

  constructor() {
    this.initNetworkListeners();
  }

  /**
   * Listens to native browser 'online' and 'offline' events
   */
  private initNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    this.onlineListener = () => this.handleOnline();
    this.offlineListener = () => this.handleOffline();

    window.addEventListener('online', this.onlineListener);
    window.addEventListener('offline', this.offlineListener);
  }

  /**
   * Invoked when browser fires 'offline' event
   */
  private handleOffline(): void {
    this.isOnline.set(false);
    this.isOnline$.next(false);
    this.toastService.error('Network connection lost. Offline mode active.');
  }

  /**
   * Invoked when browser fires 'online' event
   */
  private async handleOnline(): Promise<void> {
    this.isOnline.set(true);
    this.isOnline$.next(true);
    this.toastService.info('Network connection restored. Syncing offline data...');

    // Automatically trigger queue sync when coming back online
    await this.syncOfflineQuestions();
  }

  /**
   * Routes a question to OfflineStorageService if offline or if WebSocket
   * is unavailable, otherwise pushes immediately via WebSocket.
   *
   * @param questionPayload Question data to submit
   * @returns Object indicating if question was sent live or queued offline
   */
  async submitQuestion(questionPayload: any): Promise<{ queued: boolean; success: boolean }> {
    // 1. If explicitly offline, route directly to IndexedDB
    if (!this.isOnline()) {
      await this.offlineStorage.saveQuestionOffline(questionPayload);
      this.toastService.info('Question saved offline in IndexedDB. Will sync once reconnected.');
      return { queued: true, success: true };
    }

    // 2. If online, attempt WebSocket dispatch
    const sent = this.wsService.send('send_question', questionPayload);
    if (sent) {
      return { queued: false, success: true };
    }

    // 3. Fallback: If WebSocket connection is not ready or failed, route to offline storage
    try {
      await this.offlineStorage.saveQuestionOffline(questionPayload);
      this.toastService.info('Real-time connection unavailable. Question queued locally in IndexedDB.');
      return { queued: true, success: true };
    } catch (err: any) {
      this.toastService.error(`Failed to store question offline: ${err?.message || 'Storage error'}`);
      return { queued: false, success: false };
    }
  }

  /**
   * Retrieves offline questions from IndexedDB, ensures the WebSocket connection
   * is open (with timeout and retry handling), and pushes queued questions to AWS API Gateway.
   */
  async syncOfflineQuestions(): Promise<void> {
    if (this.isSyncing()) return;
    this.isSyncing.set(true);

    try {
      // 1. Check if WebSocket connection is ready or wait for it
      const isReady = await this.waitForWebSocketReady(15000, 300);
      if (!isReady) {
        this.toastService.error(
          'Real-time connection not ready yet. Queued questions remain safely in IndexedDB and will sync shortly.'
        );
        return;
      }

      // 2. Retrieve and clear cached questions from IndexedDB
      const offlineQuestions = await this.offlineStorage.getAndClearOfflineQuestions();
      if (!offlineQuestions || offlineQuestions.length === 0) {
        return;
      }

      let successCount = 0;
      const syncedIds: string[] = [];
      const failedToReplay: any[] = [];

      // 3. Iterate through cached questions and dispatch to AWS WebSocket
      for (let i = 0; i < offlineQuestions.length; i++) {
        const question = offlineQuestions[i];

        // Clean internal storage metadata before transmitting if needed
        const payloadToSend = { ...question };
        delete payloadToSend.queuedAt;

        const sent = this.wsService.send('send_question', payloadToSend);

        if (sent) {
          successCount++;
          if (question.id) {
            syncedIds.push(question.id);
          }
        } else {
          // If socket disconnected mid-flight, collect remaining items to restore in IndexedDB
          failedToReplay.push(...offlineQuestions.slice(i));
          break;
        }
      }

      // 4. If any items failed mid-flight, put them back into IndexedDB so no data is lost
      if (failedToReplay.length > 0) {
        for (const failedItem of failedToReplay) {
          await this.offlineStorage.saveQuestionOffline(failedItem);
        }
        this.toastService.error(
          `Connection interrupted. ${failedToReplay.length} question(s) restored to offline storage.`
        );
      }

      // 5. Notify user and listeners of successful sync
      if (successCount > 0) {
        this.syncedQuestions$.next(syncedIds);
        this.toastService.success(
          `Synced ${successCount} offline question${successCount > 1 ? 's' : ''} to live discussion room!`
        );
      }
    } catch (err: any) {
      this.toastService.error(`Sync error: ${err?.message || 'Failed to synchronize offline questions'}`);
    } finally {
      this.isSyncing.set(false);
    }
  }

  /**
   * Helper that polls and waits for WebSocketService to reach 'connected' state.
   * If disconnected but has an endpoint configured, prompts reconnection.
   *
   * @param timeoutMs Maximum time to wait in milliseconds
   * @param pollIntervalMs Interval between readiness checks
   * @returns Promise resolving true if connected, false if timed out
   */
  private async waitForWebSocketReady(timeoutMs = 15000, pollIntervalMs = 300): Promise<boolean> {
    const startTime = Date.now();

    // Trigger connect if URL is available and status is disconnected
    if (this.wsService.status() === 'disconnected' && this.wsService.wsUrl()) {
      this.wsService.connect(this.wsService.wsUrl());
    }

    while (Date.now() - startTime < timeoutMs) {
      if (this.wsService.isConnected()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    return this.wsService.isConnected();
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      if (this.onlineListener) {
        window.removeEventListener('online', this.onlineListener);
      }
      if (this.offlineListener) {
        window.removeEventListener('offline', this.offlineListener);
      }
    }
    this.isOnline$.complete();
  }
}
