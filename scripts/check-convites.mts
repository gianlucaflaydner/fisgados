/**
 * Testa convite e visibilidade entre contas, contra o projeto real (npm run nuvem:convites).
 * Precisa da migration 0002_convites.sql aplicada. Cria três usuários de teste @fisgados.app —
 * Ana (dona do convite), Bia (aceita) e Caio (estranho) — e no fim lista os e-mails para apagar
 * em Authentication > Users.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env: Record<string, string> = {};
for (const l of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(l);
  if (m && !l.trimStart().startsWith('#')) env[m[1]!] = m[2]!.trim();
}
const URL = env.EXPO_PUBLIC_SUPABASE_URL!;
const KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const novo = () => createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const ok = (b: boolean, t: string) => console.log(`${b ? 'ok  ' : 'FALHA'} ${t}`);

const ALFA = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const codigo = () => Array.from({ length: 6 }, () => ALFA[Math.floor(Math.random() * ALFA.length)]).join('');

async function criar(nome: string): Promise<{ sb: SupabaseClient; id: string; codigo: string; email: string }> {
  const sb = novo();
  const email = `${nome.toLowerCase()}-${Date.now()}@fisgados.app`;
  const { data, error } = await sb.auth.signUp({ email, password: 'senha-de-teste-123' });
  if (error || !data.session) throw new Error(`cadastro de ${nome}: ${error?.message}`);
  const c = codigo();
  const { error: e2 } = await sb.from('profiles').insert({ id: data.user!.id, display_name: nome, invite_code: c });
  if (e2) throw new Error(`perfil de ${nome}: ${e2.message}`);
  return { sb, id: data.user!.id, codigo: c, email };
}

const ana = await criar('Ana');
const bia = await criar('Bia');
const caio = await criar('Caio');

// Ana registra uma captura.
const catchId = crypto.randomUUID();
const agora = new Date().toISOString();
await ana.sb.from('catches').insert({
  id: catchId, user_id: ana.id, species_id: 'dourado', length_cm: 68, photo_path: `${ana.id}/${catchId}.jpg`,
  caught_at: agora, created_at: agora, updated_at: agora,
});

// ── antes do convite, ninguém vê a Ana ────────────────────────────────────────────
const antes = await bia.sb.from('catches').select('id').eq('id', catchId);
ok((antes.data ?? []).length === 0, 'antes do convite, a Bia não vê a captura da Ana');

// ── erros previstos ───────────────────────────────────────────────────────────────
const proprio = await ana.sb.rpc('aceitar_convite', { codigo: ana.codigo });
ok(proprio.error?.code === 'P0001', `aceitar o próprio código é recusado (${proprio.error?.code})`);

const inexistente = await bia.sb.rpc('aceitar_convite', { codigo: 'ZZZZZZ' });
ok(inexistente.error?.code === 'P0002', `código inexistente é recusado (${inexistente.error?.code})`);

const anonimo = await novo().rpc('aceitar_convite', { codigo: ana.codigo });
ok(Boolean(anonimo.error), `sem login a função é negada (${anonimo.error?.code})`);

// ── o convite ─────────────────────────────────────────────────────────────────────
const aceite = await bia.sb.rpc('aceitar_convite', { codigo: ana.codigo.toLowerCase() });
const linha = Array.isArray(aceite.data) ? aceite.data[0] : aceite.data;
ok(!aceite.error && linha?.amigo_id === ana.id, `Bia aceita o código da Ana (minúsculas também valem)`);
ok(linha?.amigo_nome === 'Ana', `a função devolve o nome de quem convidou (${linha?.amigo_nome})`);

const deNovo = await bia.sb.rpc('aceitar_convite', { codigo: ana.codigo });
ok(!deNovo.error, 'aceitar duas vezes não é erro');

// ── amizade nos dois sentidos ─────────────────────────────────────────────────────
const bVe = await bia.sb.from('catches').select('id').eq('id', catchId);
ok((bVe.data ?? []).length === 1, 'depois do convite, a Bia vê a captura da Ana');

const aVeLista = await ana.sb.from('friendships').select('friend_id').eq('user_id', ana.id);
ok((aVeLista.data ?? []).some((f) => f.friend_id === bia.id), 'a Ana também tem a Bia na lista — os dois sentidos');

const perfilDaAna = await bia.sb.from('profiles').select('display_name').eq('id', ana.id);
ok(perfilDaAna.data?.[0]?.display_name === 'Ana', 'a Bia lê o nome da Ana (política "perfil de amigo")');

// ── o estranho continua de fora ───────────────────────────────────────────────────
const cVe = await caio.sb.from('catches').select('id').eq('id', catchId);
ok((cVe.data ?? []).length === 0, 'o Caio, que não tem convite, não vê a captura');
const cPerfil = await caio.sb.from('profiles').select('id').eq('id', ana.id);
ok((cPerfil.data ?? []).length === 0, 'o Caio não lê o perfil da Ana');

// ── inserir amizade na mão continua proibido ──────────────────────────────────────
const burla = await caio.sb.from('friendships').insert({ user_id: ana.id, friend_id: caio.id });
ok(Boolean(burla.error), 'o Caio não consegue se inserir na lista da Ana sem a função');

// ── desfazer ──────────────────────────────────────────────────────────────────────
const remove = await bia.sb.rpc('remover_amizade', { outro: ana.id });
ok(!remove.error, 'remover amizade funciona');
const depois = await bia.sb.from('catches').select('id').eq('id', catchId);
ok((depois.data ?? []).length === 0, 'depois de remover, a Bia deixa de ver a captura da Ana');
const aDepois = await ana.sb.from('friendships').select('friend_id').eq('user_id', ana.id);
ok((aDepois.data ?? []).length === 0, 'e a Ana perde a Bia da lista — nos dois sentidos');

// ── limpeza ───────────────────────────────────────────────────────────────────────
await ana.sb.from('catches').delete().eq('id', catchId);
for (const u of [ana, bia, caio]) await u.sb.from('profiles').delete().eq('id', u.id);
console.log(`\nusuários de teste que ficaram no Auth: ${[ana, bia, caio].map((u) => u.email).join(', ')}`);
