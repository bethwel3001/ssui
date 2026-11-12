export interface Room {
  code: string;
  name: string;
  description: string;
  host: string;
  isQaOpen: boolean;
  activeCount: number;
  createdAt: number;
  category: 'Tech' | 'Product' | 'Community' | 'General';
}
