import express from 'express';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const db = new Database('amigurumi.db');
db.exec(`CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🧸',
  status TEXT NOT NULL DEFAULT 'quero',   -- quero | fazendo | pronto
  favorite INTEGER NOT NULL DEFAULT 0,
  seconds INTEGER NOT NULL DEFAULT 0,     -- tempo já somado
  started_at INTEGER,                     -- ms do início do cronômetro (null = parado)
  notes TEXT NOT NULL DEFAULT ''
)`);

try { db.exec('ALTER TABLE items ADD COLUMN photo TEXT'); } catch {} // ignora se a coluna já existe
fs.mkdirSync('uploads', { recursive: true });
const app = express();
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const get = (id: number) => db.prepare('SELECT * FROM items WHERE id = ?').get(id);
const settle = (id: number) =>
  db.prepare(
    'UPDATE items SET seconds = seconds + CAST((? - started_at) / 1000 AS INTEGER), started_at = NULL WHERE id = ? AND started_at IS NOT NULL'
  ).run(Date.now(), id);

app.get('/api/items', (_q, r) => r.json(db.prepare('SELECT * FROM items ORDER BY id DESC').all()));

app.post('/api/items', (q, r) => {
  const { name, emoji = '🧸', status = 'quero' } = q.body;
  if (!name?.trim()) return r.status(400).json({ error: 'Nome obrigatório' });
  const info = db.prepare('INSERT INTO items (name, emoji, status) VALUES (?, ?, ?)').run(name.trim(), emoji, status);
  r.status(201).json(get(Number(info.lastInsertRowid)));
});

const CAMPOS = ['name', 'emoji', 'status', 'favorite', 'notes', 'seconds'];
app.patch('/api/items/:id', (q, r) => {
  const id = Number(q.params.id);
  if (!get(id)) return r.sendStatus(404);
  const ks = Object.keys(q.body).filter((k) => CAMPOS.includes(k));
  if (q.body.status === 'pronto') settle(id);
  if (ks.length)
    db.prepare(`UPDATE items SET ${ks.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...ks.map((k) => q.body[k]), id);
  r.json(get(id));
});

app.post('/api/items/:id/timer', (q, r) => {
  const id = Number(q.params.id);
  const it: any = get(id);
  if (!it) return r.sendStatus(404);
  if (q.body.action === 'start' && !it.started_at)
    db.prepare("UPDATE items SET started_at = ?, status = CASE WHEN status = 'quero' THEN 'fazendo' ELSE status END WHERE id = ?").run(Date.now(), id);
  else if (q.body.action === 'pause') settle(id);
  r.json(get(id));
});

app.post('/api/items/:id/photo', express.raw({ type: 'image/*', limit: '15mb' }), (q, r) => {
  const id = Number(q.params.id);
  const it: any = get(id);
  if (!it) return r.sendStatus(404);
  const ext = ({ 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[q.headers['content-type'] ?? ''] ?? 'jpg';
  const nome = `${id}-${Date.now()}.${ext}`;
  fs.writeFileSync(path.join('uploads', nome), q.body);
  if (it.photo) fs.rm(path.join('uploads', it.photo), { force: true }, () => {});
  db.prepare('UPDATE items SET photo = ? WHERE id = ?').run(nome, id);
  r.json(get(id));
});

app.delete('/api/items/:id', (q, r) => {
  const it: any = get(Number(q.params.id));
  if (it?.photo) fs.rm(path.join('uploads', it.photo), { force: true }, () => {});
  db.prepare('DELETE FROM items WHERE id = ?').run(Number(q.params.id));
  r.json({ ok: true });
});

app.use(express.static('dist'));
app.listen(3001, () => console.log('API em http://localhost:3001'));
