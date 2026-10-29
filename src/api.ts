import type { Item } from './types';

const j = (r: Response) => {
  if (!r.ok) throw new Error('Erro na API');
  return r.json();
};
const h = { 'Content-Type': 'application/json' };
const send = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: h, body: body ? JSON.stringify(body) : undefined }).then(j);

export const api = {
  list: (): Promise<Item[]> => fetch('/api/items').then(j),
  add: (b: Partial<Item>): Promise<Item> => send('/api/items', 'POST', b),
  patch: (id: number, b: Partial<Item>): Promise<Item> => send(`/api/items/${id}`, 'PATCH', b),
  timer: (id: number, action: 'start' | 'pause'): Promise<Item> => send(`/api/items/${id}/timer`, 'POST', { action }),
  del: (id: number) => send(`/api/items/${id}`, 'DELETE'),
  photo: (id: number, file: File): Promise<Item> =>
  fetch(`/api/items/${id}/photo`, { method: 'POST', headers: { 'Content-Type': file.type }, body: file }).then(j),
};

