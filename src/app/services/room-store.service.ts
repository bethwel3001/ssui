import { Injectable, signal, computed } from '@angular/core';
import { Room } from '../models/room.model';
import { WebSocketService } from './websocket.service';

const INITIAL_ROOMS: Room[] = [
  {
    code: 'tech-meetup',
    name: 'Tech Meetup Nairobi',
    description: 'Live Q&A on modern web architectures, real-time apps, and developer workflows.',
    host: 'Bethwel',
    isQaOpen: true,
    activeCount: 42,
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    category: 'Tech'
  },
  {
    code: 'product-ama',
    name: 'Creator Tools Product AMA',
    description: 'Ask anything about upcoming feature drops, roadmap priorities, and feedback.',
    host: 'Sarah Jenkins',
    isQaOpen: true,
    activeCount: 29,
    createdAt: Date.now() - 1000 * 60 * 90,
    category: 'Product'
  },
  {
    code: 'angular-signals',
    name: 'Angular 21 & Signals Open Floor',
    description: 'Deep dive into reactive primitives, zoneless change detection, and state management.',
    host: 'Marcus Chen',
    isQaOpen: false, // Closed / Paused demo
    activeCount: 18,
    createdAt: Date.now() - 1000 * 60 * 150,
    category: 'Tech'
  },
  {
    code: 'open-mic',
    name: 'Community Open Floor',
    description: 'Open discussion space for community members to pitch ideas and ask questions.',
    host: 'Elena Rostova',
    isQaOpen: true,
    activeCount: 35,
    createdAt: Date.now() - 1000 * 60 * 200,
    category: 'Community'
  }
];

@Injectable({
  providedIn: 'root'
})
export class RoomStoreService {
  readonly rooms = signal<Room[]>(INITIAL_ROOMS);
  readonly activeRoom = signal<Room | null>(null);
  readonly isCreatorMode = signal<boolean>(false);

  // Active view: 'home' | 'room'
  readonly currentView = computed<'home' | 'room'>(() => {
    return this.activeRoom() ? 'room' : 'home';
  });

  constructor(private wsService: WebSocketService) {
    this.wsService.messages$.subscribe(msg => {
      if (msg.action === 'toggle_qa') {
        const { roomCode, isOpen } = msg.payload || {};
        if (roomCode) {
          this.rooms.update(list =>
            list.map(r => r.code === roomCode ? { ...r, isQaOpen: isOpen } : r)
          );
          if (this.activeRoom()?.code === roomCode) {
            this.activeRoom.update(r => r ? { ...r, isQaOpen: isOpen } : null);
          }
        }
      }
    });
  }

  joinRoom(code: string): boolean {
    const clean = code.trim().toLowerCase().replace(/^#/, '');
    if (!clean) return false;

    const existing = this.rooms().find(r => r.code.toLowerCase() === clean);
    if (existing) {
      this.activeRoom.set(existing);
      this.isCreatorMode.set(existing.host === 'Bethwel'); // Creator if matching demo user
      return true;
    } else {
      // Auto-create room if entering an unlisted code (like Slido / Mentimeter)
      const newRoom: Room = {
        code: clean,
        name: clean.charAt(0).toUpperCase() + clean.slice(1) + ' Q&A Space',
        description: 'Instant live Q&A room created by code ' + clean,
        host: 'Room Creator',
        isQaOpen: true,
        activeCount: 1,
        createdAt: Date.now(),
        category: 'General'
      };
      this.rooms.update(prev => [newRoom, ...prev]);
      this.activeRoom.set(newRoom);
      this.isCreatorMode.set(true);
      return true;
    }
  }

  createRoom(name: string, customCode: string, host: string, description: string): Room {
    const cleanCode = (customCode.trim() || name.trim())
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'room-' + Math.floor(Math.random() * 899 + 100);

    const newRoom: Room = {
      code: cleanCode,
      name: name.trim() || 'Live Q&A Session',
      description: description.trim() || 'Real-time discussion room',
      host: host.trim() || 'Host',
      isQaOpen: true,
      activeCount: 1,
      createdAt: Date.now(),
      category: 'General'
    };

    this.rooms.update(prev => [newRoom, ...prev.filter(r => r.code !== newRoom.code)]);
    this.activeRoom.set(newRoom);
    this.isCreatorMode.set(true); // Creator of this new room!
    return newRoom;
  }

  toggleQa(roomCode: string) {
    let nextState = false;
    this.rooms.update(list =>
      list.map(r => {
        if (r.code === roomCode) {
          nextState = !r.isQaOpen;
          return { ...r, isQaOpen: nextState };
        }
        return r;
      })
    );

    if (this.activeRoom()?.code === roomCode) {
      this.activeRoom.update(r => r ? { ...r, isQaOpen: nextState } : null);
    }

    this.wsService.send('toggle_qa', { roomCode, isOpen: nextState });
  }

  toggleCreatorMode() {
    this.isCreatorMode.update(val => !val);
  }

  leaveRoom() {
    this.activeRoom.set(null);
    this.isCreatorMode.set(false);
  }
}
