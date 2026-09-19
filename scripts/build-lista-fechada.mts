/**
 * Gera a lista fechada que a Edge Function `identificar` manda para o modelo (SDD 6.2).
 *
 * A função roda no Deno, no servidor, e não enxerga o `species.json` do app. Copiar à mão seria
 * pedir para as duas listas divergirem na primeira espécie nova — e aí o modelo sugeriria um id
 * que o app não conhece, ou nunca sugeriria a espécie recém-chegada. O teste de domínio falha
 * quando o arquivo gerado fica para trás.
 *
 *   npm run ia:catalogo
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { SPECIES } from '../src/catalog/index.ts';

const DESTINO = join('supabase', 'functions', 'identificar', 'catalogo.ts');

/** Três apelidos bastam para o modelo ancorar o nome; a lista inteira só gasta token. */
const APELIDOS_MAX = 3;

const linhas = [...SPECIES]
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((s) => ({
    id: s.id,
    nome: s.commonName,
    cientifico: s.scientificName,
    variedade: s.variety,
    apelidos: s.aliases.slice(0, APELIDOS_MAX),
  }));

const conteudo = `// GERADO por scripts/build-lista-fechada.mts a partir de src/catalog/species.json.
// Não edite à mão: rode \`npm run ia:catalogo\`.

import type { EspecieDaLista } from './regras.ts';

export const CATALOGO: EspecieDaLista[] = ${JSON.stringify(linhas, null, 2)};
`;

writeFileSync(DESTINO, conteudo);
console.log(`${linhas.length} espécies em ${DESTINO}`);
