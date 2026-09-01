/**
 * Aplica a curadoria manual das fotos — `scripts/fotos-escolhidas.json`.
 *
 *   npm run photos:apply
 *
 * A busca automática propõe a primeira candidata; a revisão visual decide. Sem este passo, a
 * primeira rodada trouxe esqueletos na areia, aves segurando o peixe, pranchas de livro antigo e
 * a mesma foto de carpa repetida em três espécies — porque "research grade" no iNaturalist quer
 * dizer que a identificação foi confirmada, não que a foto sirva para uma carta.
 *
 * Roda depois de `photos:fetch` e antes de `photos:prepare`, que normaliza e regenera o mapa e os
 * créditos a partir do manifesto já corrigido aqui.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();
const ESCOLHAS = join(RAIZ, 'scripts', 'fotos-escolhidas.json');
const ALTERNATIVAS = join(RAIZ, 'scripts', '.cache', 'alternativas.json');
const MANIFESTO = join(RAIZ, 'scripts', '.cache', 'fotos.json');
const DESTINO = join(RAIZ, 'assets', 'especies');

const AGENTE = 'fisgados-catalog/0.1 (+https://github.com/fisgados; catalogo de especies)';

interface Candidata {
  fonte: string;
  url: string;
  licenca: string;
  autor: string;
  pagina: string;
}
interface Escolha {
  indice: number | null;
  motivo?: string;
  nota?: string;
}

const escolhas = JSON.parse(readFileSync(ESCOLHAS, 'utf8')) as Record<string, Escolha | string[]>;
const alternativas = JSON.parse(readFileSync(ALTERNATIVAS, 'utf8')) as Record<string, Candidata[]>;
const manifesto = JSON.parse(readFileSync(MANIFESTO, 'utf8')) as Array<{
  id: string;
  commonName: string;
  candidatas: Candidata[];
}>;

mkdirSync(DESTINO, { recursive: true });
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

let trocadas = 0;
let removidas = 0;
const falhas: string[] = [];
const comRessalva: string[] = [];

for (const [id, valor] of Object.entries(escolhas)) {
  // Chaves de comentário no JSON não são espécies.
  if (id.startsWith('_') || Array.isArray(valor)) continue;
  const escolha = valor;

  const entrada = manifesto.find((e) => e.id === id);
  if (!entrada) {
    falhas.push(`${id}: não está no manifesto`);
    continue;
  }

  // Sem candidata aceitável: a espécie fica sem foto, de propósito. Foto errada num app que
  // existe para dizer qual peixe é seria pior do que a ausência.
  if (escolha.indice === null) {
    for (const ext of ['jpg', 'png', 'webp']) {
      const arq = join(DESTINO, `${id}.${ext}`);
      if (existsSync(arq)) rmSync(arq);
    }
    entrada.candidatas = [];
    removidas++;
    if (escolha.nota) comRessalva.push(`${entrada.commonName}: ${escolha.nota}`);
    continue;
  }

  const candidata = alternativas[id]?.[escolha.indice];
  if (!candidata) {
    falhas.push(`${id}: candidata ${escolha.indice} não existe`);
    continue;
  }

  try {
    const r = await fetch(candidata.url, { headers: { 'User-Agent': AGENTE } });
    if (!r.ok) {
      falhas.push(`${id}: HTTP ${r.status}`);
      continue;
    }
    const bytes = Buffer.from(await r.arrayBuffer());
    if (bytes.length === 0) {
      falhas.push(`${id}: arquivo vazio`);
      continue;
    }

    // Extensão pela URL; o photos:prepare depois normaliza tudo para .jpg de verdade.
    const ext = /\.(png|webp|jpe?g)(\?|$)/i.exec(candidata.url)?.[1]?.toLowerCase() ?? 'jpg';
    for (const antiga of ['jpg', 'png', 'webp']) {
      const arq = join(DESTINO, `${id}.${antiga}`);
      if (existsSync(arq)) rmSync(arq);
    }
    writeFileSync(join(DESTINO, `${id}.${ext === 'jpeg' ? 'jpg' : ext}`), bytes);

    // O manifesto passa a apontar para a escolhida, senão os créditos gerados creditariam a
    // foto que foi descartada.
    entrada.candidatas = [candidata, ...entrada.candidatas.filter((c) => c.url !== candidata.url)];
    trocadas++;
    if (escolha.nota) comRessalva.push(`${entrada.commonName}: ${escolha.nota}`);
  } catch (erro) {
    falhas.push(`${id}: ${erro instanceof Error ? erro.message : String(erro)}`);
  }

  process.stdout.write(`\r${trocadas} trocadas  ${id}          `);
  await espera(250);
}

writeFileSync(MANIFESTO, JSON.stringify(manifesto, null, 2));

console.log(`\n\n${trocadas} foto(s) trocada(s), ${removidas} removida(s)`);
if (comRessalva.length > 0) {
  console.log(`\ncom ressalva (${comRessalva.length}):`);
  for (const r of comRessalva) console.log(`  ${r}`);
}
if (falhas.length > 0) {
  console.log(`\nfalhas (${falhas.length}):`);
  for (const f of falhas) console.log(`  ${f}`);
}
console.log('\nagora rode: npm run photos:prepare');
