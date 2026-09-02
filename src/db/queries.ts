/**
 * Queries do banco local.
 *
 * Tudo que toca o SQLite passa por aqui. As telas não montam SQL — assim a regra de negócio
 * fica visível num arquivo só, e a Etapa 3 pode enfileirar sincronização sem caçar chamadas.
 *
 * Toda leitura e escrita de captura recebe o `userId` como primeiro argumento. É repetitivo de
 * propósito: com a conta explícita na assinatura, esquecer de filtrar por dono vira erro de
 * compilação, e não um histórico que mostra o peixe de outra pessoa.
 */

import { and, asc, desc, eq, isNull, lte, max, or, sql } from 'drizzle-orm';
import { db } from './index';
import { appPrefs, catches, syncOutbox, unlocks, type CatchRow, type NewCatch } from './schema';
import { estimateWeightG, isTrophy } from '../domain/weight';
import { getSpecies } from '../catalog';
import { atrasoDaTentativa, type EntidadeSync, type OperacaoSync } from '../domain/sincronizacao';

/**
 * Enfileira uma escrita para a nuvem — SDD seção 4, padrão outbox.
 *
 * Recebe a transação e **só é chamado dentro dela**. Não é detalhe de estilo: se a captura for
 * gravada e o enfileiramento falhar depois, a linha existe no aparelho e nunca sobe, sem nada
 * indicar que faltou. Na mesma transação, ou as duas coisas acontecem ou nenhuma.
 *
 * Nada aqui exige que a nuvem exista. A fila só acumula até haver um servidor para consumi-la, e
 * o app segue funcionando inteiro offline — que é o requisito não funcional principal do PRD.
 */
async function enfileirar(
  tx: { insert: typeof db.insert },
  entity: EntidadeSync,
  entityId: string,
  operation: OperacaoSync,
  payload: unknown,
): Promise<void> {
  await tx.insert(syncOutbox).values({
    entity,
    entityId,
    operation,
    payload: JSON.stringify(payload),
    nextAttemptAt: new Date().toISOString(),
  });
}

/** UUID v7: ordenável por tempo, gerado no cliente, definitivo desde o nascimento. */
export function uuidv7(): string {
  const ms = Date.now();
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);

  // 48 bits de timestamp em milissegundos, big-endian.
  bytes[0] = (ms / 2 ** 40) & 0xff;
  bytes[1] = (ms / 2 ** 32) & 0xff;
  bytes[2] = (ms / 2 ** 24) & 0xff;
  bytes[3] = (ms / 2 ** 16) & 0xff;
  bytes[4] = (ms / 2 ** 8) & 0xff;
  bytes[5] = ms & 0xff;

  bytes[6] = (bytes[6]! & 0x0f) | 0x70; // versão 7
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variante RFC 4122

  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export interface NewCatchInput {
  userId: string;
  speciesId: string | null;
  lengthCm: number;
  weightG: number | null;
  photoLocal: string;
  lat: number | null;
  lng: number | null;
  placeLabel: string | null;
  released: boolean;
  caughtAt: Date;
  offlineOrigin: boolean;
}

export interface SaveResult {
  catchId: string;
  /** A espécie foi desbloqueada agora? Dispara a animação de desbloqueio (F07). */
  unlocked: boolean;
  /** A captura atingiu o critério de troféu (RN19)? */
  trophy: boolean;
}

/**
 * Salva uma captura e resolve o desbloqueio na mesma transação.
 *
 * O peso estimado é calculado e **gravado** aqui, não no momento de exibir: assim o histórico
 * não depende do catálogo, e uma correção futura de coeficiente não reescreve o passado de
 * ninguém em silêncio.
 */
export async function saveCatch(input: NewCatchInput): Promise<SaveResult> {
  const id = uuidv7();
  const agora = new Date().toISOString();
  const species = input.speciesId ? getSpecies(input.speciesId) : undefined;

  const row: NewCatch = {
    id,
    userId: input.userId,
    speciesId: input.speciesId,
    lengthCm: input.lengthCm,
    weightG: input.weightG,
    weightEstG: species ? estimateWeightG(input.lengthCm, species) : null,
    photoLocal: input.photoLocal,
    photoRemote: null,
    lat: input.lat,
    lng: input.lng,
    placeLabel: input.placeLabel,
    released: input.released,
    caughtAt: input.caughtAt.toISOString(),
    offlineOrigin: input.offlineOrigin,
    createdAt: agora,
    updatedAt: agora,
    deletedAt: null,
    aiSuggestion: null,
    aiAccepted: null,
    syncStatus: 'pending',
  };

  let unlocked = false;

  await db.transaction(async (tx) => {
    await tx.insert(catches).values(row);
    await enfileirar(tx, 'catch', id, 'create', row);

    // RN01 + RN12: só espécie confirmada desbloqueia, e só na primeira vez **daquela conta**.
    if (input.speciesId) {
      const jaTem = await tx
        .select({ speciesId: unlocks.speciesId })
        .from(unlocks)
        .where(and(eq(unlocks.userId, input.userId), eq(unlocks.speciesId, input.speciesId)))
        .limit(1);

      if (jaTem.length === 0) {
        const desbloqueio = {
          userId: input.userId,
          speciesId: input.speciesId,
          firstCatchId: id,
          unlockedAt: agora,
        };
        await tx.insert(unlocks).values(desbloqueio);
        await enfileirar(tx, 'unlock', input.speciesId, 'create', desbloqueio);
        unlocked = true;
      }
    }
  });

  return {
    catchId: id,
    unlocked,
    trophy: species ? isTrophy(input.lengthCm, species) : false,
  };
}

export interface EditCatchInput {
  speciesId: string | null;
  lengthCm: number;
  weightG: number | null;
  placeLabel: string | null;
  released: boolean;
}

/**
 * Corrige uma captura já registrada.
 *
 * Duas regras não óbvias moram aqui:
 *
 * O **peso estimado é recalculado**, porque ele foi gravado no salvamento a partir da espécie e
 * da medida. Corrigir 420 cm para 42 cm e deixar o peso antigo produziria um registro que se
 * contradiz sozinho.
 *
 * Trocar a espécie **desbloqueia a nova e não tranca a velha**. É a RN01 levada a sério: o
 * desbloqueio é permanente e nunca é revertido. Quem registrou um jundiá como bagre e corrige
 * ganha a carta do jundiá; a do bagre continua aberta, porque a regra não prevê fechar carta —
 * e uma carta que fecha sozinha seria pior do que uma carta a mais.
 */
export async function updateCatch(
  userId: string,
  id: string,
  input: EditCatchInput,
): Promise<{ unlocked: boolean }> {
  const agora = new Date().toISOString();
  const species = input.speciesId ? getSpecies(input.speciesId) : undefined;

  let unlocked = false;

  await db.transaction(async (tx) => {
    const alteracao = {
      speciesId: input.speciesId,
      lengthCm: input.lengthCm,
      weightG: input.weightG,
      weightEstG: species ? estimateWeightG(input.lengthCm, species) : null,
      placeLabel: input.placeLabel,
      released: input.released,
      updatedAt: agora,
      syncStatus: 'pending' as const,
    };

    await tx
      .update(catches)
      .set(alteracao)
      .where(and(eq(catches.userId, userId), eq(catches.id, id)));
    await enfileirar(tx, 'catch', id, 'update', { id, userId, ...alteracao });

    if (input.speciesId) {
      const jaTem = await tx
        .select({ speciesId: unlocks.speciesId })
        .from(unlocks)
        .where(and(eq(unlocks.userId, userId), eq(unlocks.speciesId, input.speciesId)))
        .limit(1);

      if (jaTem.length === 0) {
        const desbloqueio = {
          userId,
          speciesId: input.speciesId,
          firstCatchId: id,
          unlockedAt: agora,
        };
        await tx.insert(unlocks).values(desbloqueio);
        await enfileirar(tx, 'unlock', input.speciesId, 'create', desbloqueio);
        unlocked = true;
      }
    }
  });

  return { unlocked };
}

/** Histórico, do mais recente para o mais antigo. Exclui o que foi apagado (soft delete). */
export async function listCatches(userId: string, limit = 200): Promise<CatchRow[]> {
  return db
    .select()
    .from(catches)
    .where(and(eq(catches.userId, userId), isNull(catches.deletedAt)))
    .orderBy(desc(catches.caughtAt))
    .limit(limit);
}

export async function listCatchesOfSpecies(userId: string, speciesId: string): Promise<CatchRow[]> {
  return db
    .select()
    .from(catches)
    .where(
      and(
        eq(catches.userId, userId),
        eq(catches.speciesId, speciesId),
        isNull(catches.deletedAt),
      ),
    )
    .orderBy(desc(catches.caughtAt));
}

export async function getCatch(userId: string, id: string): Promise<CatchRow | undefined> {
  const rows = await db
    .select()
    .from(catches)
    .where(and(eq(catches.userId, userId), eq(catches.id, id)))
    .limit(1);
  return rows[0];
}

/**
 * Maior medida já registrada por espécie, para o selo de "Recorde" no card.
 *
 * Sai do banco agrupado, e não do histórico carregado na tela: a home lista as 50 capturas mais
 * recentes, e o recorde de uma espécie pode ser de dois anos atrás. Calcular sobre a página
 * visível daria um selo que aparece e some conforme a pessoa rola.
 */
export async function listPersonalBests(userId: string): Promise<Map<string, number>> {
  const linhas = await db
    .select({ speciesId: catches.speciesId, maior: max(catches.lengthCm) })
    .from(catches)
    .where(and(eq(catches.userId, userId), isNull(catches.deletedAt)))
    .groupBy(catches.speciesId);

  const bests = new Map<string, number>();
  for (const l of linhas) {
    // Sem espécie confirmada não há recorde: "não identificado" não é uma linha de comparação.
    if (l.speciesId && l.maior !== null) bests.set(l.speciesId, l.maior);
  }
  return bests;
}

/** Quantas capturas por espécie. Alimenta o contador de vezes na carta e no card. */
export async function countBySpecies(userId: string): Promise<Map<string, number>> {
  const linhas = await db
    .select({ speciesId: catches.speciesId, quantas: sql<number>`count(*)` })
    .from(catches)
    .where(and(eq(catches.userId, userId), isNull(catches.deletedAt)))
    .groupBy(catches.speciesId);

  const contagem = new Map<string, number>();
  for (const l of linhas) if (l.speciesId) contagem.set(l.speciesId, Number(l.quantas));
  return contagem;
}

/** Ids das espécies já desbloqueadas. Alimenta o álbum e o contador de progresso. */
export async function listUnlockedIds(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ speciesId: unlocks.speciesId })
    .from(unlocks)
    .where(eq(unlocks.userId, userId));
  return new Set(rows.map((r) => r.speciesId));
}

/**
 * Exclusão — RN01: o desbloqueio **não** é revertido, só o recorde é recalculado.
 * Por isso é soft delete e a linha de `unlocks` fica intocada.
 */
export async function deleteCatch(userId: string, id: string): Promise<void> {
  const agora = new Date().toISOString();

  await db.transaction(async (tx) => {
    await tx
      .update(catches)
      .set({ deletedAt: agora, updatedAt: agora, syncStatus: 'pending' })
      .where(and(eq(catches.userId, userId), eq(catches.id, id)));
    await enfileirar(tx, 'catch', id, 'delete', { id, userId, deletedAt: agora });
  });
}

/**
 * Marca a captura como sincronizada e guarda onde a foto ficou no servidor.
 *
 * `photoRemote` é o caminho no bucket, não a URL: URL de bucket privado é assinada e expira em
 * minutos, então guardar uma seria guardar algo que amanhã não abre. O caminho é estável, e a
 * assinatura se pede na hora de mostrar.
 */
export async function marcarSincronizada(
  userId: string,
  id: string,
  photoRemote: string,
): Promise<void> {
  await db
    .update(catches)
    .set({ syncStatus: 'synced', photoRemote })
    .where(and(eq(catches.userId, userId), eq(catches.id, id)));
}

/* ─────────────────────────────────────────────── fila de sincronização ──────────── */

/**
 * O que está pronto para subir agora.
 *
 * Ordena pelo id, que é autoincremento: a fila sobe na ordem em que aconteceu. Uma correção que
 * chegasse antes da criação da mesma captura produziria um upsert de linha inexistente.
 */
export async function proximosDaFila(limite = 20) {
  const agora = new Date().toISOString();
  return db
    .select()
    .from(syncOutbox)
    .where(or(isNull(syncOutbox.nextAttemptAt), lte(syncOutbox.nextAttemptAt, agora)))
    .orderBy(asc(syncOutbox.id))
    .limit(limite);
}

/** Item que subiu sai da fila. A linha em `catches` guarda o `syncStatus`. */
export async function removerDaFila(id: number): Promise<void> {
  await db.delete(syncOutbox).where(eq(syncOutbox.id, id));
}

/**
 * Falhou: conta a tentativa e agenda a próxima com o backoff do SDD.
 *
 * O agendamento é gravado, não guardado em memória, para sobreviver ao app ser morto. Sem isso,
 * reabrir o app zeraria o backoff e o aparelho voltaria a martelar o servidor de 2 em 2 segundos.
 */
export async function adiarNaFila(id: number, tentativas: number, erro: string): Promise<void> {
  const proxima = new Date(Date.now() + atrasoDaTentativa(tentativas)).toISOString();
  await db
    .update(syncOutbox)
    .set({ attempts: tentativas + 1, lastError: erro.slice(0, 500), nextAttemptAt: proxima })
    .where(eq(syncOutbox.id, id));
}

/** Quantos itens esperam para subir. Alimenta o indicador discreto do histórico (SDD 4). */
export async function pendentesNaFila(): Promise<number> {
  const linhas = await db.select({ n: sql<number>`count(*)` }).from(syncOutbox);
  return Number(linhas[0]?.n ?? 0);
}

/* ─────────────────────────────────────────── preferências do aparelho ───────────── */

/**
 * Chave-valor porque são poucas e não têm relação entre si — criar uma coluna por preferência
 * significaria uma migration a cada ajuste de gosto.
 */
export async function getPref(key: string): Promise<string | undefined> {
  const linhas = await db
    .select({ value: appPrefs.value })
    .from(appPrefs)
    .where(eq(appPrefs.key, key))
    .limit(1);
  return linhas[0]?.value;
}

export async function setPref(key: string, value: string): Promise<void> {
  await db
    .insert(appPrefs)
    .values({ key, value })
    .onConflictDoUpdate({ target: appPrefs.key, set: { value } });
}

export async function removePref(key: string): Promise<void> {
  await db.delete(appPrefs).where(eq(appPrefs.key, key));
}

/**
 * Apaga tudo que pertence a quem usava este aparelho antes.
 *
 * Chamado quando outra conta entra — uma conta por aparelho é regra do MVP (F14). Não é limpeza
 * de cache: é a garantia de que o histórico de uma pessoa não fica no banco de outra, invisível
 * mas presente. A preferência de tema e a sessão do Supabase ficam, porque são do aparelho e não
 * da conta.
 *
 * A fila de sincronização vai junto: itens da conta anterior nunca mais poderão subir, já que a
 * sessão que os autorizaria não existe mais.
 */
export async function limparDadosLocais(): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(catches);
    await tx.delete(unlocks);
    await tx.delete(syncOutbox);
  });
}
