/**
 * Etapa 0 — gera src/catalog/species.json a partir da curadoria manual + FishBase.
 *
 *   npm run catalog:build
 *
 * Roda offline depois do primeiro download (cache em scripts/.cache/). Nada disso executa em
 * tempo de app: o resultado é um JSON estático embarcado no bundle (SDD seção 1).
 *
 * O script não tenta "consertar" o catálogo sozinho. Ele monta, confere e **reclama** — a
 * lista de alertas no fim é a pauta da validação de campo do PRD 9.1.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { loadTable, num, str, FISHBASE_VERSION, type Row } from './lib/fishbase.mts';
import { ALBUM_LAYOUT, CURATED_SPECIES, type CuratedSpecies } from './catalog/species-source.mts';
import type {
  Album,
  AlbumId,
  BadgeLine,
  Catalog,
  LengthWeight,
  Species,
} from '../src/catalog/types.ts';

const CATALOG_VERSION = 1;
const OUT_JSON = join(process.cwd(), 'src', 'catalog', 'species.json');
const OUT_REPORT = join(process.cwd(), 'catalog-report.md');

const ALBUM_NAMES: Record<AlbumId, string> = {
  'pesqueiros-sul': 'Pesqueiros do Sul',
  'rios-acudes-sul': 'Rios e açudes do Sul',
  'costa-sul': 'Costa e lagoas do Sul',
};

/**
 * Posição de cada carta na grade, derivada de ALBUM_LAYOUT. Índice 1 é a primeira carta.
 * Ter a ordem numa lista só, e não espalhada em 86 espécies, é o que torna barato reorganizar
 * o álbum — e o que garante que não existam duas cartas na mesma posição.
 */
const CARD_POSITION = new Map<string, number>();
for (const [album, ids] of Object.entries(ALBUM_LAYOUT) as [AlbumId, string[]][]) {
  ids.forEach((id, i) => CARD_POSITION.set(`${album}|${id}`, i + 1));
}

const problems: string[] = [];
const warnings: string[] = [];
const notes: string[] = [];

const fail = (msg: string) => problems.push(msg);
const warn = (msg: string) => warnings.push(msg);
const note = (msg: string) => notes.push(msg);

// ─────────────────────────────────────────────────────────────────────── utilidades

/** O FishBase guarda acentos como escapes latin-1: "Paran<e1>" → "Paraná". */
function decodeFishBaseText(s: string): string {
  return s.replace(/<([0-9a-fA-F]{2})>/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

const fmtWeight = (g: number) =>
  g >= 1000 ? `${(g / 1000).toFixed(2).replace('.', ',')} kg` : `${Math.round(g)} g`;

/** Regra de fallback do PRD 11.6, para espécie sem nomes escritos à mão. */
function fallbackBadges(commonName: string): Omit<BadgeLine, 'curated'> {
  return {
    bronze: `Fisgou ${commonName}`,
    prata: `Repeteco de ${commonName}`,
    ouro: `Pescador de ${commonName}`,
    platina: `Mestre de ${commonName}`,
    diamante: `Lenda de ${commonName}`,
  };
}

function buildBadges(c: CuratedSpecies): BadgeLine {
  const base = c.badges ?? fallbackBadges(c.commonName);
  const lendaria = c.rarity === 'lendario';
  return {
    // Lendária pula bronze e prata: a primeira captura já entrega o ouro (PRD 11.6).
    bronze: lendaria ? null : (base.bronze ?? null),
    prata: lendaria ? null : (base.prata ?? null),
    ouro: base.ouro,
    platina: base.platina,
    diamante: base.diamante,
    curated: c.badges !== undefined,
  };
}

// ──────────────────────────────────────────────────────────── validação estrutural

function validateStructure(list: CuratedSpecies[]) {
  const ids = new Set<string>();
  const orderByAlbum = new Map<AlbumId, Map<number, string>>();
  const cardCount: Record<string, number> = {};

  for (const s of list) {
    if (ids.has(s.id)) fail(`id duplicado: ${s.id}`);
    ids.add(s.id);

    if (!/^[a-z0-9-]+$/.test(s.id)) fail(`id fora do padrão slug: ${s.id}`);

    if (!(s.minLengthCm < s.avgLengthCm && s.avgLengthCm < s.maxLengthCm)) {
      fail(`${s.id}: faixa incoerente (min ${s.minLengthCm} / avg ${s.avgLengthCm} / max ${s.maxLengthCm})`);
    }
    // RN04: o app aceita de 5 a 250 cm. Faixa fora disso nunca seria registrável.
    if (s.minLengthCm < 5 || s.maxLengthCm > 250) {
      fail(`${s.id}: faixa fora do limite da RN04 (5–250 cm)`);
    }

    if (s.albums.length === 0) fail(`${s.id}: não pertence a nenhum álbum`);

    for (const album of s.albums) {
      cardCount[album] = (cardCount[album] ?? 0) + 1;
      // A espécie diz que está no álbum; o layout tem que concordar.
      if (!CARD_POSITION.has(`${album}|${s.id}`)) {
        fail(`${s.id}: declara o álbum ${album}, mas não aparece em ALBUM_LAYOUT['${album}']`);
      }
      if (!orderByAlbum.has(album)) orderByAlbum.set(album, new Map());
      orderByAlbum.get(album)!.set(CARD_POSITION.get(`${album}|${s.id}`)!, s.id);
    }
  }

  // E o contrário: o layout não pode citar carta que não existe ou que não declara o álbum.
  for (const [album, ids] of Object.entries(ALBUM_LAYOUT) as [AlbumId, string[]][]) {
    const vistos = new Set<string>();
    for (const id of ids) {
      if (vistos.has(id)) fail(`ALBUM_LAYOUT['${album}']: "${id}" aparece duas vezes`);
      vistos.add(id);
      const sp = list.find((x) => x.id === id);
      if (!sp) fail(`ALBUM_LAYOUT['${album}']: "${id}" não existe em CURATED_SPECIES`);
      else if (!sp.albums.includes(album)) {
        fail(`ALBUM_LAYOUT['${album}']: "${id}" está na grade mas não declara esse álbum`);
      }
    }
  }

  /*
   * Duas cartas com o mesmo nome científico só são legítimas se ambas declararem `variety` —
   * carpa-espelho e carpa-colorida ao lado da carpa-húngara. Sem isso, nome repetido é quase
   * sempre copiar-colar de uma entrada e esquecer de trocar a espécie.
   */
  const byScientific = new Map<string, CuratedSpecies[]>();
  for (const s of list) {
    const key = s.scientificName.toLowerCase();
    const list_ = byScientific.get(key);
    if (list_) list_.push(s);
    else byScientific.set(key, [s]);
  }
  for (const [name, group] of byScientific) {
    if (group.length === 1) continue;
    // Uma carta sem `variety` é a forma nominal — a carpa-húngara é a carpa, sem adjetivo.
    // Duas ou mais é copiar-colar que esqueceu de trocar a espécie.
    const semVariedade = group.filter((s) => !s.variety);
    if (semVariedade.length > 1) {
      fail(
        `"${name}" em ${group.length} cartas, e ${semVariedade.map((s) => s.id).join(', ')} ` +
          `não declaram variety — só a forma nominal pode ficar sem`,
      );
    }
  }

  for (const s of list) {
    for (const ref of s.visuallySimilarTo) {
      if (!ids.has(ref)) fail(`${s.id}: visuallySimilarTo aponta para id inexistente "${ref}"`);
      else {
        const other = list.find((x) => x.id === ref)!;
        // A confusão da IA é mútua: se A parece B, B parece A (SDD 6.3).
        if (!other.visuallySimilarTo.includes(s.id)) {
          warn(`semelhança assimétrica: ${s.id} → ${ref}, mas ${ref} não aponta de volta`);
        }
      }
    }
  }

  for (const album of Object.keys(ALBUM_LAYOUT) as AlbumId[]) {
    const got = cardCount[album] ?? 0;
    const naGrade = ALBUM_LAYOUT[album].length;
    if (got !== naGrade) {
      fail(`${album}: ${got} espécies declaram o álbum, mas a grade tem ${naGrade} cartas`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────── nomenclatura

interface Taxonomy {
  specCode: number | null;
  status: Species['taxonomy']['status'];
  acceptedName: string | null;
  fbMaxLengthCm: number | null;
  fbMaxLengthType: string;
  fbMaxWeightG: number | null;
}

function findSpecCode(scientificName: string, speciesRows: Row[]): number | null {
  const [genus, epithet] = scientificName.split(' ');
  const hit = speciesRows.find(
    (r) => str(r.Genus).toLowerCase() === genus?.toLowerCase() &&
           str(r.Species).toLowerCase() === epithet?.toLowerCase(),
  );
  return hit ? num(hit.SpecCode) : null;
}

function resolveTaxonomy(c: CuratedSpecies, speciesRows: Row[], synonymRows: Row[]): Taxonomy {
  const empty: Taxonomy = {
    specCode: null,
    status: 'nao-encontrado',
    acceptedName: null,
    fbMaxLengthCm: null,
    fbMaxLengthType: '',
    fbMaxWeightG: null,
  };

  if (c.hybrid) return { ...empty, status: 'hibrido' };

  const [genus, epithet] = (c.fishbaseName ?? c.scientificName).split(' ');
  const hit = speciesRows.find(
    (r) => str(r.Genus).toLowerCase() === genus?.toLowerCase() &&
           str(r.Species).toLowerCase() === epithet?.toLowerCase(),
  );

  if (hit) {
    return {
      specCode: num(hit.SpecCode),
      status: 'aceito',
      acceptedName: null,
      fbMaxLengthCm: num(hit.Length),
      fbMaxLengthType: str(hit.LTypeMaxM),
      fbMaxWeightG: num(hit.Weight),
    };
  }

  // Não é nome aceito. Pode ser sinônimo — é exatamente o caso do Megaleporinus (PRD 9.1).
  const syn = synonymRows.find(
    (r) => str(r.SynGenus).toLowerCase() === genus?.toLowerCase() &&
           str(r.SynSpecies).toLowerCase() === epithet?.toLowerCase(),
  );
  if (!syn) return empty;

  const validCode = num(syn.SpecCode);
  const accepted = speciesRows.find((r) => num(r.SpecCode) === validCode);
  const acceptedName = accepted ? `${str(accepted.Genus)} ${str(accepted.Species)}` : null;

  return {
    specCode: validCode,
    status: 'sinonimo',
    acceptedName,
    fbMaxLengthCm: accepted ? num(accepted.Length) : null,
    fbMaxLengthType: accepted ? str(accepted.LTypeMaxM) : '',
    fbMaxWeightG: accepted ? num(accepted.Weight) : null,
  };
}

// ──────────────────────────────────────────────────────── comprimento-peso (a, b)

const SOUTH_AMERICA =
  /brasil|brazil|paran|uruguai|uruguay|argentin|plata|guaiba|guaíba|patos|itaipu|igua|jacui|jacuí|rio grande|santa catarina|pantanal|amazon|pampa/i;

function median(xs: number[]): number {
  const s = [...xs].sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/**
 * Conversão de comprimento padrão/furcal para total, a partir da tabela popll — cuja convenção
 * é `Length1 = a + b × Length2`.
 *
 * A relação é linear com intercepto, não uma escala pura, e o intercepto não é sempre pequeno:
 * o cascudo tem `TL = 3,47 + 1,23 × SL`, onde ignorar os 3,47 cm erra o peso em quase metade.
 * Como o coeficiente de peso é uma potência, precisamos de um fator multiplicativo — então
 * linearizamos **no tamanho que interessa**, o comprimento médio da espécie, onde a estimativa
 * será usada de fato. Fora dessa vizinhança o erro cresce, e é um preço conhecido.
 */
class LengthConverter {
  private readonly genusOf = new Map<number, string>();
  private readonly codesByGenus = new Map<string, number[]>();

  constructor(
    private readonly llRows: Row[],
    speciesRows: Row[],
  ) {
    for (const r of speciesRows) {
      const code = num(r.SpecCode);
      const genus = str(r.Genus);
      if (code === null || !genus) continue;
      this.genusOf.set(code, genus);
      const list = this.codesByGenus.get(genus);
      if (list) list.push(code);
      else this.codesByGenus.set(genus, [code]);
    }
  }

  /** Razões efetivas TL/from em `atLengthCm`, extraídas das linhas de um conjunto de espécies. */
  private ratiosFor(codes: Set<number>, from: string, atLengthCm: number): number[] {
    const out: number[] = [];
    for (const r of this.llRows) {
      const code = num(r.SpecCode);
      if (code === null || !codes.has(code)) continue;

      const l1 = str(r.Length1).toUpperCase();
      const l2 = str(r.Length2).toUpperCase();
      const a = num(r.a);
      const b = num(r.b);
      if (a === null || b === null || b <= 0) continue;

      let other: number;
      if (l1 === 'TL' && l2 === from) other = (atLengthCm - a) / b; // TL = a + b·X
      else if (l1 === from && l2 === 'TL') other = a + b * atLengthCm; // X = a + b·TL
      else continue;

      if (other <= 0) continue;
      const ratio = atLengthCm / other;
      // TL menor que SL, ou mais que o dobro dele, é linha corrompida no FishBase.
      if (ratio > 1 && ratio < 2) out.push(ratio);
    }
    return out;
  }

  /**
   * Razão TL/from. Tenta a própria espécie; sem dado, cai para o gênero — as proporções
   * corporais são conservadas entre congêneres, e o fallback vem sinalizado para o relatório.
   */
  ratioToTL(
    specCode: number,
    from: string,
    atLengthCm: number,
  ): { ratio: number; viaGenus: boolean } | null {
    const own = this.ratiosFor(new Set([specCode]), from, atLengthCm);
    if (own.length > 0) return { ratio: median(own), viaGenus: false };

    const genus = this.genusOf.get(specCode);
    if (!genus) return null;
    const siblings = new Set(this.codesByGenus.get(genus) ?? []);
    siblings.delete(specCode);
    const fromGenus = this.ratiosFor(siblings, from, atLengthCm);
    if (fromGenus.length === 0) return null;

    return { ratio: median(fromGenus), viaGenus: true };
  }
}

interface Candidate {
  a: number;
  b: number;
  locality: string;
  sampleSize: number | null;
  /** De onde veio o `a` em TL: direto, campo aTL do FishBase, ou conversão via popll. */
  origin: 'TL' | 'aTL' | 'convertido';
  /** A conversão de comprimento veio de congêneres, não da própria espécie. */
  viaGenus: boolean;
  score: number;
  /** A faixa do estudo alcança o tamanho médio da espécie? */
  inRange: boolean;
  studyMax: number | null;
  /** Peso previsto no tamanho médio da espécie — base da rejeição de outlier. */
  predAvg: number;
}

function pickLengthWeight(
  specCode: number | null,
  avgLengthCm: number,
  wantType: 'TL' | 'WD',
  lwRows: Row[],
  converter: LengthConverter,
): {
  chosen: Candidate | null;
  kept: number;
  outliers: number;
  rejected: number;
  extrapolated: boolean;
} {
  if (specCode === null) return { chosen: null, kept: 0, outliers: 0, rejected: 0, extrapolated: false };

  const rows = lwRows.filter((r) => num(r.SpecCode) === specCode);
  let rejected = 0;
  const candidates: Candidate[] = [];

  for (const r of rows) {
    // EsQ marca a relação como duvidosa no próprio FishBase. Não discutimos com o revisor.
    if (/^yes$/i.test(str(r.EsQ))) {
      rejected++;
      continue;
    }

    const b = num(r.b);
    const type = str(r.Type).toUpperCase();
    const aRaw = num(r.a);
    const aTL = num(r.aTL);
    if (b === null || b <= 0) {
      rejected++;
      continue;
    }

    /*
     * O coeficiente precisa estar no mesmo eixo em que o pescador vai medir o peixe.
     *
     * Para arraia esse eixo é a largura do disco, e não existe conversão publicada de WD para
     * mais nada — então ou o estudo já está em WD, ou está fora. É restritivo de propósito:
     * misturar comprimento com largura numa potência erra o peso por um fator, não por uma
     * margem.
     */
    let a: number | null = null;
    let origin: Candidate['origin'] = 'TL';
    let viaGenus = false;
    let toTL = 1; // fator para levar a faixa do estudo ao mesmo eixo

    if (wantType === 'WD') {
      if (type === 'WD' && aRaw !== null) a = aRaw;
    } else if (type === 'TL' && aRaw !== null) {
      a = aRaw;
    } else if (aTL !== null) {
      a = aTL;
      origin = 'aTL';
    } else if ((type === 'SL' || type === 'FL') && aRaw !== null) {
      const conv = converter.ratioToTL(specCode, type, avgLengthCm);
      // W = a·X^b e X ≈ TL/ratio  ⟹  W ≈ (a / ratio^b)·TL^b
      if (conv !== null) {
        a = aRaw / Math.pow(conv.ratio, b);
        origin = 'convertido';
        viaGenus = conv.viaGenus;
        toTL = conv.ratio;
      }
    }

    if (a === null || a <= 0) {
      rejected++;
      continue;
    }

    const locality = decodeFishBaseText(str(r.Locality));
    const n = num(r.Number);
    const sex = str(r.Sex).toLowerCase();

    /*
     * A faixa de comprimento do estudo é o filtro que mais importa, e é o mais fácil de
     * esquecer. Uma regressão ajustada em robalos de 3 a 17 cm descreve juvenis muito bem e
     * não diz nada sobre um exemplar de 50 cm — extrapolar dali erra por mais da metade.
     * Estudo que não alcança o tamanho médio da espécie fica fora enquanto houver alternativa.
     */
    // A faixa do estudo está no eixo do próprio estudo; levamos ao mesmo eixo antes de comparar.
    const rawMax = num(r.LengthMax);
    const studyMax = rawMax === null ? null : rawMax * toTL;
    const inRange = studyMax === null || studyMax >= avgLengthCm;

    let score = Math.log10(Math.max(n ?? 1, 1));
    if (SOUTH_AMERICA.test(locality)) score += 2;
    if (origin === 'convertido') score -= viaGenus ? 1 : 0.5;
    if (sex === 'juvenile') score -= 2;
    else if (sex === 'male' || sex === 'female') score -= 0.5;

    candidates.push({
      a,
      b,
      locality,
      sampleSize: n,
      origin,
      viaGenus,
      score,
      inRange,
      studyMax,
      predAvg: a * Math.pow(avgLengthCm, b),
    });
  }

  if (candidates.length === 0) return { chosen: null, kept: 0, outliers: 0, rejected, extrapolated: false };

  /*
   * Rejeição de outlier antes de escolher.
   *
   * Os estudos discordam, e às vezes discordam por ordem de grandeza — convenção de medida
   * diferente, erro de digitação, extrapolação de uma amostra de juvenis. Comparar `a` e `b`
   * isolados não ajuda: eles são correlacionados, e um par estranho pode prever bem. Então
   * comparamos o que de fato importa, o **peso previsto no tamanho médio da espécie**, e
   * descartamos quem se afasta mais que o dobro do consenso. Só depois vale procedência.
   */
  // Estudos que alcançam o tamanho da espécie têm prioridade absoluta sobre procedência e
  // amostra. Só quando nenhum alcança é que voltamos a considerar todos.
  const covering = candidates.filter((c) => c.inRange);
  const eligible = covering.length > 0 ? covering : candidates;
  const extrapolated = covering.length === 0;

  const preds = eligible.map((c) => c.predAvg).sort((x, y) => x - y);
  const mid = Math.floor(preds.length / 2);
  const median = preds.length % 2 ? preds[mid]! : (preds[mid - 1]! + preds[mid]!) / 2;

  const survivors = eligible.filter((c) => c.predAvg / median <= 2 && median / c.predAvg <= 2);
  const pool = survivors.length > 0 ? survivors : eligible;

  pool.sort((x, y) => y.score - x.score || (y.sampleSize ?? 0) - (x.sampleSize ?? 0));
  return {
    chosen: pool[0]!,
    kept: pool.length,
    outliers: candidates.length - survivors.length,
    rejected,
    extrapolated,
  };
}

// ───────────────────────────────────────────────────────────────────────── build

async function main() {
  console.log(`Catálogo Fisgados — build (FishBase ${FISHBASE_VERSION})\n`);

  validateStructure(CURATED_SPECIES);

  console.log('Carregando tabelas do FishBase:');
  const [speciesRows, lwRows, llRows, synonymRows] = await Promise.all([
    loadTable('species'),
    loadTable('poplw'),
    loadTable('popll'),
    loadTable('synonyms'),
  ]);
  console.log('');

  const converter = new LengthConverter(llRows, speciesRows);

  const sanity: {
    id: string;
    name: string;
    avgCm: number;
    avgG: number | null;
    maxCm: number;
    maxG: number | null;
    fbMaxG: number | null;
  }[] = [];

  const species: Species[] = CURATED_SPECIES.map((c) => {
    const tax = resolveTaxonomy(c, speciesRows, synonymRows);

    if (tax.status === 'nao-encontrado') {
      fail(`${c.id}: "${c.scientificName}" não existe no FishBase, nem como sinônimo — conferir grafia`);
    }
    if (tax.status === 'sinonimo') {
      fail(
        `${c.id}: "${c.scientificName}" é SINÔNIMO. Nome aceito hoje: "${tax.acceptedName ?? '?'}" — ` +
          `atualizar species-source.mts`,
      );
    }

    if (c.fishbaseName) {
      note(`${c.id}: coeficiente buscado como "${c.fishbaseName}" — o FishBase v19.04 ainda não separou a espécie`);
    }

    const wantType = c.measure === 'largura' ? 'WD' : 'TL';
    let picked = pickLengthWeight(tax.specCode, c.avgLengthCm, wantType, lwRows, converter);
    let proxyName: string | null = null;

    /*
     * O empréstimo de congênere é a última tentativa, não a primeira. Se um dia o FishBase
     * publicar um estudo para a própria espécie, o proxy sai de cena sozinho no próximo build.
     */
    if (!picked.chosen && c.fishbaseWeightProxy) {
      const proxyCode = findSpecCode(c.fishbaseWeightProxy, speciesRows);
      if (proxyCode === null) {
        fail(`${c.id}: proxy "${c.fishbaseWeightProxy}" não existe no FishBase`);
      } else {
        const viaProxy = pickLengthWeight(proxyCode, c.avgLengthCm, wantType, lwRows, converter);
        if (viaProxy.chosen) {
          picked = viaProxy;
          proxyName = c.fishbaseWeightProxy;
          note(`${c.id}: peso estimado por empréstimo de ${c.fishbaseWeightProxy}`);
        }
      }
    }

    const { chosen, kept, outliers, rejected } = picked;

    let lengthWeight: LengthWeight | null = null;
    if (chosen) {
      lengthWeight = {
        a: Number(chosen.a.toPrecision(6)),
        b: chosen.b,
        lengthType: wantType,
        origin: chosen.origin,
        proxySpecies: proxyName,
        locality: chosen.locality || '(não informada)',
        sampleSize: chosen.sampleSize,
        candidates: kept,
        fishbaseVersion: FISHBASE_VERSION,
      };

      // b fora de 2,5–3,5 é biologicamente possível, mas raro o bastante para merecer olhada.
      if (chosen.b < 2.5 || chosen.b > 3.5) {
        warn(`${c.id}: expoente b = ${chosen.b} fora da faixa usual (2,5–3,5) — ${chosen.locality}`);
      }
      if (outliers > 0) {
        note(`${c.id}: ${outliers} estudo(s) descartado(s) por destoarem do consenso`);
      }
      if (picked.extrapolated) {
        warn(
          `${c.id}: nenhum estudo alcança ${c.avgLengthCm} cm (o melhor vai até ` +
            `${chosen.studyMax ?? '?'} cm) — a estimativa é extrapolação`,
        );
      }
    } else if (c.hybrid) {
      note(`${c.id}: híbrido, sem coeficiente próprio — peso real será obrigatório na prática`);
    } else if (tax.specCode !== null) {
      warn(
        `${c.id}: nenhuma relação comprimento-peso em TL no FishBase ` +
          `(${rejected} registro(s) descartado(s)) — não estima peso`,
      );
    }

    const est = (cm: number) => (lengthWeight ? lengthWeight.a * Math.pow(cm, lengthWeight.b) : null);
    const avgG = est(c.avgLengthCm);
    const maxG = est(c.maxLengthCm);

    /*
     * A faixa curada é regional; a do FishBase é mundial. Curada acima da mundial é sinal de
     * erro — mas só depois de acertar a unidade: o FishBase publica o máximo em SL para boa
     * parte das espécies, e comparar SL com TL acusa erro onde não há.
     */
    let fbMaxTL = tax.fbMaxLengthCm;
    let fbMaxLabel = `${tax.fbMaxLengthCm} cm ${tax.fbMaxLengthType || 'sem tipo'}`;
    if (fbMaxTL !== null && tax.specCode !== null && /^(SL|FL)$/.test(tax.fbMaxLengthType)) {
      const conv = converter.ratioToTL(tax.specCode, tax.fbMaxLengthType, fbMaxTL);
      if (conv !== null) {
        fbMaxTL = fbMaxTL * conv.ratio;
        fbMaxLabel = `${tax.fbMaxLengthCm} cm ${tax.fbMaxLengthType} → ${fbMaxTL.toFixed(0)} cm TL`;
      } else {
        fbMaxTL = null; // sem conversão confiável, não há comparação honesta a fazer
        note(`${c.id}: máximo do FishBase está em ${tax.fbMaxLengthType} e não há conversão — faixa não conferida`);
      }
    }
    if (fbMaxTL !== null && c.maxLengthCm > fbMaxTL * 1.1) {
      warn(
        `${c.id}: maxLengthCm curado (${c.maxLengthCm} cm) acima do máximo mundial do FishBase ` +
          `(${fbMaxLabel})`,
      );
    }

    /*
     * Referência de peso máximo — usada como controle da ordem de grandeza (SDD seção 5).
     *
     * O FishBase também erra: a corvina aparece com 55 g de peso máximo para um peixe de 60 cm,
     * o que é impossível. Antes de usar o número como régua, conferimos se ele é plausível para
     * o comprimento correspondente. Régua torta não serve para acusar ninguém.
     */
    let fbRefG = tax.fbMaxWeightG;
    // A régua do cubo do comprimento não vale para arraia, que é achatada e medida na largura.
    if (fbRefG !== null && fbMaxTL !== null && c.measure !== 'largura') {
      const cube = Math.pow(fbMaxTL, 3);
      if (fbRefG < 0.002 * cube || fbRefG > 0.08 * cube) {
        note(
          `${c.id}: peso máximo do FishBase (${fmtWeight(fbRefG)} para ${fbMaxTL.toFixed(0)} cm) ` +
            `é implausível — ignorado na conferência`,
        );
        fbRefG = null;
      }
    }

    if (maxG !== null && fbRefG !== null && maxG > fbRefG * 1.5) {
      warn(
        `${c.id}: estimativa no tamanho máximo (${fmtWeight(maxG)}) supera o peso máximo ` +
          `registrado no FishBase (${fmtWeight(fbRefG)}) — conferir unidade de a`,
      );
    }

    /*
     * O outro lado da conferência, que faltava: estimativa baixa demais.
     *
     * Só faz sentido comparar quando a faixa curada chega perto do máximo mundial — a nossa é
     * regional e quase sempre menor, então o peso estimado deve mesmo ficar abaixo. Mas quando
     * os dois comprimentos são parecidos e o peso não é, alguma coisa está errada. Foi assim
     * que apareceu um coeficiente emprestado que subestimava a arraia em vinte vezes.
     */
    if (
      maxG !== null &&
      fbRefG !== null &&
      fbMaxTL !== null &&
      c.maxLengthCm >= fbMaxTL * 0.8 &&
      maxG < fbRefG * 0.15
    ) {
      warn(
        `${c.id}: estimativa no tamanho máximo (${fmtWeight(maxG)}) é muito menor que o peso ` +
          `registrado no FishBase (${fmtWeight(fbRefG)}) para comprimento equivalente — ` +
          `coeficiente provavelmente inadequado`,
      );
    }
    if (avgG !== null && (avgG < 1 || avgG > 200_000)) {
      fail(`${c.id}: peso estimado absurdo no tamanho médio (${fmtWeight(avgG)}) — a/b errados`);
    }

    sanity.push({
      id: c.id,
      name: c.commonName,
      avgCm: c.avgLengthCm,
      avgG,
      maxCm: c.maxLengthCm,
      maxG,
      fbMaxG: fbRefG,
    });

    const badges = buildBadges(c);
    if (!badges.curated) note(`${c.id}: insígnias no fallback — falta redação (PRD 11.6)`);

    const albumOrder: Partial<Record<AlbumId, number>> = {};
    for (const album of c.albums) albumOrder[album] = CARD_POSITION.get(`${album}|${c.id}`) ?? 0;

    return {
      id: c.id,
      albums: c.albums,
      albumOrder,
      commonName: c.commonName,
      aliases: c.aliases,
      scientificName: c.scientificName,
      variety: c.variety ?? null,
      rarity: c.rarity,
      measure: c.measure ?? 'comprimento',
      minLengthCm: c.minLengthCm,
      avgLengthCm: c.avgLengthCm,
      maxLengthCm: c.maxLengthCm,
      lengthWeight,
      habitat: c.habitat,
      fact: c.fact,
      silhouette: `${c.id}.svg`,
      visuallySimilarTo: c.visuallySimilarTo,
      badges,
      hybrid: c.hybrid ?? false,
      taxonomy: {
        fishbaseSpecCode: tax.specCode,
        status: tax.status,
        acceptedName: tax.acceptedName,
      },
    } satisfies Species;
  });

  const albums: Album[] = (Object.keys(ALBUM_NAMES) as AlbumId[]).map((id) => ({
    id,
    name: ALBUM_NAMES[id],
    cardCount: species.filter((s) => s.albums.includes(id)).length,
  }));

  const catalog: Catalog = {
    version: CATALOG_VERSION,
    generatedAt: new Date().toISOString(),
    fishbaseVersion: FISHBASE_VERSION,
    albums,
    species,
  };

  await mkdir(dirname(OUT_JSON), { recursive: true });
  await writeFile(OUT_JSON, JSON.stringify(catalog, null, 2) + '\n', 'utf8');

  await writeFile(OUT_REPORT, renderReport(catalog, sanity), 'utf8');

  // ── resumo no terminal
  const comCoef = species.filter((s) => s.lengthWeight).length;
  const badgesPend = species.filter((s) => !s.badges.curated).length;

  console.log(`Espécies distintas .............. ${species.length}`);
  console.log(`Cartas ......................... ${albums.reduce((n, a) => n + a.cardCount, 0)}`);
  for (const a of albums) console.log(`  ${a.name.padEnd(24)} ${a.cardCount}`);
  console.log(`Com estimativa de peso ......... ${comCoef}/${species.length}`);
  console.log(`Insígnias pendentes ............ ${badgesPend}`);
  console.log(`\nErros .......................... ${problems.length}`);
  console.log(`Alertas ........................ ${warnings.length}`);
  console.log(`Pendências ..................... ${notes.length}`);

  if (problems.length) {
    console.log('\n── ERROS ──');
    for (const p of problems) console.log(`  ✗ ${p}`);
  }
  if (warnings.length) {
    console.log('\n── ALERTAS ──');
    for (const w of warnings) console.log(`  ! ${w}`);
  }

  console.log(`\nEscrito: src/catalog/species.json`);
  console.log(`Escrito: catalog-report.md  (leia antes da validação de campo)`);

  if (problems.length) {
    console.log('\nHá erros a corrigir em scripts/catalog/species-source.mts.');
    process.exitCode = 1;
  }
}

// ────────────────────────────────────────────────────────────────────── relatório

function renderReport(catalog: Catalog, sanity: Parameters<typeof renderSanity>[0]): string {
  const lines: string[] = [];
  const L = (s = '') => lines.push(s);

  L('# Relatório de build do catálogo');
  L();
  L(`Gerado em ${new Date().toLocaleString('pt-BR')} · FishBase ${catalog.fishbaseVersion} · catálogo v${catalog.version}`);
  L();
  L('> Arquivo gerado por `npm run catalog:build`. Não editar à mão — a fonte é');
  L('> `scripts/catalog/species-source.mts`.');
  L();
  L('---');
  L();
  L('## 1. O que ainda precisa de você');
  L();
  L('O script confere nomenclatura e ordem de grandeza. **Não** confere se a espécie realmente');
  L('ocorre onde você pesca, se o nome popular é o que se fala no RS, nem se a faixa de tamanho');
  L('bate com a realidade. Isso é a validação 2 do PRD 9.1 e depende de conversa com pescador.');
  L();
  L('Leve a tabela da seção 4 para essa conversa. As duas perguntas que resolvem quase tudo:');
  L('*"falta algum peixe óbvio aqui?"* e *"esse nome é o que vocês falam?"*.');
  L();

  if (problems.length) {
    L('## 2. Erros — corrigir antes de usar');
    L();
    for (const p of problems) L(`- ✗ ${p}`);
    L();
  } else {
    L('## 2. Erros');
    L();
    L('Nenhum. Estrutura e nomenclatura conferidas.');
    L();
  }

  L('## 3. Alertas');
  L();
  if (warnings.length === 0) L('Nenhum.');
  for (const w of warnings) L(`- ! ${w}`);
  L();

  L('## 4. Conferência de peso estimado');
  L();
  L('A pergunta a fazer para cada linha: **um exemplar desse tamanho pesa isso mesmo?**');
  L('É o teste que o SDD seção 5 pede. Um erro de unidade no coeficiente `a` aparece aqui como');
  L('um valor dez ou mil vezes fora — não como um valor sutilmente errado.');
  L();
  L(renderSanity(sanity));
  L();

  L('## 5. Pendências de produção');
  L();
  for (const n of notes) L(`- ${n}`);
  L();
  L(`- silhuetas: 0/${catalog.species.length} desenhadas (SDD seção 8 — comece pelas 16 do álbum de pesqueiros)`);
  L();

  L('## 6. Procedência dos coeficientes');
  L();
  L('| Espécie | a | b | n | Estudo | Alternativas |');
  L('|---|---|---|---|---|---|');
  for (const s of catalog.species) {
    const lw = s.lengthWeight;
    if (!lw) {
      L(`| ${s.commonName} | — | — | — | *sem dado em TL* | — |`);
      continue;
    }
    L(
      `| ${s.commonName} | ${lw.a} | ${lw.b} | ${lw.sampleSize ?? '—'} | ${lw.locality} | ${lw.candidates - 1} |`,
    );
  }
  L();

  return lines.join('\n');
}

function renderSanity(
  rows: { id: string; name: string; avgCm: number; avgG: number | null; maxCm: number; maxG: number | null; fbMaxG: number | null }[],
): string {
  const out: string[] = [];
  out.push('| Espécie | Médio | Peso estimado | Máximo | Peso estimado | Peso máx. FishBase |');
  out.push('|---|---|---|---|---|---|');
  for (const r of rows) {
    out.push(
      `| ${r.name} | ${r.avgCm} cm | ${r.avgG === null ? '—' : fmtWeight(r.avgG)} | ` +
        `${r.maxCm} cm | ${r.maxG === null ? '—' : fmtWeight(r.maxG)} | ` +
        `${r.fbMaxG === null ? '—' : fmtWeight(r.fbMaxG)} |`,
    );
  }
  return out.join('\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
