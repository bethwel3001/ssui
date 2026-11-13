import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class OfflineStorageService {
  private readonly DB_NAME = 'ssui-offline-db';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'offline-questions';

  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initializes or returns the cached IndexedDB instance
   */
  private getDb(): Promise<IDBDatabase> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return Promise.reject(new Error('IndexedDB is not supported in this environment.'));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.STORE_NAME)) {
            // Create object store with auto-incrementing key
            db.createObjectStore(this.STORE_NAME, { autoIncrement: true });
          }
        };

        request.onsuccess = () => {
          const db = request.result;

          db.onversionchange = () => {
            db.close();
            this.dbPromise = null;
          };

          resolve(db);
        };

        request.onerror = () => {
          this.dbPromise = null;
          reject(request.error || new Error('Failed to open IndexedDB database.'));
        };
      });
    }

    return this.dbPromise;
  }

  /**
   * Adds a question payload to the 'offline-questions' IndexedDB object store.
   *
   * @param questionPayload The question object or payload to store offline
   */
  async saveQuestionOffline(questionPayload: any): Promise<void> {
    const db = await this.getDb();

    return new Promise<void>((resolve, reject) => {
      try {
        const transaction = db.transaction(this.STORE_NAME, 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);

        const record = typeof questionPayload === 'object' && questionPayload !== null
          ? { ...questionPayload, queuedAt: questionPayload.queuedAt || Date.now() }
          : { payload: questionPayload, queuedAt: Date.now() };

        const request = store.add(record);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error('Failed to save question offline.'));
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Retrieves all stored offline questions and empties the 'offline-questions' store
   * in a single readwrite transaction.
   *
   * @returns Array of stored question payloads
   */
  async getAndClearOfflineQuestions(): Promise<any[]> {
    const db = await this.getDb();

    return new Promise<any[]>((resolve, reject) => {
      try {
        const transaction = db.transaction(this.STORE_NAME, 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);

        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          const records = getAllRequest.result || [];

          if (records.length === 0) {
            resolve([]);
            return;
          }

          const clearRequest = store.clear();
          clearRequest.onsuccess = () => resolve(records);
          clearRequest.onerror = () => reject(clearRequest.error || new Error('Failed to clear offline questions store.'));
        };

        getAllRequest.onerror = () => {
          reject(getAllRequest.error || new Error('Failed to retrieve offline questions.'));
        };

        transaction.onerror = () => {
          reject(transaction.error || new Error('Transaction failed while retrieving and clearing offline questions.'));
        };
      } catch (err) {
        reject(err);
      }
    });
  }
}
