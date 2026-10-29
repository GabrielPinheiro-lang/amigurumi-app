export type Status = 'quero' | 'fazendo' | 'pronto';
export interface Item {
  id: number;
  name: string;
  emoji: string;
  status: Status;
  favorite: 0 | 1;
  seconds: number;
  started_at: number | null;
  notes: string;
  photo: string | null;
}
