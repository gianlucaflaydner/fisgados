/**
 * Conexão com o SQLite local e execução das migrations.
 *
 * O banco abre uma vez, no boot do app. As migrations rodam antes da primeira tela desenhar —
 * se falharem, é melhor o app não abrir do que abrir e gravar em cima de um schema errado.
 */

import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

export const sqlite = openDatabaseSync('fisgados.db', { enableChangeListener: true });

export const db = drizzle(sqlite, { schema });

export { schema };
