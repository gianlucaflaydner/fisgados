/**
 * Edge Function `identificar` — SDD seção 6.
 *
 * Recebe a foto da captura (JPEG em base64, ~800 px), confere quem está pedindo, conta na cota do
 * dia e pergunta à Gemini qual espécie **da lista fechada** aparece ali. Devolve até três
 * sugestões já validadas contra o catálogo.
 *
 * A chave da Gemini vive só aqui, como secret do Supabase: tudo que vai no bundle do app é
 * público, inclusive as variáveis `EXPO_PUBLIC_*`.
 *
 * Secrets:
 *   GEMINI_API_KEY        obrigatório
 *   GEMINI_MODEL          opcional, padrão abaixo — trocar de modelo não é refatoração
 *   GEMINI_THINKING       opcional, padrão minimal
 *   GEMINI_TIMEOUT_MS     opcional, padrão 10000
 *   IDENTIFY_DAILY_LIMIT  opcional, padrão 30 por pessoa por dia
 *
 * Publicar: npx supabase functions deploy identificar --no-verify-jwt --use-api --project-ref <ref>
 * O `--no-verify-jwt` é porque a verificação acontece aqui dentro, com `auth.getUser`, que funciona
 * com as chaves novas de assinatura de JWT — a verificação do gateway não funciona com elas.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

import { CATALOGO } from './catalogo.ts';
import { esquemaDeResposta, montarPrompt, sanearResposta } from './regras.ts';

/**
 * Flash-Lite, e não o Flash: no teste de 19/09/2026 o gemini-3.5-flash passou de 25 s e devolveu
 * 503 de sobrecarga no free tier, enquanto o Flash-Lite respondeu em ~1,5 s e acertou as duas
 * espécies. Escolher dentro de uma lista fechada não precisa do modelo maior.
 */
const MODELO = Deno.env.get('GEMINI_MODEL')?.trim() || 'gemini-3.5-flash-lite';
const NIVEL_DE_RACIOCINIO = Deno.env.get('GEMINI_THINKING')?.trim() || 'minimal';
const LIMITE_DIARIO = Number(Deno.env.get('IDENTIFY_DAILY_LIMIT') ?? '30') || 30;

/**
 * Passou disso, o app segue pelo seletor manual (SDD 6.5). O SDD fala em 6 s; subiu para 10 porque
 * o free tier da Gemini oscila entre 1,5 s e mais de 6 s na mesma foto, e o formulário não espera
 * pela IA — um limite maior custa só uma sugestão que chega mais tarde, nunca um registro travado.
 */
const TIMEOUT_MODELO_MS = Number(Deno.env.get('GEMINI_TIMEOUT_MS') ?? '10000') || 10_000;

/** Uma foto de 800 px em JPEG fica perto de 150 KB em base64. Isto é folga, não alvo. */
const TAMANHO_MAX_B64 = 2_000_000;

const IDS = CATALOGO.map((e) => e.id);
const IDS_VALIDOS = new Set(IDS);
const PROMPT = montarPrompt(CATALOGO);
const ESQUEMA = esquemaDeResposta(IDS);

function responder(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Projetos novos expõem a publishable key em JSON; os antigos, a anon key. Aceita os dois. */
function chavePublica(): string {
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (anon) return anon;
  try {
    const chaves = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}') as Record<string, string>;
    return chaves.default ?? Object.values(chaves)[0] ?? '';
  } catch {
    return '';
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return responder(405, { erro: 'metodo' });

  const chaveGemini = Deno.env.get('GEMINI_API_KEY');
  if (!chaveGemini) return responder(503, { erro: 'sem-chave' });

  const autorizacao = req.headers.get('Authorization') ?? '';
  if (!autorizacao.startsWith('Bearer ')) return responder(401, { erro: 'sem-sessao' });

  // O cliente carrega o token de quem chamou: o RPC da cota roda como essa pessoa, e o
  // `auth.uid()` lá dentro é ela — ninguém consegue gastar a cota de outro.
  const sb = createClient(Deno.env.get('SUPABASE_URL') ?? '', chavePublica(), {
    global: { headers: { Authorization: autorizacao } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: quem } = await sb.auth.getUser(autorizacao.slice('Bearer '.length));
  if (!quem.user) return responder(401, { erro: 'sem-sessao' });

  const corpo = (await req.json().catch(() => null)) as { foto?: unknown } | null;
  const foto = corpo?.foto;
  // `/9j/` é o começo de todo JPEG em base64. Barra PNG, HEIC e texto qualquer antes de gastar cota.
  if (typeof foto !== 'string' || !foto.startsWith('/9j/') || foto.length > TAMANHO_MAX_B64) {
    return responder(400, { erro: 'foto-invalida' });
  }

  // A cota é contada antes da chamada, e conta também a que falhar: é ela que protege a cota
  // da Gemini dividida pelo grupo, e um app em laço de erro é justamente o caso a conter.
  const { data: usadas, error: erroCota } = await sb.rpc('registrar_identificacao');
  if (erroCota) {
    console.error('cota', erroCota.code, erroCota.message);
    return responder(503, { erro: 'sem-cota-configurada' });
  }
  if (typeof usadas === 'number' && usadas > LIMITE_DIARIO) {
    return responder(429, { erro: 'limite', limite: LIMITE_DIARIO });
  }

  const inicio = Date.now();
  let resposta: Response;
  try {
    resposta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chaveGemini },
        signal: AbortSignal.timeout(TIMEOUT_MODELO_MS),
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: PROMPT }, { inline_data: { mime_type: 'image/jpeg', data: foto } }],
            },
          ],
          generationConfig: {
            // Os Flash 3.x "pensam" em nível médio por padrão, e isso custa segundos que a
            // pescaria não tem. Escolher numa lista fechada olhando a foto não precisa disso.
            thinkingConfig: { thinkingLevel: NIVEL_DE_RACIOCINIO },
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: ESQUEMA,
          },
        }),
      },
    );
  } catch (e) {
    const tempo = e instanceof DOMException && e.name === 'TimeoutError';
    return responder(504, { erro: tempo ? 'tempo' : 'modelo-inacessivel' });
  }

  if (!resposta.ok) {
    console.error('gemini', resposta.status, (await resposta.text()).slice(0, 500));
    return responder(502, { erro: 'modelo', status: resposta.status });
  }

  const dados = (await resposta.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;
  const texto = dados?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

  let bruto: unknown = null;
  try {
    bruto = JSON.parse(texto);
  } catch {
    // Resposta que não é JSON vale como "nenhuma sugestão": o seletor manual resolve.
  }

  // `ms` é o tempo só da Gemini: separa lentidão do modelo de lentidão de rede no diagnóstico.
  return responder(200, { modelo: MODELO, ms: Date.now() - inicio, sugestoes: sanearResposta(bruto, IDS_VALIDOS) });
});
