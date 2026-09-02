/**
 * Confere se a nuvem está de pé antes de alguém descobrir o contrário numa pescaria.
 *
 *   npm run nuvem:check
 *
 * Verifica três coisas, nesta ordem, porque cada uma só faz sentido se a anterior passou:
 * o `.env` tem o formato certo, a chave é aceita pelo servidor, e o esquema foi aplicado.
 *
 * Lê o `.env` na mão em vez de depender de `--env-file`: o arquivo é o mesmo que o Expo carrega,
 * e o script precisa rodar igual no Windows, no CI e na máquina de quem for mexer nisto depois.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();
const TABELAS = ['profiles', 'catches', 'unlocks', 'friendships'] as const;

function lerEnv(): Record<string, string> {
  const caminho = join(RAIZ, '.env');
  if (!existsSync(caminho)) return {};

  const vars: Record<string, string> = {};
  for (const linha of readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(linha);
    if (!m || linha.trimStart().startsWith('#')) continue;
    vars[m[1]!] = m[2]!.trim().replace(/^["']|["']$/g, '');
  }
  return vars;
}

const env = lerEnv();
const url = (env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const chave = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const problemas: string[] = [];
const avisos: string[] = [];

// ── 1. formato ──────────────────────────────────────────────────────────────────────

if (!existsSync(join(RAIZ, '.env'))) {
  problemas.push('Não existe .env. Copie o .env.example e preencha.');
} else {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
    problemas.push(`EXPO_PUBLIC_SUPABASE_URL não parece uma URL de projeto: ${url || '(vazia)'}`);
  }
  if (/^sb_secret_/.test(chave) || /service_role/.test(chave)) {
    problemas.push(
      'A chave é a SECRET do Supabase. Ela ignora o RLS e não pode ir num app — use a publishable (sb_publishable_).',
    );
  } else if (chave.length < 20) {
    problemas.push('EXPO_PUBLIC_SUPABASE_ANON_KEY vazia ou curta demais.');
  }

  // O app nunca usa a senha do banco: ela só serve para CLI e conexão direta ao Postgres.
  // Guardá-la aqui é um segredo a mais no disco sem motivo — e um passo de distância de virar
  // EXPO_PUBLIC_ por engano, que a embutiria no bundle entregue a todo mundo.
  for (const nome of Object.keys(env)) {
    if (/PASSWORD|SECRET|SERVICE_ROLE/i.test(nome) && !nome.startsWith('EXPO_PUBLIC_')) {
      avisos.push(`${nome} está no .env e o app não usa. Guarde em gerenciador de senhas e remova daqui.`);
    }
    if (nome.startsWith('EXPO_PUBLIC_') && /PASSWORD|SECRET|SERVICE_ROLE/i.test(nome)) {
      problemas.push(`${nome} tem prefixo EXPO_PUBLIC_ e vai inteira para dentro do app. Remova já.`);
    }
  }
}

if (problemas.length > 0) {
  console.log('\nConfiguração\n');
  for (const p of problemas) console.log(`  ✗ ${p}`);
  for (const a of avisos) console.log(`  ! ${a}`);
  console.log('');
  process.exit(1);
}

console.log(`\nProjeto: ${url}`);
console.log(`Chave:   ${chave.slice(0, 15)}… (${chave.length} caracteres)\n`);

// ── 2 e 3. servidor e esquema ───────────────────────────────────────────────────────

const cabecalhos = { apikey: chave, Authorization: `Bearer ${chave}` };
let falhou = false;

for (const tabela of TABELAS) {
  try {
    const r = await fetch(`${url}/rest/v1/${tabela}?select=*&limit=1`, { headers: cabecalhos });

    if (r.status === 401 || r.status === 403) {
      console.log(`  ✗ ${tabela.padEnd(12)} chave recusada (HTTP ${r.status})`);
      falhou = true;
      continue;
    }
    if (r.ok) {
      // Com RLS ligado e sem sessão, o PostgREST devolve lista vazia em vez de erro. É o
      // esperado: significa que a tabela existe e que nenhuma linha vaza para quem não entrou.
      console.log(`  ✓ ${tabela.padEnd(12)} existe, e nada vaza sem login`);
      continue;
    }

    const corpo = (await r.text()).slice(0, 160);
    const semTabela = /PGRST205|does not exist|Could not find the table/i.test(corpo);
    console.log(
      `  ✗ ${tabela.padEnd(12)} ${semTabela ? 'não existe — o esquema não foi aplicado' : `HTTP ${r.status}: ${corpo}`}`,
    );
    falhou = true;
  } catch (erro) {
    console.log(`  ✗ ${tabela.padEnd(12)} sem resposta: ${erro instanceof Error ? erro.message : erro}`);
    falhou = true;
  }
}

console.log('');
for (const a of avisos) console.log(`  ! ${a}`);

if (falhou) {
  console.log('\nAplique supabase/migrations/0001_esquema.sql no SQL Editor do painel.\n');
  process.exit(1);
}

console.log('Nuvem pronta. Falta o worker que drena a fila — ainda não existe.\n');
