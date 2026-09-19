import { File } from 'expo-file-system';

import {
  adiarNaFila,
  marcarSincronizada,
  proximosDaFila,
  removerDaFila,
} from '../db/queries';
import { desistiu } from '../domain/sincronizacao';
import { supabase } from './cliente';

/**
 * O worker que esvazia a fila de saída — SDD seção 4.
 *
 * Ordem de cada item: sobe a foto, faz o `upsert` da linha, marca como sincronizada e sai da
 * fila. Nessa ordem porque a linha em `catches` guarda o caminho da foto: gravar a linha antes
 * do arquivo produziria um registro apontando para algo que não existe, e um amigo abrindo o
 * histórico veria carta com foto quebrada.
 *
 * **Nunca bloqueia a interface.** A captura já está salva no aparelho desde o primeiro segundo; o
 * que acontece aqui é detalhe de infraestrutura. Falhar não perde nada — o item continua na fila,
 * com a próxima tentativa agendada.
 */

/** Uma rodada por vez. Duas em paralelo subiriam o mesmo item duas vezes. */
let rodando = false;

export interface ResultadoSync {
  enviados: number;
  falhas: number;
  /** `true` quando não havia o que fazer: sem nuvem, sem sessão ou fila vazia. */
  ocioso: boolean;
}

/**
 * Sobe a foto para `{user_id}/{catch_id}.jpg`.
 *
 * `upsert` porque uma tentativa anterior pode ter subido o arquivo e falhado no passo seguinte —
 * repetir precisa ser inofensivo, senão a fila trava num item que já está lá.
 *
 * Lê os bytes direto do arquivo. O caminho de base64 exigiria decodificar em memória um JPEG
 * inteiro, e o aparelho está numa pescaria, não numa bancada.
 */
async function subirFoto(userId: string, catchId: string, uriLocal: string): Promise<string> {
  const sb = supabase();
  if (!sb) throw new Error('sem nuvem');

  const caminho = `${userId}/${catchId}.jpg`;
  const bytes = await new File(uriLocal).bytes();

  const { error } = await sb.storage
    .from('catches')
    .upload(caminho, bytes, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(`foto: ${error.message}`);

  return caminho;
}

/**
 * Converte a linha local para o formato do Postgres. A coordenada fica de fora (RN09).
 *
 * As colunas da IA só vão quando há sugestão. Elas nascem na migration 0003; mandar a chave
 * sempre, mesmo nula, travaria a fila inteira de quem ainda não aplicou a migration — e quem não
 * aplicou também não tem a função de identificar, então nunca tem sugestão a mandar.
 */
function paraRemoto(payload: Record<string, unknown>, photoPath: string) {
  const sugestao = typeof payload.aiSuggestion === 'string' ? jsonOuNulo(payload.aiSuggestion) : null;
  const ia: { ai_suggestion?: unknown; ai_accepted?: unknown } =
    sugestao !== null ? { ai_suggestion: sugestao, ai_accepted: payload.aiAccepted ?? null } : {};
  return {
    ...ia,
    id: payload.id,
    user_id: payload.userId,
    species_id: payload.speciesId ?? null,
    length_cm: payload.lengthCm,
    weight_g: payload.weightG ?? null,
    weight_est_g: payload.weightEstG ?? null,
    photo_path: photoPath,
    place_label: payload.placeLabel ?? null,
    released: Boolean(payload.released),
    caught_at: payload.caughtAt,
    created_at: payload.createdAt,
    updated_at: payload.updatedAt,
    deleted_at: payload.deletedAt ?? null,
  };
}

/** Telemetria corrompida não pode segurar a captura na fila: sem JSON válido, ela sobe sem. */
function jsonOuNulo(texto: string): unknown {
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    return null;
  }
}

async function processar(item: {
  id: number;
  entity: string;
  entityId: string;
  operation: string;
  payload: string;
  attempts: number;
}): Promise<void> {
  const sb = supabase();
  if (!sb) throw new Error('sem nuvem');

  const { data: sessao } = await sb.auth.getSession();
  const userId = sessao.session?.user.id;
  if (!userId) throw new Error('sem sessão');

  const payload = JSON.parse(item.payload) as Record<string, unknown>;

  if (item.entity === 'unlock') {
    const { error } = await sb.from('unlocks').upsert(
      {
        user_id: userId,
        species_id: payload.speciesId,
        first_catch_id: payload.firstCatchId,
        unlocked_at: payload.unlockedAt,
      },
      { onConflict: 'user_id,species_id' },
    );
    if (error) throw new Error(error.message);
    return;
  }

  if (item.operation === 'delete') {
    // Soft delete também no remoto: o desbloqueio não volta atrás (RN01), e apagar a linha de
    // verdade tiraria a base do que já foi contado.
    const { error } = await sb
      .from('catches')
      .update({ deleted_at: payload.deletedAt, updated_at: payload.deletedAt })
      .eq('id', item.entityId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return;
  }

  const uriLocal = String(payload.photoLocal ?? '');
  const caminhoFoto = uriLocal
    ? await subirFoto(userId, item.entityId, uriLocal)
    : `${userId}/${item.entityId}.jpg`;

  const { error } = await sb.from('catches').upsert(paraRemoto({ ...payload, userId }, caminhoFoto));
  if (error) throw new Error(error.message);

  await marcarSincronizada(userId, item.entityId, caminhoFoto);
}

/**
 * Uma rodada da fila.
 *
 * Não recebe "está online?" de fora de propósito: descobrir isso é uma pergunta que mente com
 * frequência — o aparelho diz que tem wi-fi e o wi-fi do pesqueiro não tem internet. Tentar e
 * falhar é mais barato e mais honesto, e o backoff cuida do resto.
 */
export async function sincronizar(limite = 20): Promise<ResultadoSync> {
  if (rodando) return { enviados: 0, falhas: 0, ocioso: true };

  const sb = supabase();
  if (!sb) return { enviados: 0, falhas: 0, ocioso: true };

  rodando = true;
  let enviados = 0;
  let falhas = 0;

  try {
    const fila = await proximosDaFila(limite);
    if (fila.length === 0) return { enviados: 0, falhas: 0, ocioso: true };

    for (const item of fila) {
      try {
        await processar(item);
        await removerDaFila(item.id);
        enviados++;
      } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : String(erro);
        falhas++;

        // Esgotadas as tentativas, o item para de ser retentado. Fica na fila com o erro à vista,
        // para virar o indicador discreto do histórico em vez de sumir em silêncio.
        if (desistiu(item.attempts + 1)) {
          await adiarNaFila(item.id, item.attempts, `desistiu: ${mensagem}`);
        } else {
          await adiarNaFila(item.id, item.attempts, mensagem);
        }

        // Sem sessão ou sem nuvem não adianta tentar os próximos: o problema é de todos.
        if (/sem sessão|sem nuvem/.test(mensagem)) break;
      }
    }
  } finally {
    rodando = false;
  }

  return { enviados, falhas, ocioso: enviados === 0 && falhas === 0 };
}
