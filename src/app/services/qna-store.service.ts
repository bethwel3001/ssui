import { Injectable, signal, computed, inject } from '@angular/core';
import { Question, Poll, QuestionFilter, QuestionSort, WebSocketMessage } from '../models/qna.model';
import { WebSocketService } from './websocket.service';
import { RoomStoreService } from './room-store.service';

const INITIAL_QUESTIONS: Question[] = [
  // tech-meetup questions
  {
    id: 'q-1',
    roomCode: 'tech-meetup',
    author: 'Daniel Craig',
    content: 'How do you handle API Gateway WebSocket connection ID TTL cleanup in DynamoDB when clients abruptly disconnect?',
    category: 'Engineering',
    upvotes: 48,
    createdAt: Date.now() - 1000 * 60 * 25,
    isAnswered: false,
    isPinned: true
  },
  {
    id: 'q-2',
    roomCode: 'tech-meetup',
    author: 'Elena Rostova',
    content: 'Can we support custom domain mapping for public spaces without setting up separate SSL certificates?',
    category: 'Product',
    upvotes: 34,
    createdAt: Date.now() - 1000 * 60 * 50,
    isAnswered: false
  },
  {
    id: 'q-3',
    roomCode: 'tech-meetup',
    author: 'Marcus Chen',
    content: 'Why choose DynamoDB single-table design over traditional relational DB for connection pool tracking?',
    category: 'Engineering',
    upvotes: 21,
    createdAt: Date.now() - 1000 * 60 * 85,
    isAnswered: true
  },
  {
    id: 'q-4',
    roomCode: 'tech-meetup',
    author: 'Sarah Jenkins',
    content: 'Are Angular Signals fast enough to process burst WebSocket updates during high-traffic sessions without UI lag?',
    category: 'Engineering',
    upvotes: 19,
    createdAt: Date.now() - 1000 * 60 * 120,
    isAnswered: false
  },

  // product-ama questions
  {
    id: 'q-5',
    roomCode: 'product-ama',
    author: 'Alex Rivera',
    content: 'Will room creators be able to export questions and vote stats into CSV format?',
    category: 'Product',
    upvotes: 27,
    createdAt: Date.now() - 1000 * 60 * 30,
    isAnswered: false,
    isPinned: true
  },
  {
    id: 'q-6',
    roomCode: 'product-ama',
    author: 'Grace Hopper',
    content: 'Can we embed these interactive Q&A feeds directly into Notion or company wikis via iframe?',
    category: 'Design',
    upvotes: 18,
    createdAt: Date.now() - 1000 * 60 * 45,
    isAnswered: true
  },

  // angular-signals questions
  {
    id: 'q-7',
    roomCode: 'angular-signals',
    author: 'DevAttendee',
    content: 'What is the best way to handle WebSocket streams when converting from RxJS to Signals?',
    category: 'Engineering',
    upvotes: 15,
    createdAt: Date.now() - 1000 * 60 * 60,
    isAnswered: false
  },
  {
    id: 'q-msme-1',
    roomCode: 'msme-clinic',
    author: 'Amina',
    content: 'Which digital channel has helped you reach customers outside your neighbourhood?',
    category: 'Product',
    upvotes: 31,
    createdAt: Date.now() - 1000 * 60 * 18,
    isAnswered: false,
    isPinned: true
  },
  {
    id: 'q-msme-2',
    roomCode: 'msme-clinic',
    author: 'Peter',
    content: 'What records do larger buyers expect from a small supplier before the first order?',
    category: 'General',
    upvotes: 24,
    createdAt: Date.now() - 1000 * 60 * 28,
    isAnswered: false
  },
  {
    id: 'q-msme-3',
    roomCode: 'msme-clinic',
    author: 'Wanjiku',
    content: 'How can a business test demand before spending on new equipment or packaging?',
    category: 'Engineering',
    upvotes: 17,
    createdAt: Date.now() - 1000 * 60 * 36,
    isAnswered: false
  },
  {
    id: 'q-msme-4',
    roomCode: 'msme-clinic',
    author: 'Kevin',
    content: 'Which short business skill would make the biggest difference to your next sale?',
    category: 'General',
    upvotes: 12,
    createdAt: Date.now() - 1000 * 60 * 42,
    isAnswered: true
  }
];

const INITIAL_POLLS: Poll[] = [
  {
    id: 'poll-tech',
    roomCode: 'tech-meetup',
    question: 'Have you deployed serverless WebSockets in production?',
    isActive: true,
    totalVotes: 64,
    options: [
      { id: 'opt-1', text: 'Yes, in production', votes: 24 },
      { id: 'opt-2', text: 'Tested locally with Lambda', votes: 22 },
      { id: 'opt-3', text: 'First time seeing this setup', votes: 12 },
      { id: 'opt-4', text: 'Building one now (SSUI!)', votes: 6 }
    ]
  },
  {
    id: 'poll-product',
    roomCode: 'product-ama',
    question: 'Which export feature is most needed for your team?',
    isActive: true,
    totalVotes: 42,
    options: [
      { id: 'opt-p1', text: 'CSV spreadsheet export', votes: 20 },
      { id: 'opt-p2', text: 'Live API endpoint', votes: 14 },
      { id: 'opt-p3', text: 'PDF summary report', votes: 8 }
    ]
  },
  {
    id: 'poll-msme-clinic',
    roomCode: 'msme-clinic',
    question: 'What would help your business reach more customers next?',
    isActive: true,
    totalVotes: 38,
    options: [
      { id: 'opt-msme-1', text: 'Finding new buyers', votes: 16 },
      { id: 'opt-msme-2', text: 'Digital marketing skills', votes: 12 },
      { id: 'opt-msme-3', text: 'Meeting buyer standards', votes: 10 }
    ]
  }
];

@Injectable({
  providedIn: 'root'
})
export class QnaStoreService {
  private wsService = inject(WebSocketService);
  private roomStore = inject(RoomStoreService);

  readonly questions = signal<Question[]>(INITIAL_QUESTIONS);
  readonly filter = signal<QuestionFilter>('all');
  readonly searchQuery = signal<string>('');
  readonly sort = signal<QuestionSort>('upvotes');
  readonly polls = signal<Poll[]>(INITIAL_POLLS);

  private readonly UPVOTED_KEY = 'ssui_upvoted_ids';
  private readonly POLL_KEY = 'ssui_poll_vote';
  private readonly VOTER_KEY = 'ssui_voter_id';
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
            return q.upvotes >= 20;
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

  private getVoterId(): string {
    if (typeof window === 'undefined') return 'server-side-voter-id';
    let voterId = localStorage.getItem(this.VOTER_KEY);
    if (!voterId) {
      voterId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().replace(/-/g, '')
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(this.VOTER_KEY, voterId);
    }
    return voterId;
  }

  private handleMessage(msg: WebSocketMessage) {
    switch (msg.action) {
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
      case 'vote_poll': {
        const { optionId, poll } = msg.payload || {};
        if (poll) {
          this.polls.update(list => [poll, ...list.filter(p => p.id !== poll.id)]);
        } else if (optionId) {
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
      case 'sync_state': {
        if (msg.payload?.questions) {
          const roomCode = msg.payload.roomCode;
          this.questions.update(current => roomCode
            ? [...current.filter(q => q.roomCode !== roomCode), ...msg.payload.questions]
            : msg.payload.questions);
        }
        if (msg.payload?.roomCode) {
          const { roomCode, poll, polls } = msg.payload;
          this.polls.update(current => [
            ...current.filter(p => p.roomCode !== roomCode),
            ...(polls ?? (poll ? [poll] : [])),
          ]);
        }
        break;
      }
      case 'create_poll': {
        const poll = msg.payload?.poll;
        if (poll) this.polls.update(list => [poll, ...list.filter(p => p.id !== poll.id)]);
        break;
      }
      case 'pin_question': {
        const { questionId, isPinned } = msg.payload || {};
        if (questionId) this.questions.update(list => list.map(q => q.id === questionId ? { ...q, isPinned: !!isPinned } : q));
        break;
      }
      case 'delete_question': {
        const { questionId } = msg.payload || {};
        if (questionId) this.questions.update(list => list.filter(q => q.id !== questionId));
        break;
      }
    }
  }

  askQuestion(content: string, author: string, category: Question['category']) {
    const trimmed = content.trim();
    if (!trimmed) return;

    const currentRoom = this.roomStore.activeRoom();
    const roomCode = currentRoom?.code || 'general';

    const newQuestion: Question = {
      id: 'q-' + Date.now().toString(36),
      roomCode,
      author: author.trim() || 'Anonymous',
      content: trimmed,
      category,
      upvotes: 1,
      createdAt: Date.now(),
      isAnswered: false
    };

    const upvoted = new Set(this.userUpvotedIds());
    upvoted.add(newQuestion.id);
    this.userUpvotedIds.set(upvoted);
    this.saveUpvotedSet(upvoted);

    this.questions.update(prev => [newQuestion, ...prev]);
    this.wsService.send('send_question', newQuestion);
  }

  upvote(questionId: string) {
    const upvoted = new Set(this.userUpvotedIds());
    if (upvoted.has(questionId)) return;
    upvoted.add(questionId);
    const updatedQuestions = this.questions().map(q =>
      q.id === questionId ? { ...q, upvotes: q.upvotes + 1 } : q
    );

    this.userUpvotedIds.set(upvoted);
    this.saveUpvotedSet(upvoted);
    this.questions.set(updatedQuestions);

    const target = updatedQuestions.find(q => q.id === questionId);
    this.wsService.send('upvote_question', {
      questionId,
      newCount: target?.upvotes ?? 0,
      voterId: this.getVoterId()
    });
  }

  toggleAnswered(questionId: string) {
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
    this.wsService.send('mark_answered', { questionId, isAnswered: newStatus, hostToken: this.roomStore.hostTokenFor(this.roomStore.activeRoom()?.code) });
  }

  togglePinned(questionId: string) {
    let isPinned = false;
    this.questions.update(prev =>
      prev.map(q => {
        if (q.id !== questionId) return q;
        isPinned = !q.isPinned;
        return { ...q, isPinned };
      })
    );
    this.wsService.send('pin_question', { questionId, isPinned, hostToken: this.roomStore.hostTokenFor(this.roomStore.activeRoom()?.code) });
  }

  deleteQuestion(questionId: string) {
    this.questions.update(prev => prev.filter(q => q.id !== questionId));
    this.wsService.send('delete_question', { questionId, hostToken: this.roomStore.hostTokenFor(this.roomStore.activeRoom()?.code) });
  }

  votePoll(optionId: string) {
    if (this.userVotedOptionId()) return;

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

    this.wsService.send('vote_poll', { optionId });
  }
}
