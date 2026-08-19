/**
 * Banco local — SDD seção 3.2.
 *
 * O dispositivo é a fonte de verdade das capturas do próprio usuário. A nuvem entra na Etapa 3,
 * e por isso as colunas de sincronização já existem aqui, sem uso ainda: criar coluna depois é
 * migration, e migration em app instalado é onde se perde dado.
 */

import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const catches = sqliteTable(
  'catches',
  {
    /** UUID v7 gerado no cliente: o registro nasce com o id definitivo, sem reconciliação. */
    id: text('id').primaryKey(),

    /** `null` = "não identificado" (RN12). Conta no histórico, não desbloqueia carta. */
    speciesId: text('species_id'),

    /** No eixo declarado pela espécie: comprimento total ou largura do disco (RN04). */
    lengthCm: real('length_cm').notNull(),

    /** Peso real informado. Quando existe, é o valor oficial e o estimado some (RN05). */
    weightG: real('weight_g'),
    /** Calculado no salvamento, para não depender do catálogo ao listar o histórico. */
    weightEstG: real('weight_est_g'),

    photoLocal: text('photo_local').notNull(),
    photoRemote: text('photo_remote'),

    /** RN09: coordenada nunca sobe para o servidor. Existe só aqui. */
    lat: real('lat'),
    lng: real('lng'),
    placeLabel: text('place_label'),

    released: integer('released', { mode: 'boolean' }).notNull().default(false),

    /**
     * ISO 8601 **com hora e fuso**, não só data. Três insígnias dependem da hora, e o recálculo
     * retroativo da RN17 só funciona se o dado estiver aqui desde a primeira captura.
     */
    caughtAt: text('caught_at').notNull(),

    /** Registrada sem rede? Não é derivável depois, então nasce junto (PRD 11.14). */
    offlineOrigin: integer('offline_origin', { mode: 'boolean' }).notNull().default(false),

    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    /** Soft delete: o desbloqueio não volta atrás (RN01), então a linha não some de verdade. */
    deletedAt: text('deleted_at'),

    /** JSON do retorno da IA. Guardado separado da escolha do usuário (RN02). */
    aiSuggestion: text('ai_suggestion'),
    aiAccepted: integer('ai_accepted', { mode: 'boolean' }),

    syncStatus: text('sync_status', { enum: ['pending', 'syncing', 'synced', 'error'] })
      .notNull()
      .default('pending'),
  },
  (t) => [
    index('idx_catches_caught_at').on(t.caughtAt),
    index('idx_catches_species').on(t.speciesId, t.lengthCm),
  ],
);

/**
 * Desbloqueios — RN01.
 *
 * Tabela separada de `catches` de propósito: o desbloqueio é permanente e **não** é revertido
 * quando a captura que o originou é excluída. Derivar isso de `catches` obrigaria a manter a
 * captura viva só para sustentar o desbloqueio.
 */
export const unlocks = sqliteTable('unlocks', {
  speciesId: text('species_id').primaryKey(),
  firstCatchId: text('first_catch_id').notNull(),
  unlockedAt: text('unlocked_at').notNull(),
});

/** Fila de sincronização — SDD seção 4. Sem uso até a Etapa 3. */
export const syncOutbox = sqliteTable('sync_outbox', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  operation: text('operation', { enum: ['create', 'update', 'delete'] }).notNull(),
  payload: text('payload').notNull(),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

export type CatchRow = typeof catches.$inferSelect;
export type NewCatch = typeof catches.$inferInsert;
export type UnlockRow = typeof unlocks.$inferSelect;
