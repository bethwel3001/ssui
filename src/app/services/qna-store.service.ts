import { Injectable, signal, computed, inject } from '@angular/core';
import { Question, Poll, QuestionFilter, QuestionSort, WebSocketMessage } from '../models/qna.model';
import { WebSocketService } from './websocket.service';
import { RoomStoreService } from './room-store.service';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class QnaStoreService {
  private wsService = inject(WebSocketService);
  private roomStore = inject(RoomStoreService);
  private toastService = inject(ToastService);

  // Real data signals (Zero hardcoded fake items)
  readonly questions = signal<Question[]>([]);
  readonly polls = signal<Poll[]>([]);
  readonly isLoadingQuestions = signal<boolean>(false);
  readonly questionError = signal<string | null>(null);

  readonly filter = signal<QuestionFilter>('all');
  readonly searchQuery = signal<string>('');
  readonly sort = signal<QuestionSort>('upvotes');

  private readonly UPVOTED_KEY = 'ssui_upvoted_ids';
  private readonly POLL_KEY = 'ssui_poll_vote';
  readonly userUpvotedIds = signal<Set<string>>(this.loadUpvotedSet());
  readonly userVotedOptionId = signal<string | null>(this.loadPollVote());

  // Questions for current active room
  readonly activeRoomQuestions = computed(() => {
    const room = this.roomStore.activeRoom();
    if (!room) return [];
    return this.questions().filter(q => q.roomCode === room.code);
  });

  // Poll for current active room
  readonly activeRoomPoll = computed(() => {
    const room = this.roomStore.activeRoom();
    if (!room) return null;
    return this.polls().find(p => p.roomCode === room.code) || null;
  });

  // Metrics for active room
  readonly totalQuestions = computed(() => this.activeRoomQuestions().length);
  readonly totalUpvotes = computed(() =>
    this.activeRoomQuestions().reduce((sum, q) => sum + q.upvotes, 0)
  );
  readonly answeredCount = computed(() =>
    this.activeRoomQuestions().filter(q => q.isAnswered).length
  );
  readonly unansweredCount = computed(() =>
    this.activeRoomQuestions().filter(q => !q.isAnswered).length
  );

  // Filtered & Sorted questions for active room
  readonly filteredQuestions = computed(() => {
    const list = this.activeRoomQuestions();
    const query = this.searchQuery().trim().toLowerCase();
    const activeFilter = this.filter();
    const sortBy = this.sort();

    return list
      .filter(q => {
        if (query) {
          const matchContent = q.content.toLowerCase().includes(query);
          const matchAuthor = q.author.toLowerCase().includes(query);
          const matchCat = q.category.toLowerCase().includes(query);
          if (!matchContent && !matchAuthor && !matchCat) return false;
        }

        switch (activeFilter) {
          case 'all':
            return true;
          case 'popular':
            return q.upvotes >= 10;
          case 'unanswered':
            return !q.isAnswered;
          case 'answered':
            return q.isAnswered;
          default:
            return q.category === activeFilter;
        }
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        if (sortBy === 'upvotes') {
          return b.upvotes - a.upvotes;
        } else if (sortBy === 'newest') {
          return b.createdAt - a.createdAt;
        } else {
          return a.createdAt - b.createdAt;
        }
      });
  });

  constructor() {
    this.wsService.messages$.subscribe(msg => this.handleMessage(msg));
  }

  private loadUpvotedSet(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(this.UPVOTED_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  private saveUpvotedSet(set: Set<string>) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.UPVOTED_KEY, JSON.stringify(Array.from(set)));
  }

  private loadPollVote(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.POLL_KEY);
  }

  askQuestion(content: string, author: string, category: Question['category']) {
    const trimmed = content.trim();
    if (!trimmed) return;

    const currentRoom = this.roomStore.activeRoom();
    if (!currentRoom) {
      this.toastService.error('You must join a room before submitting a question.');
      return;
    }

    if (!currentRoom.isQaOpen) {
      this.toastService.error('Q&A submissions are currently paused by the room creator.');
      return;
    }

    const newQuestion: Question = {
      id: 'q-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      roomCode: currentRoom.code,
      author: author.trim() || 'Anonymous',
      content: trimmed,
      category,
      upvotes: 1,
      createdAt: Date.now(),
      isAnswered: false
    };

    const sent = this.wsService.send('send_question', newQuestion);
    if (sent) {
      const upvoted = new Set(this.userUpvotedIds());
      upvoted.add(newQuestion.id);
      this.userUpvotedIds.set(upvoted);
      this.saveUpvotedSet(upvoted);

      this.questions.update(prev => [newQuestion, ...prev]);
      this.toastService.success('Question submitted successfully.');
    }
  }

  upvote(questionId: string) {
    const currentRoom = this.roomStore.activeRoom();
    const upvoted = new Set(this.userUpvotedIds());
    const hasVoted = upvoted.has(questionId);

    let updatedQuestions: Question[] = [];

    if (hasVoted) {
      upvoted.delete(questionId);
      updatedQuestions = this.questions().map(q =>
        q.id === questionId ? { ...q, upvotes: Math.max(0, q.upvotes - 1) } : q
      );
    } else {
      upvoted.add(questionId);
      updatedQuestions = this.questions().map(q =>
        q.id === questionId ? { ...q, upvotes: q.upvotes + 1 } : q
      );
    }

    this.userUpvotedIds.set(upvoted);
    this.saveUpvotedSet(upvoted);
    this.questions.set(updatedQuestions);

    const target = updatedQuestions.find(q => q.id === questionId);
    this.wsService.send('upvote_question', {
      questionId,
      roomCode: currentRoom?.code || '',
      newCount: target?.upvotes ?? 0
    });
  }

  toggleAnswered(questionId: string) {
    const currentRoom = this.roomStore.activeRoom();
    let newStatus = false;

    this.questions.update(prev =>
      prev.map(q => {
        if (q.id === questionId) {
          newStatus = !q.isAnswered;
          return { ...q, isAnswered: newStatus };
        }
        return q;
      })
    );

    const sent = this.wsService.send('mark_answered', { 
      questionId, 
      roomCode: currentRoom?.code || '',
      isAnswered: newStatus 
    });

    if (sent) {
      this.toastService.info(`Question marked as ${newStatus ? 'answered' : 'unanswered'}.`);
    }
  }

  togglePinned(questionId: string) {
    this.questions.update(prev =>
      prev.map(q => q.id === questionId ? { ...q, isPinned: !q.isPinned } : q)
    );
  }

  deleteQuestion(questionId: string) {
    const currentRoom = this.roomStore.activeRoom();
    this.questions.update(prev => prev.filter(q => q.id !== questionId));
    
    this.wsService.send('delete_question', { 
      questionId, 
      roomCode: currentRoom?.code || '' 
    });
    this.toastService.info('Question removed.');
  }

  votePoll(optionId: string) {
    const currentRoom = this.roomStore.activeRoom();
    if (this.userVotedOptionId()) {
      this.toastService.info('You have already submitted your response to this poll.');
      return;
    }

    this.userVotedOptionId.set(optionId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.POLL_KEY, optionId);
    }

    this.polls.update(list =>
      list.map(p => {
        if (p.options.some(o => o.id === optionId)) {
          return {
            ...p,
            totalVotes: p.totalVotes + 1,
            options: p.options.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o)
          };
        }
        return p;
      })
    );

    const sent = this.wsService.send('vote_poll', { 
      roomCode: currentRoom?.code || '', 
      optionId 
    });

    if (sent) {
      this.toastService.success('Poll vote recorded.');
    }
  }

  private handleMessage(msg: WebSocketMessage) {
    switch (msg.action) {
      case 'sync_state': {
        this.isLoadingQuestions.set(false);
        if (Array.isArray(msg.payload?.questions)) {
          this.questions.set(msg.payload.questions);
          this.questionError.set(null);
        }
        if (Array.isArray(msg.payload?.polls)) {
          this.polls.set(msg.payload.polls);
        } else if (msg.payload?.poll) {
          this.polls.set([msg.payload.poll]);
        }
        break;
      }
      case 'send_question': {
        const item = msg.payload as Question;
        if (item && item.id) {
          this.questions.update(prev => [item, ...prev.filter(x => x.id !== item.id)]);
        }
        break;
      }
      case 'upvote_question': {
        const { questionId, newCount } = msg.payload || {};
        if (questionId) {
          this.questions.update(prev =>
            prev.map(q => q.id === questionId ? { ...q, upvotes: newCount ?? q.upvotes + 1 } : q)
          );
        }
        break;
      }
      case 'mark_answered': {
        const { questionId, isAnswered } = msg.payload || {};
        if (questionId) {
          this.questions.update(prev =>
            prev.map(q => q.id === questionId ? { ...q, isAnswered: !!isAnswered } : q)
          );
        }
        break;
      }
      case 'delete_question': {
        const { questionId } = msg.payload || {};
        if (questionId) {
          this.questions.update(prev => prev.filter(q => q.id !== questionId));
        }
        break;
      }
      case 'vote_poll': {
        const { optionId } = msg.payload || {};
        if (optionId) {
          this.polls.update(list =>
            list.map(p => {
              if (p.options.some(o => o.id === optionId)) {
                return {
                  ...p,
                  totalVotes: p.totalVotes + 1,
                  options: p.options.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o)
                };
              }
              return p;
            })
          );
        }
        break;
      }
      case 'error': {
        this.isLoadingQuestions.set(false);
        const errMessage = msg.payload?.message || 'Error communicating with backend.';
        this.questionError.set(errMessage);
        this.toastService.error(errMessage);
        break;
      }
    }
  }
}
