import { Injectable, signal, computed, inject } from '@angular/core';
import { Room } from '../models/room.model';
import { WebSocketService } from './websocket.service';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class RoomStoreService {
  private wsService = inject(WebSocketService);
  private toastService = inject(ToastService);

  // Real backend rooms (Zero hardcoded fake data)
  readonly rooms = signal<Room[]>([]);
  readonly activeRoom = signal<Room | null>(null);
  readonly isCreatorMode = signal<boolean>(false);
  readonly isLoadingRooms = signal<boolean>(false);
  readonly roomError = signal<string | null>(null);

  // Active view: 'home' | 'room'
  readonly currentView = computed<'home' | 'room'>(() => {
    return this.activeRoom() ? 'room' : 'home';
  });

  constructor() {
    this.wsService.messages$.subscribe(msg => this.handleMessage(msg));

    // When connection opens or URL changes, fetch rooms from backend
    if (this.wsService.isConnected()) {
      this.fetchRooms();
    }
  }

  fetchRooms() {
    this.isLoadingRooms.set(true);
    this.roomError.set(null);

    const sent = this.wsService.send('list_rooms', {});
    if (!sent) {
      this.isLoadingRooms.set(false);
      this.roomError.set('No active connection to backend.');
    }
  }

  joinRoom(code: string): boolean {
    const clean = code.trim().toLowerCase().replace(/^#/, '');
    if (!clean) return false;

    // Check if room exists in current state or request from backend
    const existing = this.rooms().find(r => r.code.toLowerCase() === clean);
    if (existing) {
      this.activeRoom.set(existing);
      // Request active room questions & poll sync
      this.wsService.send('sync_state', { roomCode: existing.code });
      return true;
    }

    // If not in memory yet, send sync_state to backend to see if room exists on DynamoDB
    this.activeRoom.set({
      code: clean,
      name: clean.charAt(0).toUpperCase() + clean.slice(1),
      description: 'Loading room data from backend...',
      host: 'Host',
      isQaOpen: true,
      activeCount: 1,
      createdAt: Date.now(),
      category: 'General'
    });

    const sent = this.wsService.send('sync_state', { roomCode: clean });
    if (!sent) {
      this.toastService.error(`Could not join #${clean}. Check backend connection.`);
    }
    return true;
  }

  createRoom(name: string, customCode: string, host: string, description: string) {
    const cleanCode = (customCode.trim() || name.trim())
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'room-' + Math.floor(Math.random() * 899 + 100);

    const newRoom: Room = {
      code: cleanCode,
      name: name.trim(),
      description: description.trim() || 'Live Q&A space',
      host: host.trim() || 'Host',
      isQaOpen: true,
      activeCount: 1,
      createdAt: Date.now(),
      category: 'General'
    };

    const sent = this.wsService.send('create_room', newRoom);
    if (sent) {
      // Optimistically open room for creator
      this.rooms.update(prev => [newRoom, ...prev.filter(r => r.code !== newRoom.code)]);
      this.activeRoom.set(newRoom);
      this.isCreatorMode.set(true);
      this.toastService.success(`Room #${newRoom.code} created successfully.`);
    }
  }

  toggleQa(roomCode: string) {
    const room = this.activeRoom();
    if (!room) return;

    const nextState = !room.isQaOpen;
    const sent = this.wsService.send('toggle_qa', { roomCode, isOpen: nextState });

    if (sent) {
      this.rooms.update(list =>
        list.map(r => r.code === roomCode ? { ...r, isQaOpen: nextState } : r)
      );
      this.activeRoom.update(r => r ? { ...r, isQaOpen: nextState } : null);
      this.toastService.info(`Q&A is now ${nextState ? 'open for questions' : 'paused by host'}.`);
    }
  }

  leaveRoom() {
    this.activeRoom.set(null);
    this.isCreatorMode.set(false);
  }

  private handleMessage(msg: any) {
    switch (msg.action) {
      case 'list_rooms': {
        this.isLoadingRooms.set(false);
        if (Array.isArray(msg.payload?.rooms)) {
          this.rooms.set(msg.payload.rooms);
          this.roomError.set(null);
        }
        break;
      }
      case 'create_room': {
        const room = msg.payload as Room;
        if (room && room.code) {
          this.rooms.update(list => [room, ...list.filter(r => r.code !== room.code)]);
        }
        break;
      }
      case 'toggle_qa': {
        const { roomCode, isOpen } = msg.payload || {};
        if (roomCode) {
          this.rooms.update(list =>
            list.map(r => r.code === roomCode ? { ...r, isQaOpen: isOpen } : r)
          );
          if (this.activeRoom()?.code === roomCode) {
            this.activeRoom.update(r => r ? { ...r, isQaOpen: isOpen } : null);
            this.toastService.info(`Host ${isOpen ? 'opened' : 'paused'} Q&A submissions.`);
          }
        }
        break;
      }
      case 'error': {
        this.isLoadingRooms.set(false);
        const errMessage = msg.payload?.message || 'Backend returned an error.';
        this.roomError.set(errMessage);
        this.toastService.error(errMessage);
        break;
      }
      case 'success': {
        const successMsg = msg.payload?.message || 'Operation succeeded.';
        this.toastService.success(successMsg);
        break;
      }
    }
  }
}
