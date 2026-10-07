/**
 * Prepara as ilustrações das espécies e gera `src/catalog/ilustracoes.ts`.
 *
 *   npm run ilustracoes:prepare -- <pasta com os PNGs>
 *
 * Sem argumento, reprocessa `assets/ilustracoes/` em cima de si mesma — é o que se roda depois de
 * redesenhar uma espécie no gerador (`scripts/ilustracoes/`).
 *
 * O que ele faz: reduz cada PNG para 256 cores, que é o truque que importa aqui. São desenhos de
 * cor chapada com degradê suave, então a paleta não deixa faixa visível e o arquivo cai de ~130 KB
 * para ~40 KB. São 84 cartas; a conta no bundle é de 7 MB para 3,4 MB.
 *
 * A largura fica em 1024: a ficha da espécie mostra a ilustração quase na largura da tela, e num
 * aparelho de 3× isso é mais de mil pixels. Reduzir aqui apareceria lá.
 */

import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import sharp from 'sharp';

import { SPECIES } from '../src/catalog/index.ts';

const DESTINO_PNG = join('assets', 'ilustracoes');
const DESTINO_TS = join('src', 'catalog', 'ilustracoes.ts');
const LARGURA = 1024;

const origem = process.argv[2] ?? DESTINO_PNG;
if (!existsSync(origem)) {
  console.error(`Pasta não encontrada: ${origem}`);
  process.exit(1);
}

mkdirSync(DESTINO_PNG, { recursive: true });

const idsDoCatalogo = new Set(SPECIES.map((s) => s.id));
const arquivos = readdirSync(origem).filter((f) => f.toLowerCase().endsWith('.png'));

let antes = 0;
let depois = 0;
const prontos: string[] = [];
const forasDoCatalogo: string[] = [];

for (const arquivo of arquivos.sort()) {
  const id = basename(arquivo, '.png');
  if (!idsDoCatalogo.has(id)) {
    forasDoCatalogo.push(id);
    continue;
  }

  const caminho = join(origem, arquivo);
  antes += statSync(caminho).size;

  // Lê para memória antes de escrever: origem e destino podem ser a mesma pasta, e o sharp não
  // pode estar lendo o arquivo que vai sobrescrever.
  const bytes = await sharp(caminho)
    .resize({ width: LARGURA, withoutEnlargement: true })
    .png({ palette: true, compressionLevel: 9 })
    .toBuffer();

  const saida = join(DESTINO_PNG, `${id}.png`);
  writeFileSync(saida, bytes);
  depois += bytes.byteLength;
  prontos.push(id);
}

prontos.sort();

const linhas = prontos.map((id) => `  '${id}': require('../../assets/ilustracoes/${id}.png'),`);
writeFileSync(
  DESTINO_TS,
  `/**
 * Ilustrações das espécies — **gerado** por \`npm run ilustracoes:prepare\`. Não edite à mão.
 *
 * São desenhos originais, em perfil, com fundo transparente — a arte da carta do álbum. As fotos
 * de \`assets/especies\` serviram de referência de forma e cor e continuam no app como foto de
 * referência na ficha da espécie, com os créditos que a licença exige.
 *
 * O fundo transparente é o que permite a carta trancada: a mesma imagem pintada de uma cor só
 * vira a silhueta exata daquele peixe, sem precisar de um segundo arquivo.
 */

import type { ImageSourcePropType } from 'react-native';

export const ILUSTRACOES: Record<string, ImageSourcePropType> = {
${linhas.join('\n')}
};

/** A ilustração da espécie. \`undefined\` só se o catálogo andar na frente do desenho. */
export function getIlustracao(speciesId: string): ImageSourcePropType | undefined {
  return ILUSTRACOES[speciesId];
}
`,
);

const faltando = [...idsDoCatalogo].filter((id) => !prontos.includes(id)).sort();

console.log(`${prontos.length} ilustrações em ${DESTINO_PNG}`);
console.log(`${(antes / 1024 / 1024).toFixed(1)} MB → ${(depois / 1024 / 1024).toFixed(1)} MB`);
if (forasDoCatalogo.length > 0) console.log(`ignoradas (fora do catálogo): ${forasDoCatalogo.join(', ')}`);
if (faltando.length > 0) {
  console.log(`\nFALTAM ${faltando.length} espécies sem ilustração:\n  ${faltando.join('\n  ')}`);
  process.exit(1);
}
