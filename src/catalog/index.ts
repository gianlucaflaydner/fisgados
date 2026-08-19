/**
 * Acesso ao catálogo embarcado.
 *
 * O JSON entra no bundle e é indexado uma vez, na primeira importação. São 84 espécies — cabe
 * em memória sem discussão, e evita ida ao SQLite no caminho de 30 segundos do registro.
 *
 * Este módulo é a única porta de entrada para o catálogo. Nada no app deve importar o
 * `species.json` diretamente: se precisar de um recorte novo, adicione uma função aqui.
 */

import raw from './species.json';
import type { Album, AlbumId, Catalog, Rarity, Species } from './types';

const catalog = raw as unknown as Catalog;

export const ALBUMS: readonly Album[] = catalog.albums;
export const SPECIES: readonly Species[] = catalog.species;
export const CATALOG_VERSION = catalog.version;
export const FISHBASE_VERSION = catalog.fishbaseVersion;

const byId = new Map<string, Species>();
for (const s of SPECIES) byId.set(s.id, s);

/** Espécies de cada álbum, já na ordem da grade. */
const byAlbum = new Map<AlbumId, Species[]>();
for (const album of ALBUMS) {
  const lista = SPECIES.filter((s) => s.albums.includes(album.id)).sort(
    (a, b) => (a.albumOrder[album.id] ?? 0) - (b.albumOrder[album.id] ?? 0),
  );
  byAlbum.set(album.id, lista);
}

export function getSpecies(id: string): Species | undefined {
  return byId.get(id);
}

export function speciesOfAlbum(albumId: AlbumId): readonly Species[] {
  return byAlbum.get(albumId) ?? [];
}

export function getAlbum(id: AlbumId): Album | undefined {
  return ALBUMS.find((a) => a.id === id);
}

/*
 * Índice de busca.
 *
 * Cada espécie entra com o nome popular e todos os apelidos, normalizados sem acento e em
 * minúsculas. É isso que faz "traira", "lobó" e "TARAIRÁ" acharem a mesma carta — o pescador
 * está com o peixe na mão e não vai acertar o acento (PRD 9.2).
 */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // marcas de acento, já separadas pelo NFD
    .toLowerCase()
    .trim();
}

interface SearchEntry {
  species: Species;
  /** Termos normalizados: nome popular primeiro, depois os apelidos. */
  terms: string[];
}

const searchIndex: SearchEntry[] = SPECIES.map((s) => ({
  species: s,
  terms: [s.commonName, ...s.aliases, s.scientificName].map(normalize),
}));

/**
 * Busca por nome popular, apelido ou nome científico.
 *
 * Ordena por qualidade do casamento, não alfabeticamente: quem digita "tra" quer a traíra antes
 * do trairão, e quem digita "carpa" quer as carpas antes do que só tem "carpa" num apelido.
 */
export function searchSpecies(query: string, limit = 20): Species[] {
  const q = normalize(query);
  if (q.length === 0) return [];

  const hits: { species: Species; score: number }[] = [];

  for (const entry of searchIndex) {
    let best = -1;
    for (let i = 0; i < entry.terms.length; i++) {
      const term = entry.terms[i]!;
      // Nome popular (i === 0) vale mais que apelido, que vale mais que nome científico.
      const peso = i === 0 ? 0 : i < entry.species.aliases.length + 1 ? 1 : 2;
      let score = -1;
      if (term === q) score = 100 - peso;
      else if (term.startsWith(q)) score = 70 - peso;
      else if (term.includes(q)) score = 40 - peso;
      if (score > best) best = score;
    }
    if (best >= 0) hits.push({ species: entry.species, score: best });
  }

  hits.sort((a, b) => b.score - a.score || a.species.commonName.localeCompare(b.species.commonName, 'pt-BR'));
  return hits.slice(0, limit).map((h) => h.species);
}

/** Ordem de exibição da raridade, do mais comum ao mais raro. */
export const RARITY_ORDER: readonly Rarity[] = ['comum', 'incomum', 'raro', 'lendario'];

export const RARITY_LABEL: Record<Rarity, string> = {
  comum: 'Comum',
  incomum: 'Incomum',
  raro: 'Raro',
  lendario: 'Lendário',
};

/** Peso na pontuação de coleção (PRD seção 10). */
export const RARITY_POINTS: Record<Rarity, number> = {
  comum: 1,
  incomum: 3,
  raro: 8,
  lendario: 20,
};

export type { Album, AlbumId, Catalog, Rarity, Species };
