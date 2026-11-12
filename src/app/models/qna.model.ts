export interface Question {
  id: string;
  roomCode: string;
  author: string;
  content: string;
  category: 'General' | 'Product' | 'Engineering' | 'Design';
  upvotes: number;
  createdAt: number;
  isAnswered: boolean;
  isPinned?: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  roomCode: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  isActive: boolean;
}

export type QuestionFilter = 'all' | 'popular' | 'unanswered' | 'answered' | 'General' | 'Product' | 'Engineering' | 'Design';
export type QuestionSort = 'upvotes' | 'newest' | 'oldest';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export interface WebSocketMessage<T = any> {
  action: 'send_question' | 'upvote_question' | 'mark_answered' | 'vote_poll' | 'broadcast' | 'sync_state' | 'toggle_qa' | 'ping';
  payload?: T;
  timestamp?: number;
}
