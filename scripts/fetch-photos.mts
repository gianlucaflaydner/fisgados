/**
 * Busca fotos das espécies em fontes com licença verificável — SDD, apoio à Etapa 2.
 *
 *   npm run photos:fetch            # monta o manifesto de candidatas (não baixa nada)
 *   npm run photos:fetch -- --baixar  # consulta e baixa a primeira candidata de cada espécie
 *   npm run photos:fetch -- --so-baixar  # baixa do manifesto já existente, sem reconsultar
 *
 * Por que não é só "buscar imagem na internet": embarcar foto de terceiro num app publicado é
 * redistribuição. O projeto já tem bundle id de Play Store e App Store, então a licença deixa de
 * ser detalhe e vira requisito. Este script só aceita o que dá para publicar:
 *
 *   aceita  — CC0, domínio público, CC BY (qualquer versão)
 *   recusa  — CC BY-NC (proíbe uso comercial) e tudo que não declare licença
 *   recusa  — CC BY-SA: o recorte 3:4 da carta é uma adaptação, e adaptação de SA teria que sair
 *             sob SA também. Não vale contaminar o app por uma foto quando há alternativa.
 *
 * O padrão do iNaturalist é justamente CC BY-NC, então filtrar não é preciosismo: é a diferença
 * entre 313 fotos e 40, e entre poder publicar e não poder.
 *
 * **Nada aqui dispensa revisão humana.** "Research grade" quer dizer que a comunidade concordou
 * com a identificação, não que a foto serve para uma carta — enquadramento, nitidez e se o bicho
 * aparece inteiro são julgamento de quem olha.
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();
const CATALOGO = join(RAIZ, 'src', 'catalog', 'species.json');
const MANIFESTO = join(RAIZ, 'scripts', '.cache', 'fotos.json');
const DESTINO = join(RAIZ, 'assets', 'especies');
const CREDITOS = join(RAIZ, 'CREDITOS.md');

/** O iNaturalist pede identificação e no máximo ~60 chamadas por minuto. */
const AGENTE = 'fisgados-catalog/0.1 (+https://github.com/fisgados; catalogo de especies)';
const PAUSA_MS = 1100;
const CANDIDATAS_POR_ESPECIE = 4;

const LICENCAS_OK = /^(cc0|cc-by|cc by|public domain|no restrictions|pd-)/i;
const LICENCAS_PROIBIDAS = /(nc|sa\b|share-?alike|non-?commercial)/i;

interface Candidata {
  fonte: 'inaturalist' | 'wikimedia';
  url: string;
  licenca: string;
  autor: string;
  pagina: string;
}

interface Entrada {
  id: string;
  commonName: string;
  scientificName: string;
  hybrid: boolean;
  candidatas: Candidata[];
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

function licencaAceitavel(licenca: string): boolean {
  const l = licenca.trim();
  if (!l) return false;
  if (LICENCAS_PROIBIDAS.test(l)) return false;
  return LICENCAS_OK.test(l);
}

async function buscarJson(url: string): Promise<any | null> {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': AGENTE } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/**
 * iNaturalist é a fonte primária porque a identificação é verificada pela comunidade — num app
 * cujo produto *é* dizer qual peixe é, foto com espécie errada não é estilo, é defeito.
 */
async function doINaturalist(nomeCientifico: string): Promise<Candidata[]> {
  const url =
    'https://api.inaturalist.org/v1/observations' +
    `?taxon_name=${encodeURIComponent(nomeCientifico)}` +
    '&photo_license=cc0,cc-by&quality_grade=research&order_by=votes' +
    `&per_page=${CANDIDATAS_POR_ESPECIE}`;

  const j = await buscarJson(url);
  const saida: Candidata[] = [];

  for (const obs of j?.results ?? []) {
    const foto = obs.photos?.[0];
    if (!foto?.url) continue;
    const licenca = String(foto.license_code ?? '');
    if (!licencaAceitavel(licenca)) continue;

    saida.push({
      fonte: 'inaturalist',
      // O campo vem no recorte quadrado; "large" é o maior tamanho servido sem autenticação.
      url: String(foto.url).replace('/square.', '/large.'),
      licenca: licenca.toUpperCase(),
      autor: String(foto.attribution ?? '').replace(/^\(c\)\s*/, ''),
      pagina: `https://www.inaturalist.org/observations/${obs.id}`,
    });
  }
  return saida;
}

/**
 * Wikimedia entra como reserva. A busca dele é por texto, não por táxon, então pode devolver
 * espécie errada — por isso vem depois, e por isso a revisão humana não é opcional.
 */
async function doWikimedia(nomeCientifico: string): Promise<Candidata[]> {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search' +
    `&gsrsearch=${encodeURIComponent(nomeCientifico)}` +
    `&gsrnamespace=6&gsrlimit=${CANDIDATAS_POR_ESPECIE}` +
    '&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1024';

  const j = await buscarJson(url);
  const saida: Candidata[] = [];

  for (const pagina of Object.values<any>(j?.query?.pages ?? {})) {
    const ii = pagina.imageinfo?.[0];
    if (!ii) continue;
    const meta = ii.extmetadata ?? {};
    const licenca = String(meta.LicenseShortName?.value ?? '');
    if (!licencaAceitavel(licenca)) continue;

    saida.push({
      fonte: 'wikimedia',
      url: String(ii.thumburl ?? ii.url).split('?')[0]!,
      licenca,
      autor: String(meta.Artist?.value ?? '')
        .replace(/<[^>]+>/g, '')
        .trim(),
      pagina: `https://commons.wikimedia.org/wiki/${encodeURIComponent(pagina.title)}`,
    });
  }
  return saida;
}

async function montarManifesto(): Promise<Entrada[]> {
  const catalogo = JSON.parse(readFileSync(CATALOGO, 'utf8'));
  const entradas: Entrada[] = [];

  // --limite N encurta a rodada durante o desenvolvimento. Sem ele, roda o catálogo inteiro.
  const corte = process.argv.indexOf('--limite');
  const especies =
    corte >= 0 ? catalogo.species.slice(0, Number(process.argv[corte + 1])) : catalogo.species;

  for (const [i, sp] of especies.entries()) {
    const candidatas = await doINaturalist(sp.scientificName);
    await espera(PAUSA_MS);

    if (candidatas.length === 0) {
      candidatas.push(...(await doWikimedia(sp.scientificName)));
      await espera(PAUSA_MS);
    }

    entradas.push({
      id: sp.id,
      commonName: sp.commonName,
      scientificName: sp.scientificName,
      hybrid: Boolean(sp.hybrid),
      candidatas,
    });

    const marca = candidatas.length > 0 ? '·' : '!';
    process.stdout.write(`\r${marca} ${i + 1}/${especies.length}  ${sp.commonName}          `);
  }

  console.log('\n');
  return entradas;
}

async function baixar(entradas: Entrada[]): Promise<void> {
  mkdirSync(DESTINO, { recursive: true });
  let baixadas = 0;
  const falhas: string[] = [];

  for (const e of entradas) {
    const escolhida = e.candidatas[0];
    if (!escolhida) continue;

    // A extensão vem da URL, não é chutada: as fontes servem PNG também, e PNG chamado .jpg
    // passa no Metro por sorte e quebra em qualquer ferramenta que confie no nome do arquivo.
    const ext = /\.(png|webp|jpe?g)(\?|$)/i.exec(escolhida.url)?.[1]?.toLowerCase() ?? 'jpg';
    const destino = join(DESTINO, `${e.id}.${ext === 'jpeg' ? 'jpg' : ext}`);
    if (existsSync(destino)) continue;

    try {
      const r = await fetch(escolhida.url, { headers: { 'User-Agent': AGENTE } });
      if (!r.ok) {
        falhas.push(`${e.commonName}: HTTP ${r.status}`);
        continue;
      }
      const bytes = Buffer.from(await r.arrayBuffer());
      if (bytes.length === 0) {
        falhas.push(`${e.commonName}: arquivo vazio`);
        continue;
      }
      writeFileSync(destino, bytes);
      baixadas++;
      process.stdout.write(`\r baixando ${baixadas}  ${e.commonName}          `);
    } catch (erro) {
      // Uma foto que não desceu não derruba a rodada, mas some do relatório é pior: sem a causa
      // à vista, uma rodada inteira falha em silêncio e parece ter dado certo.
      falhas.push(`${e.commonName}: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
    await espera(300);
  }
  console.log(`\n${baixadas} arquivo(s) em assets/especies/`);
  if (falhas.length > 0) {
    console.log(`\n${falhas.length} não desceram:`);
    for (const f of falhas) console.log(`  ${f}`);
  }
}

/**
 * A atribuição não é cortesia: CC BY exige crédito visível ao autor. Este arquivo é a fonte da
 * tela de créditos do app — sem ela, usar as fotos é descumprir a licença.
 */
function escreverCreditos(entradas: Entrada[]): void {
  const linhas: string[] = [
    '# Créditos das fotos de espécies',
    '',
    'Gerado por `npm run photos:fetch`. **Não edite à mão.**',
    '',
    'As fotos abaixo são de terceiros e estão sob licença que permite uso e adaptação, com',
    'crédito ao autor. Este crédito precisa aparecer no app — é condição da licença, não',
    'gentileza. Fotos sem licença aproveitável não entram no catálogo.',
    '',
    '| Espécie | Autor | Licença | Fonte |',
    '|---|---|---|---|',
  ];

  for (const e of entradas) {
    const c = e.candidatas[0];
    if (!c) continue;
    const autor = c.autor.replace(/\|/g, '/') || '—';
    linhas.push(`| ${e.commonName} | ${autor} | ${c.licenca} | [${c.fonte}](${c.pagina}) |`);
  }

  const semFoto = entradas.filter((e) => e.candidatas.length === 0);
  if (semFoto.length > 0) {
    linhas.push('', '## Sem foto com licença aproveitável', '');
    for (const e of semFoto) {
      linhas.push(`- **${e.commonName}** (${e.scientificName})${e.hybrid ? ' — híbrido' : ''}`);
    }
  }

  writeFileSync(CREDITOS, linhas.join('\n') + '\n');
}

const soBaixar = process.argv.includes('--so-baixar');

if (soBaixar) {
  if (!existsSync(MANIFESTO)) {
    console.error('Sem manifesto. Rode antes: npm run photos:fetch');
    process.exit(1);
  }
  await baixar(JSON.parse(readFileSync(MANIFESTO, 'utf8')) as Entrada[]);
  process.exit(0);
}

const entradas = await montarManifesto();
mkdirSync(join(RAIZ, 'scripts', '.cache'), { recursive: true });
writeFileSync(MANIFESTO, JSON.stringify(entradas, null, 2));
escreverCreditos(entradas);

const comFoto = entradas.filter((e) => e.candidatas.length > 0);
const sem = entradas.filter((e) => e.candidatas.length === 0);

console.log(`${comFoto.length} de ${entradas.length} espécies com foto publicável`);
if (sem.length > 0) {
  console.log(`\nsem foto (${sem.length}):`);
  for (const e of sem) console.log(`  ${e.commonName}${e.hybrid ? ' — híbrido, arte composta' : ''}`);
}
console.log(`\nmanifesto: scripts/.cache/fotos.json`);
console.log(`créditos:  CREDITOS.md`);

if (process.argv.includes('--baixar')) await baixar(entradas);
else console.log('\nrode com --baixar para trazer os arquivos.');
