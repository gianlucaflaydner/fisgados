/**
 * Testes da camada de domínio — as regras do PRD que valem verificar (SDD seção 7).
 *
 * Roda em Node, sem React Native: `domain/` e `catalog/` são código puro justamente para que
 * isso seja possível sem emulador.
 *
 *   npm test
 */

import assert from 'node:assert/strict';
import { getSpecies, searchSpecies, SPECIES } from '../src/catalog/index.ts';
import { personalBest, rankCatches, shouldRankByWeight } from '../src/domain/ranking.ts';
import {
  checkMeasure,
  estimateWeightG,
  isTrophy,
  measureLabel,
  weightLabel,
} from '../src/domain/weight.ts';

let passou = 0;
const falhas: string[] = [];

function teste(nome: string, fn: () => void) {
  try {
    fn();
    passou++;
  } catch (e) {
    falhas.push(`${nome}\n    ${(e as Error).message.split('\n')[0]}`);
  }
}

// ─────────────────────────────────────────────────────────────── catálogo

teste('catálogo carrega e indexa por id', () => {
  const traira = getSpecies('traira');
  assert.ok(traira, 'traíra deveria existir');
  assert.equal(traira.scientificName, 'Hoplias malabaricus');
});

teste('busca acha sem acento', () => {
  const r = searchSpecies('traira');
  assert.equal(r[0]?.id, 'traira', 'primeiro resultado deveria ser a traíra');
});

teste('busca acha por apelido regional', () => {
  assert.equal(searchSpecies('curimba')[0]?.id, 'grumata');
  assert.equal(searchSpecies('lobó')[0]?.id, 'traira');
  assert.equal(searchSpecies('israel')[0]?.id, 'carpa-espelho');
});

teste('busca prefere nome exato a substring', () => {
  // "traira" casa com traíra e trairão; o exato tem que vir antes.
  const r = searchSpecies('traira');
  assert.equal(r[0]?.id, 'traira');
  assert.ok(r.some((s) => s.id === 'trairao'), 'trairão deveria aparecer também');
});

teste('busca vazia não devolve nada', () => {
  assert.equal(searchSpecies('   ').length, 0);
});

// ─────────────────────────────────────────────────────────────── peso (RN05)

teste('estimativa de peso bate com a ordem de grandeza conhecida', () => {
  const traira = getSpecies('traira')!;
  const g = estimateWeightG(32, traira)!;
  // Uma traíra de 32 cm pesa perto de 450 g. Erro de unidade apareceria como 10x ou 1000x.
  assert.ok(g > 300 && g < 600, `esperava 300–600 g, veio ${Math.round(g)} g`);
});

teste('espécie sem coeficiente não estima', () => {
  const surubim = getSpecies('surubim-do-uruguai')!;
  assert.equal(surubim.lengthWeight, null);
  assert.equal(estimateWeightG(60, surubim), null);
});

teste('peso real sobrescreve o estimado na exibição (RN05)', () => {
  assert.equal(weightLabel(2400, 2000), '2,40 kg');
  assert.equal(weightLabel(null, 2000), '≈ 2,00 kg (estimado)');
  assert.equal(weightLabel(null, null), null);
});

teste('rótulo da medida muda para arraia (RN04)', () => {
  assert.equal(measureLabel(getSpecies('traira')!), 'Comprimento');
  assert.equal(measureLabel(getSpecies('raia-manteiga')!), 'Largura do disco');
});

// ─────────────────────────────────────────────────────────── validação (RN04)

teste('medida fora de 5–250 cm é rejeitada', () => {
  const traira = getSpecies('traira')!;
  assert.equal(checkMeasure(3, traira).ok, false);
  assert.equal(checkMeasure(300, traira).ok, false);
  assert.equal(checkMeasure(0, traira).ok, false);
  assert.equal(checkMeasure(Number.NaN, traira).ok, false);
});

teste('medida fora da faixa da espécie pede confirmação, não bloqueia', () => {
  const traira = getSpecies('traira')!; // faixa 15–60 cm
  const r = checkMeasure(80, traira);
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.kind, 'fora-da-especie');
});

teste('medida dentro da faixa passa', () => {
  assert.equal(checkMeasure(32, getSpecies('traira')!).ok, true);
});

// ────────────────────────────────────────────────────────────── troféu (RN19)

teste('troféu exige 80% do máximo da espécie', () => {
  const traira = getSpecies('traira')!; // máximo 60 cm → troféu a partir de 48
  assert.equal(isTrophy(47, traira), false);
  assert.equal(isTrophy(48, traira), true);
  assert.equal(isTrophy(60, traira), true);
});

// ────────────────────────────────────────────────────── ranking (RN06, RN07)

const c = (id: string, lengthCm: number, weightG: number | null, caughtAt: string) => ({
  id,
  lengthCm,
  weightG,
  caughtAt,
});

teste('ordena por peso só quando todos têm peso real (RN06)', () => {
  assert.equal(
    shouldRankByWeight([c('a', 40, 1000, '2026-01-01T10:00:00Z'), c('b', 50, 900, '2026-01-02T10:00:00Z')]),
    true,
  );
  assert.equal(
    shouldRankByWeight([c('a', 40, 1000, '2026-01-01T10:00:00Z'), c('b', 50, null, '2026-01-02T10:00:00Z')]),
    false,
  );
  assert.equal(shouldRankByWeight([]), false);
});

teste('com peso em todos, o mais pesado vence mesmo sendo mais curto', () => {
  const r = rankCatches([
    c('curto-pesado', 40, 1500, '2026-01-01T10:00:00Z'),
    c('longo-leve', 55, 900, '2026-01-02T10:00:00Z'),
  ]);
  assert.equal(r[0]?.id, 'curto-pesado');
});

teste('faltando um peso, cai para comprimento (RN06)', () => {
  const r = rankCatches([
    c('curto-pesado', 40, 1500, '2026-01-01T10:00:00Z'),
    c('longo-sem-peso', 55, null, '2026-01-02T10:00:00Z'),
  ]);
  assert.equal(r[0]?.id, 'longo-sem-peso');
});

teste('empate vence o mais antigo (RN07)', () => {
  const r = rankCatches([
    c('novo', 50, null, '2026-03-01T10:00:00Z'),
    c('antigo', 50, null, '2026-01-01T10:00:00Z'),
  ]);
  assert.equal(r[0]?.id, 'antigo');
});

teste('rankCatches não muta a lista recebida', () => {
  const lista = [c('a', 10, null, '2026-01-01T10:00:00Z'), c('b', 90, null, '2026-01-02T10:00:00Z')];
  rankCatches(lista);
  assert.equal(lista[0]?.id, 'a');
});

teste('recorde pessoal de lista vazia é null', () => {
  assert.equal(personalBest([]), null);
});

// ───────────────────────────────────────────────────────── integridade do catálogo

teste('toda espécie com coeficiente produz peso plausível no tamanho médio', () => {
  for (const s of SPECIES) {
    if (!s.lengthWeight) continue;
    const g = estimateWeightG(s.avgLengthCm, s)!;
    assert.ok(g > 1 && g < 200_000, `${s.id}: ${Math.round(g)} g no tamanho médio`);
  }
});

teste('faixa de toda espécie respeita min < avg < max e a RN04', () => {
  for (const s of SPECIES) {
    assert.ok(
      s.minLengthCm < s.avgLengthCm && s.avgLengthCm < s.maxLengthCm,
      `${s.id}: faixa incoerente`,
    );
    assert.ok(s.minLengthCm >= 5 && s.maxLengthCm <= 250, `${s.id}: fora do limite da RN04`);
  }
});

teste('todo id de semelhança visual aponta para uma carta que existe', () => {
  const ids = new Set(SPECIES.map((s) => s.id));
  for (const s of SPECIES) {
    for (const ref of s.visuallySimilarTo) {
      assert.ok(ids.has(ref), `${s.id} aponta para "${ref}", que não existe`);
    }
  }
});

// ──────────────────────────────────────────────────────────────────── resultado

console.log(`\n${passou} passou, ${falhas.length} falhou\n`);
for (const f of falhas) console.log(`  ✗ ${f}\n`);
if (falhas.length > 0) process.exit(1);
