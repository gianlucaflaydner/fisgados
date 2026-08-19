/**
 * Acesso às tabelas do FishBase.
 *
 * A API REST do rOpenSci (fishbase.ropensci.org) foi descontinuada. O acesso atual é por
 * snapshots em Parquet publicados no Source Cooperative, que é o mesmo caminho que o pacote
 * rfishbase 5.x passou a usar. Baixamos uma vez, guardamos em scripts/.cache/ e lemos offline.
 *
 * Tudo aqui roda fora do app — nada disso vai para o bundle.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parquetReadObjects, parquetMetadata, parquetSchema } from 'hyparquet';

/** Os scripts rodam sempre via npm a partir da raiz do projeto. */
const CACHE_DIR = join(process.cwd(), 'scripts', '.cache');

/** Versão do snapshot. Fixada de propósito: catálogo reproduzível não pode mudar sozinho. */
export const FISHBASE_VERSION = 'v19.04';
const BASE_URL = `https://data.source.coop/cboettig/fishbase/fb/${FISHBASE_VERSION}/parquet`;

export type FishBaseTable =
  | 'species'   // uma linha por espécie aceita, com SpecCode, Genus, Species, Length, Comments
  | 'poplw'     // relações comprimento-peso: a, b, tipo de comprimento, localidade, amostra
  | 'popll'     // relações comprimento-comprimento: converte SL/FL para TL
  | 'popchar'   // recordes de tamanho e peso por população
  | 'synonyms'; // sinônimos taxonômicos — usado para detectar revisão de gênero

export type Row = Record<string, unknown>;

async function download(table: FishBaseTable): Promise<Buffer> {
  const cached = join(CACHE_DIR, `${FISHBASE_VERSION}-${table}.parquet`);
  if (existsSync(cached)) return readFile(cached);

  const url = `${BASE_URL}/${table}.parquet`;
  process.stderr.write(`  baixando ${table}.parquet ...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`falha ao baixar ${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cached, buf);
  process.stderr.write(` ${(buf.byteLength / 1024 / 1024).toFixed(1)} MB\n`);
  return buf;
}

/** Converte Buffer do Node para ArrayBuffer sem cópia extra fora dos limites da view. */
function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

const memo = new Map<FishBaseTable, Row[]>();

/** Carrega uma tabela inteira em memória. A maior (synonyms) tem ~9 MB — cabe folgado. */
export async function loadTable(table: FishBaseTable, columns?: string[]): Promise<Row[]> {
  const key = table;
  if (!columns && memo.has(key)) return memo.get(key)!;

  const file = toArrayBuffer(await download(table));
  const rows = (await parquetReadObjects({ file, columns })) as Row[];
  if (!columns) memo.set(key, rows);
  return rows;
}

/** Nomes de coluna da tabela, sem carregar os dados. Usado pelo inspect. */
export async function tableColumns(table: FishBaseTable): Promise<string[]> {
  const file = toArrayBuffer(await download(table));
  const schema = parquetSchema(parquetMetadata(file));
  return schema.children.map((c) => c.element.name);
}

export async function tableRowCount(table: FishBaseTable): Promise<number> {
  const file = toArrayBuffer(await download(table));
  return Number(parquetMetadata(file).num_rows);
}

/** Números do FishBase chegam como number, string ou null conforme a coluna. Normaliza. */
export function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

export function str(v: unknown): string {
  return v === null || v === undefined ? '' : String(v).trim();
}
