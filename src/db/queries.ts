/**
 * Queries do banco local.
 *
 * Tudo que toca o SQLite passa por aqui. As telas não montam SQL — assim a regra de negócio
 * fica visível num arquivo só, e a Etapa 3 pode enfileirar sincronização sem caçar chamadas.
 */

import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from './index';
import { catches, unlocks, type CatchRow, type NewCatch } from './schema';
import { estimateWeightG, isTrophy } from '../domain/weight';
import { getSpecies } from '../catalog';

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

    // RN01 + RN12: só espécie confirmada desbloqueia, e só na primeira vez.
    if (input.speciesId) {
      const jaTem = await tx
        .select({ speciesId: unlocks.speciesId })
        .from(unlocks)
        .where(eq(unlocks.speciesId, input.speciesId))
        .limit(1);

      if (jaTem.length === 0) {
        await tx.insert(unlocks).values({
          speciesId: input.speciesId,
          firstCatchId: id,
          unlockedAt: agora,
        });
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

/** Histórico, do mais recente para o mais antigo. Exclui o que foi apagado (soft delete). */
export async function listCatches(limit = 200): Promise<CatchRow[]> {
  return db
    .select()
    .from(catches)
    .where(isNull(catches.deletedAt))
    .orderBy(desc(catches.caughtAt))
    .limit(limit);
}

export async function listCatchesOfSpecies(speciesId: string): Promise<CatchRow[]> {
  return db
    .select()
    .from(catches)
    .where(and(eq(catches.speciesId, speciesId), isNull(catches.deletedAt)))
    .orderBy(desc(catches.caughtAt));
}

export async function getCatch(id: string): Promise<CatchRow | undefined> {
  const rows = await db.select().from(catches).where(eq(catches.id, id)).limit(1);
  return rows[0];
}

/** Ids das espécies já desbloqueadas. Alimenta o álbum e o contador de progresso. */
export async function listUnlockedIds(): Promise<Set<string>> {
  const rows = await db.select({ speciesId: unlocks.speciesId }).from(unlocks);
  return new Set(rows.map((r) => r.speciesId));
}

/**
 * Exclusão — RN01: o desbloqueio **não** é revertido, só o recorde é recalculado.
 * Por isso é soft delete e a linha de `unlocks` fica intocada.
 */
export async function deleteCatch(id: string): Promise<void> {
  const agora = new Date().toISOString();
  await db
    .update(catches)
    .set({ deletedAt: agora, updatedAt: agora, syncStatus: 'pending' })
    .where(eq(catches.id, id));
}
