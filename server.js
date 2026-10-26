import express from 'express';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const DB_FILE = process.env.DB_FILE || 'projet-ados.db';
const MAX_AMOUNT = 10_000_000;

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  montant INTEGER NOT NULL CHECK (montant > 0),
  created_at INTEGER NOT NULL
)`);

db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
// Par défaut les dépôts sont FERMÉS : seul toi (finance) peux les ouvrir.
db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('open', '0')`).run();
const isOpen = () => db.prepare(`SELECT value FROM settings WHERE key = 'open'`).get().value === '1';
const setOpen = open => db.prepare(`UPDATE settings SET value = ? WHERE key = 'open'`).run(open ? '1' : '0');

const q = {
  insert: db.prepare('INSERT INTO deposits (montant, created_at) VALUES (?, ?)'),
  list: db.prepare('SELECT id, montant, created_at AS date FROM deposits ORDER BY created_at, id'),
  remove: db.prepare('DELETE FROM deposits WHERE id = ?'),
  totals: db.prepare('SELECT COUNT(*) AS count, COALESCE(SUM(montant),0) AS total, COALESCE(MAX(montant),0) AS max, COALESCE(AVG(montant),0) AS average FROM deposits'),
  perDay: db.prepare(`SELECT date(created_at/1000,'unixepoch') AS day, COUNT(*) AS count, SUM(montant) AS total FROM deposits GROUP BY day ORDER BY day`),
};

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '1kb' }));
app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), 'public')));

// Anti-spam : 20 dépôts par minute et par adresse IP
const hits = new Map();
function rateLimit(req, res, next) {
  const now = Date.now();
  const recent = (hits.get(req.ip) || []).filter(t => now - t < 60_000);
  if (recent.length >= 20) return res.status(429).json({ error: 'Trop de dépôts, attends une minute.' });
  hits.set(req.ip, [...recent, now]);
  next();
}

// Accès réservé à la finance : en-tête  Authorization: Bearer <ADMIN_TOKEN>
function admin(req, res, next) {
  if (!ADMIN_TOKEN) return res.status(503).json({ error: 'ADMIN_TOKEN non défini sur le serveur.' });
  const given = Buffer.from((req.get('authorization') || '').replace(/^Bearer /, ''));
  const wanted = Buffer.from(ADMIN_TOKEN);
  if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) {
    return res.status(401).json({ error: 'Accès refusé.' });
  }
  next();
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Public : savoir si les dépôts sont ouverts
app.get('/api/status', (_req, res) => res.json({ open: isOpen() }));

// Finance : ouvrir ou fermer les dépôts  {"open": true|false}
app.put('/api/status', admin, (req, res) => {
  if (typeof req.body?.open !== 'boolean') return res.status(400).json({ error: 'Envoie {"open": true} ou {"open": false}.' });
  setOpen(req.body.open);
  res.json({ open: isOpen() });
});

// Public : enregistrer un montant (aucun nom stocké)
app.post('/api/deposits', rateLimit, (req, res) => {
  if (!isOpen()) return res.status(403).json({ error: 'Les dépôts sont fermés pour le moment.' });
  const montant = Number(req.body?.montant);
  if (!Number.isInteger(montant) || montant < 1 || montant > MAX_AMOUNT) {
    return res.status(400).json({ error: `Montant invalide (1 à ${MAX_AMOUNT}).` });
  }
  const info = q.insert.run(montant, Date.now());
  res.status(201).json({ id: info.lastInsertRowid, montant });
});

// Public : liste anonyme des montants, pour tracer le graphique
app.get('/api/deposits', (_req, res) => res.json({ deposits: q.list.all() }));

// Public : statistiques globales
app.get('/api/stats', (_req, res) => {
  const t = q.totals.get();
  res.json({ ...t, average: Math.round(t.average), perDay: q.perDay.all() });
});

// Finance : export CSV pour Excel
app.get('/api/export.csv', admin, (_req, res) => {
  const lines = q.list.all().map(r => `${r.id},${r.montant},${new Date(r.date).toISOString()}`);
  res.type('text/csv').send(['id,montant,date', ...lines].join('\n'));
});

// Finance : corriger une erreur de saisie
app.delete('/api/deposits/:id', admin, (req, res) => {
  const info = q.remove.run(Number(req.params.id));
  res.status(info.changes ? 200 : 404).json({ deleted: info.changes });
});

app.listen(PORT, () => console.log(`Projet Ados : http://localhost:${PORT}`));
