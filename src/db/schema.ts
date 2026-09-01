/**
 * Banco local — SDD seção 3.2.
 *
 * O dispositivo é a fonte de verdade das capturas do próprio usuário. A nuvem entra na Etapa 3,
 * e por isso as colunas de sincronização já existem aqui, sem uso ainda: criar coluna depois é
 * migration, e migration em app instalado é onde se perde dado.
 */

import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Conta local — F14 ("login simples, um dispositivo por conta no MVP").
 *
 * Enquanto a nuvem não existe (Etapa 3), a conta vive só aqui. Ela não tranca o aparelho de
 * ninguém: serve para separar o histórico de duas pessoas que usam o mesmo celular e para o app
 * já nascer gravando o dono em cada captura — no dia da sincronização não vai ser preciso
 * adivinhar de quem é o quê.
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** Normalizado (minúsculas, sem espaço nas pontas): é a chave de login, não um rótulo. */
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  /** Por usuário: dois cadastros com a mesma senha não produzem o mesmo hash. */
  passwordSalt: text('password_salt').notNull(),
  createdAt: text('created_at').notNull(),
});

/**
 * Sessão ativa — linha única (`id = 1`).
 *
 * Fica no SQLite, e não em memória, porque o login precisa sobreviver ao fechar do app: ninguém
 * digita senha na beira do açude toda vez que abre para registrar um peixe.
 */
export const session = sqliteTable('session', {
  id: integer('id').primaryKey(),
  userId: text('user_id').notNull(),
  startedAt: text('started_at').notNull(),
});

export const catches = sqliteTable(
  'catches',
  {
    /** UUID v7 gerado no cliente: o registro nasce com o id definitivo, sem reconciliação. */
    id: text('id').primaryKey(),

    /** Dono da captura. Toda leitura do histórico filtra por aqui (ver `queries.ts`). */
    userId: text('user_id').notNull(),

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
    // Histórico nunca é lido "de todo mundo": o dono entra na frente do índice.
    index('idx_catches_user_caught_at').on(t.userId, t.caughtAt),
    index('idx_catches_user_species').on(t.userId, t.speciesId, t.lengthCm),
  ],
);

/**
 * Desbloqueios — RN01.
 *
 * Tabela separada de `catches` de propósito: o desbloqueio é permanente e **não** é revertido
 * quando a captura que o originou é excluída. Derivar isso de `catches` obrigaria a manter a
 * captura viva só para sustentar o desbloqueio.
 */
export const unlocks = sqliteTable(
  'unlocks',
  {
    userId: text('user_id').notNull(),
    speciesId: text('species_id').notNull(),
    firstCatchId: text('first_catch_id').notNull(),
    unlockedAt: text('unlocked_at').notNull(),
  },
  // O álbum é de cada um: a mesma espécie desbloqueia uma vez **por conta**.
  (t) => [primaryKey({ columns: [t.userId, t.speciesId] })],
);

/**
 * Preferências do aparelho — não da conta.
 *
 * O tema (claro, escuro ou seguir o sistema) é do celular, e não de quem está logado: quem empresta
 * o aparelho na beira do açude não deveria reconfigurar nada, e trocar de conta não deveria acender
 * a tela na cara de ninguém às 5h da manhã. Por isso fica aqui, e não em `users`.
 */
export const appPrefs = sqliteTable('app_prefs', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
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
export type UserRow = typeof users.$inferSelect;
export type AppPrefRow = typeof appPrefs.$inferSelect;
