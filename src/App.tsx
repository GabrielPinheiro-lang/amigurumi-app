import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from './api';
import type { Item, Status } from './types';

const CATEGORIAS = [
  { emoji: '🐾', nome: 'Animal' },
  { emoji: '🦸', nome: 'Herói' },
  { emoji: '🎌', nome: 'Anime' },
  { emoji: '🧙', nome: 'Fantasia' },
  { emoji: '🎮', nome: 'Games' },
  { emoji: '🎬', nome: 'Filme e série' },
  { emoji: '🤖', nome: 'Robô' },
  { emoji: '👻', nome: 'Monstrinho' },
  { emoji: '🍓', nome: 'Comidinha' },
  { emoji: '🌸', nome: 'Planta e flor' },
  { emoji: '🧸', nome: 'Outro' },
];
const TITULOS: Record<Status, string> = { fazendo: 'Na agulha agora', quero: 'Quero fazer', pronto: 'Prontinhos' };

const total = (i: Item, now: number) => i.seconds + (i.started_at ? Math.max(0, Math.floor((now - i.started_at) / 1000)) : 0);
const fmt = (s: number, seg = false) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (seg) return `${h}h ${String(m).padStart(2, '0')}min ${String(s % 60).padStart(2, '0')}s`;
  return h ? `${h}h ${m}min` : `${m}min`;
};

interface Acoes { fav: (i: Item) => void; timer: (i: Item) => void; pronto: (i: Item) => void; del: (i: Item) => void
  foto: (i: Item, f: File)  => void;
 }

function Card({ i, now, on }: { i: Item; now: number; on: Acoes }) {
  const [pula, setPula] = useState(false);
  const [grande, setGrande] = useState(false);
  const [certeza, setCerteza] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rodando = !!i.started_at;
  return (
    <article className="card" data-cor={i.id % 4}>
      <button className={'coracao' + (i.favorite ? ' on' : '')} aria-pressed={!!i.favorite}
        aria-label={i.favorite ? 'Tirar dos favoritos' : 'Favoritar'} onClick={() => on.fav(i)}>
        {i.favorite ? '💖' : '🤍'}
      </button>

      <button className={'bola' + (pula ? ' pula' : '')} aria-label={i.photo ? `Ver foto de ${i.name}` : `Brincar com ${i.name}`}
    onClick={() => (i.photo ? setGrande(true) : (setPula(true), setTimeout(() => setPula(false), 600)))}>
    {i.photo ? <img src={`/uploads/${i.photo}`} alt={i.name} /> : i.emoji}
      </button>

      <h3>{i.name}</h3>
      <p className="categoria">{CATEGORIAS.find((c) => c.emoji === i.emoji)?.nome}</p>
      <p className="tempo">⏱ {fmt(total(i, now), rodando)}</p>
      <div className="acoes">
        {i.status !== 'pronto' && <button onClick={() => on.timer(i)}>{rodando ? 'Pausar' : 'Começar a crochetar'}</button>}
        {i.status !== 'pronto' && <button className="ok" onClick={() => on.pronto(i)}>Terminei!</button>}
        <button onClick={() => inputRef.current?.click()}>📷 {i.photo ? 'Trocar foto' : 'Foto'}</button>
    <input ref={inputRef} type="file" accept="image/*" hidden
    onChange={(e) => { const f = e.target.files?.[0]; if (f) on.foto(i, f); e.target.value = ''; }} />
        <button className="lixo" aria-label={certeza ? `Confirmar exclusão de ${i.name}` : `Excluir ${i.name}`}
  onClick={() => {
    if (certeza) on.del(i);
    else { setCerteza(true); setTimeout(() => setCerteza(false), 3000); }
  }}>
  {certeza ? 'Excluir mesmo?' : '🗑'}
</button>
      </div>
      {grande && i.photo && (
  <div className="lightbox" role="dialog" aria-label={`Foto de ${i.name}`} onClick={() => setGrande(false)}>
    <img src={`/uploads/${i.photo}`} alt={i.name} />
    <p>{i.name}</p>
  </div>
)}
    </article>
  );
}

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [aba, setAba] = useState<'prateleira' | 'favoritos' | 'numeros'>('prateleira');
  const [now, setNow] = useState(Date.now());
  const [nome, setNome] = useState('');
  const [emoji, setEmoji] = useState(CATEGORIAS[0].emoji);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.list().then(setItems).catch(() => setErro('Não consegui falar com o servidor. Ele está rodando?'));
  }, []);
  const rodando = items.some((i) => i.started_at);
  useEffect(() => {
    if (!rodando) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [rodando]);

  const troca = (n: Item) => { setNow(Date.now()); setItems((l) => l.map((i) => (i.id === n.id ? n : i))); };
  const on: Acoes = {
    foto: (i, f) => api.photo(i.id, f).then(troca),
    fav: (i) => api.patch(i.id, { favorite: i.favorite ? 0 : 1 }).then(troca),
    timer: (i) => api.timer(i.id, i.started_at ? 'pause' : 'start').then(troca),
    pronto: (i) => api.patch(i.id, { status: 'pronto' }).then(troca),
    del: (i) => {
  api.del(i.id)
    .then(() => setItems((l) => l.filter((x) => x.id !== i.id)))
    .catch(() => setErro('Não consegui excluir. Veja a mensagem no terminal do servidor.'));
},
  };
  const adicionar = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    const novo = await api.add({ name: nome, emoji });
    setItems((l) => [novo, ...l]);
    setNome('');
    setAba('prateleira');
  };

  const prateleira = (titulo: string, lista: Item[]) => (
    <section className="secao" key={titulo}>
      <h2>{titulo} <span className="qtd">{lista.length}</span></h2>
      <div className="prateleira">
        {lista.length ? lista.map((i) => <Card key={i.id} i={i} now={now} on={on} />)
          : <p className="vazio">Nada por aqui ainda. Adicione um amigurumi lá em cima!</p>}
      </div>
    </section>
  );

  const prontos = items.filter((i) => i.status === 'pronto');
  const tempos = prontos.map((i) => total(i, now)).filter((s) => s > 0).sort((a, b) => a - b);
  const numeros: [string, string, string][] = [
    ['🧸', 'Prontinhos', String(prontos.length)],
    ['🧶', 'Ainda para fazer', String(items.length - prontos.length)],
    ['⏱', 'Horas de crochê', fmt(items.reduce((a, i) => a + total(i, now), 0))],
    ['💖', 'Favoritos', String(items.filter((i) => i.favorite).length)],
    ['🐇', 'Mais rápido', tempos.length ? fmt(tempos[0]) : '—'],
    ['🐢', 'Mais demorado', tempos.length ? fmt(tempos[tempos.length - 1]) : '—'],
  ];

  return (
    <main>
      <header className="topo">
        <h1>Amigurumis da Evellyn</h1>
        <div className="fio" />
      </header>

      <form className="novo" onSubmit={adicionar}>
        <select value={emoji} onChange={(e) => setEmoji(e.target.value)} aria-label="Escolher categoria">
          {CATEGORIAS.map((c) => <option key={c.emoji} value={c.emoji}>{c.emoji} {c.nome}</option>)}
        </select>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do próximo amigurumi" aria-label="Nome do amigurumi" />
        <button type="submit">Adicionar à cestinha</button>
      </form>

      <nav className="abas">
        {([['prateleira', '🧺 Prateleira'], ['favoritos', '💖 Favoritos'], ['numeros', '📊 Números']] as const).map(([k, t]) => (
          <button key={k} className="aba" aria-pressed={aba === k} onClick={() => setAba(k)}>{t}</button>
        ))}
      </nav>

      {erro && <p className="erro">{erro}</p>}
      {aba === 'numeros' ? (
        <div className="numeros">
          {numeros.map(([e, t, v]) => (
            <div className="novelo" key={t}><span>{e}</span><strong>{v}</strong><small>{t}</small></div>
          ))}
        </div>
      ) : aba === 'favoritos' ? prateleira('Meus favoritos', items.filter((i) => i.favorite))
        : (['fazendo', 'quero', 'pronto'] as Status[]).map((s) => prateleira(TITULOS[s], items.filter((i) => i.status === s)))}
    </main>
  );
}
