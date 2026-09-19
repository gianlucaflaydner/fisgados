/**
 * Testa a Edge Function `identificar` contra o projeto real (npm run ia:check).
 *
 * Precisa da migration 0003_identificacao.sql aplicada e da função publicada com o secret
 * GEMINI_API_KEY. Cria um usuário de teste @fisgados.app e, no fim, mostra o e-mail para apagar
 * em Authentication > Users. Gasta 3 identificações da cota do dia desse usuário.
 *
 * As fotos do teste são as do próprio catálogo (assets/especies). Elas são fotos boas, de
 * referência — acertar nelas prova que o encanamento funciona, não que a IA acerta na beira do
 * açude. Essa medida vem da telemetria `ai_accepted` das capturas de verdade.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env: Record<string, string> = {};
for (const l of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(l);
  if (m && !l.trimStart().startsWith('#')) env[m[1]!] = m[2]!.trim();
}
const URL = env.EXPO_PUBLIC_SUPABASE_URL!;
const KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const FUNCAO = `${URL.replace(/\/$/, '')}/functions/v1/identificar`;

let falhas = 0;
const ok = (b: boolean, t: string) => {
  if (!b) falhas++;
  console.log(`${b ? 'ok  ' : 'FALHA'} ${t}`);
};

async function chamar(token: string | null, corpo: unknown) {
  const r = await fetch(FUNCAO, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(corpo),
  });
  const texto = await r.text();
  let json: any = null;
  try {
    json = JSON.parse(texto);
  } catch {
    json = { bruto: texto.slice(0, 200) };
  }
  return { status: r.status, json };
}

const foto = (id: string) => readFileSync(`assets/especies/${id}.jpg`).toString('base64');

// ── sem login ─────────────────────────────────────────────────────────────────────
const anonimo = await chamar(null, { foto: foto('traira') });
ok(anonimo.status === 401, `sem login é recusado (${anonimo.status})`);
if (anonimo.status === 404) {
  console.log('\nA função não foi encontrada: publique com `npx supabase functions deploy identificar ...`.');
  process.exit(1);
}

// ── com login ─────────────────────────────────────────────────────────────────────
const sb = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const email = `ia-${Date.now()}@fisgados.app`;
const { data, error } = await sb.auth.signUp({ email, password: 'senha-de-teste-123' });
if (error || !data.session) throw new Error(`cadastro: ${error?.message}`);
const token = data.session.access_token;

const lixo = await chamar(token, { foto: 'isto não é um jpeg' });
ok(lixo.status === 400, `foto inválida é recusada antes de gastar a Gemini (${lixo.status})`);
if (lixo.status === 503) console.log(`      → ${JSON.stringify(lixo.json)}`);

for (const id of ['traira', 'dourado']) {
  const inicio = Date.now();
  const r = await chamar(token, { foto: foto(id) });
  const ms = Date.now() - inicio;
  if (r.status !== 200) {
    ok(false, `${id}: resposta ${r.status} ${JSON.stringify(r.json)}`);
    if (r.json?.erro === 'sem-chave') console.log('      → falta o secret GEMINI_API_KEY na função.');
    if (r.json?.erro === 'sem-cota-configurada') console.log('      → falta aplicar a migration 0003_identificacao.sql.');
    continue;
  }
  const sugestoes = (r.json.sugestoes ?? []) as { speciesId: string; confianca: number; motivo: string }[];
  ok(sugestoes.length <= 3, `${id}: no máximo três sugestões (${sugestoes.length})`);
  ok(sugestoes.some((s) => s.speciesId === id), `${id}: a espécie certa está entre as sugestões (${r.json.modelo}, ${ms} ms)`);
  for (const s of sugestoes) console.log(`      ${s.speciesId.padEnd(16)} ${Math.round(s.confianca * 100)}%  ${s.motivo}`);
  ok(ms < 9_000, `${id}: respondeu dentro do tempo que o app espera (${ms} ms < 9000)`);
}

console.log(`\n${falhas === 0 ? 'tudo certo' : `${falhas} falha(s)`}`);
console.log(`usuário de teste que ficou no Auth: ${email}`);
if (falhas > 0) process.exit(1);
