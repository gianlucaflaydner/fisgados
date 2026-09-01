/**
 * Normaliza as fotos baixadas e gera o que o app precisa para usá-las.
 *
 *   npm run photos:prepare
 *
 * Faz três coisas, nesta ordem:
 *
 * 1. **Reduz.** O que desce das fontes vem entre 50 KB e 1,5 MB, em JPEG e em PNG, com lados de
 *    até 2048 px — 31 MB somados, que iriam inteiros para dentro do APK só para desenhar
 *    miniaturas de 56 px. Tudo vira JPEG com lado maior de 800 px.
 * 2. **Mapeia.** O Metro resolve `require` de asset em tempo de build, então não existe caminho
 *    montado em tempo de execução. O mapa gerado dá ao empacotador a lista literal.
 * 3. **Credita.** CC BY exige crédito visível ao autor. A tela de créditos do app lê o módulo
 *    gerado aqui, que lista exatamente o que foi embarcado — foto que não desceu não aparece
 *    creditada, e crédito não sobra quando uma foto é trocada.
 *
 * A proporção é preservada de propósito. Recortar 84 fotos em 3:4 no automático cortaria o peixe
 * pela metade em boa parte delas — enquadrar é decisão de quem olha, e é o mesmo motivo pelo qual
 * a captura do usuário passa por uma tela de enquadramento em vez de recorte automático.
 */

import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const RAIZ = process.cwd();
const DIRETORIO = join(RAIZ, 'assets', 'especies');
const MANIFESTO = join(RAIZ, 'scripts', '.cache', 'fotos.json');
const LADO_MAIOR = 800;
const QUALIDADE = 82;

interface EntradaManifesto {
  id: string;
  commonName: string;
  candidatas: Array<{ licenca: string; autor: string; pagina: string }>;
}

// ─────────────────────────────────────────────────────────────────────── redução

const arquivos = readdirSync(DIRETORIO).filter((a) => /\.(jpe?g|png|webp)$/i.test(a));

let antes = 0;
let depois = 0;
let convertidos = 0;
const problemas: string[] = [];

for (const arquivo of arquivos) {
  const caminho = join(DIRETORIO, arquivo);
  antes += statSync(caminho).size;

  try {
    const entrada = readFileSync(caminho);
    const meta = await sharp(entrada).metadata();
    const largura = meta.width ?? 0;
    const altura = meta.height ?? 0;

    const saida = await sharp(entrada)
      // Respeita a orientação do EXIF antes de descartá-la, senão a foto sai deitada.
      .rotate()
      .resize({
        width: largura >= altura ? LADO_MAIOR : undefined,
        height: altura > largura ? LADO_MAIOR : undefined,
        withoutEnlargement: true,
      })
      .jpeg({ quality: QUALIDADE, mozjpeg: true })
      .toBuffer();

    // Todo arquivo termina como .jpg de verdade. Havia PNG com extensão .jpg, que passa no Metro
    // por sorte e quebra em qualquer ferramenta que confie no nome.
    writeFileSync(caminho.replace(/\.(png|webp|jpeg)$/i, '.jpg'), saida);
    if (/\.(png|webp|jpeg)$/i.test(arquivo)) {
      // O original sai de cena: deixar o .png ao lado do .jpg convertido faz o Metro empacotar
      // os dois, enquanto o mapa aponta só para um. Peso morto que ninguém vê até o build inchar.
      rmSync(caminho);
      convertidos++;
    }

    depois += saida.length;
  } catch (erro) {
    problemas.push(`${arquivo}: ${erro instanceof Error ? erro.message : String(erro)}`);
  }
}

// ────────────────────────────────────────────────────────────── mapa e créditos

const ids = readdirSync(DIRETORIO)
  .filter((a) => a.endsWith('.jpg'))
  .map((a) => a.replace(/\.jpg$/, ''))
  .sort();

function escreverMapa(): void {
  const linhas = [
    '/**',
    ' * Fotos das espécies — **gerado** por `npm run photos:prepare`. Não edite à mão.',
    ' *',
    ' * São fotos de terceiros sob CC0, domínio público ou CC BY. O crédito ao autor é condição',
    ' * da licença e vive em `creditos.ts`, que alimenta a tela de créditos do app.',
    ' */',
    '',
    "import type { ImageSourcePropType } from 'react-native';",
    '',
    'export const FOTOS: Record<string, ImageSourcePropType> = {',
    ...ids.map((id) => `  '${id}': require('../../assets/especies/${id}.jpg'),`),
    '};',
    '',
    '/** `undefined` para espécie sem foto publicável — a tela decide o que desenhar no lugar. */',
    'export function getFoto(speciesId: string): ImageSourcePropType | undefined {',
    '  return FOTOS[speciesId];',
    '}',
    '',
  ];
  writeFileSync(join(RAIZ, 'src', 'catalog', 'fotos.ts'), linhas.join('\n'));
  console.log(`mapa:     src/catalog/fotos.ts (${ids.length} espécies)`);
}

/** Aspas simples e barras invertidas viram literal seguro dentro do arquivo gerado. */
function escapar(texto: string): string {
  return texto.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function escreverCreditos(): void {
  const manifesto = JSON.parse(readFileSync(MANIFESTO, 'utf8')) as EntradaManifesto[];
  const porId = new Map(manifesto.map((e) => [e.id, e]));

  const linhas = [
    '/**',
    ' * Créditos das fotos — **gerado** por `npm run photos:prepare`. Não edite à mão.',
    ' *',
    ' * CC BY exige crédito visível ao autor. Esta lista não é cortesia: é condição de uso das',
    ' * fotos que o app embarca, e alimenta a tela de créditos.',
    ' */',
    '',
    'export interface CreditoFoto {',
    '  especie: string;',
    '  autor: string;',
    '  licenca: string;',
    '  pagina: string;',
    '}',
    '',
    'export const CREDITOS: CreditoFoto[] = [',
  ];

  let creditadas = 0;
  for (const id of ids) {
    const entrada = porId.get(id);
    const candidata = entrada?.candidatas?.[0];
    if (!entrada || !candidata) continue;

    const autor = escapar(candidata.autor || 'autor não informado');
    linhas.push(
      `  { especie: '${escapar(entrada.commonName)}', autor: '${autor}',` +
        ` licenca: '${escapar(candidata.licenca)}', pagina: '${escapar(candidata.pagina)}' },`,
    );
    creditadas++;
  }

  linhas.push('];', '');
  writeFileSync(join(RAIZ, 'src', 'catalog', 'creditos.ts'), linhas.join('\n'));
  console.log(`créditos: src/catalog/creditos.ts (${creditadas} autores)`);
}

escreverMapa();
escreverCreditos();

// ───────────────────────────────────────────────────────────────────── resultado

const mb = (b: number) => (b / 1024 / 1024).toFixed(1) + ' MB';
console.log(`\n${arquivos.length} fotos`);
console.log(`antes:  ${mb(antes)}`);
console.log(`depois: ${mb(depois)}  (lado maior ${LADO_MAIOR} px, JPEG ${QUALIDADE})`);
if (convertidos > 0) console.log(`${convertidos} convertida(s) de PNG/WEBP para JPEG`);
if (problemas.length > 0) {
  console.log(`\n${problemas.length} com problema:`);
  for (const p of problemas) console.log(`  ${p}`);
}
