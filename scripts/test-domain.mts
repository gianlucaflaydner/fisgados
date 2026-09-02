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
import { emailValido, normalizarEmail, SENHA_MIN, validarCadastro } from '../src/domain/conta.ts';
import { dataDoExif } from '../src/domain/exif.ts';
import {
  codigoValido,
  gerarCodigoConvite,
  normalizarCodigo,
  TAMANHO_CODIGO,
} from '../src/domain/convite.ts';
import {
  atrasoDaTentativa,
  desistiu,
  fundir,
  TENTATIVAS_MAX,
  venceLocal,
} from '../src/domain/sincronizacao.ts';
import {
  calcularRecorte,
  dimensoesAposGirar,
  escalaDeCobertura,
  limitesDeslocamento,
  PROPORCAO_CARTA,
} from '../src/domain/recorte.ts';
import { PALETA, type Paleta, type Tema } from '../src/theme/cores.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

// ───────────────────────────────────────────────────────────────── conta (F14)

teste('e-mail é normalizado antes de virar chave da conta', () => {
  assert.equal(normalizarEmail('  Joao@Mail.COM '), 'joao@mail.com');
  // Duas grafias do mesmo e-mail não podem virar duas contas no mesmo aparelho.
  assert.equal(normalizarEmail('JOAO@mail.com'), normalizarEmail('joao@MAIL.com'));
});

teste('e-mail sem arroba, sem domínio ou com espaço é recusado', () => {
  for (const bom of ['a@b.co', 'joao.silva@provedor.com.br']) {
    assert.ok(emailValido(bom), `deveria aceitar ${bom}`);
  }
  for (const ruim of ['', 'joao', 'joao@', '@mail.com', 'joao@mail', 'jo ao@mail.com', 'a@b.c']) {
    assert.ok(!emailValido(ruim), `deveria recusar "${ruim}"`);
  }
});

teste('cadastro reclama do primeiro campo problemático, na ordem da tela', () => {
  const ok = { nome: 'Ana', email: 'ana@mail.com', senha: 'a'.repeat(SENHA_MIN) };
  assert.equal(validarCadastro(ok), null);

  assert.match(validarCadastro({ ...ok, nome: ' ' })!, /chamado/);
  // Nome vazio ganha da senha curta: é o campo de cima.
  assert.match(validarCadastro({ nome: '', email: 'nao-e-email', senha: '1' })!, /chamado/);
  assert.match(validarCadastro({ ...ok, email: 'nao-e-email' })!, /e-mail/i);
  assert.match(validarCadastro({ ...ok, senha: 'a'.repeat(SENHA_MIN - 1) })!, /senha/i);
});

// ──────────────────────────────────────────────────────── data da foto da galeria

teste('data do EXIF vira captura na hora local, sem deslocar por fuso', () => {
  const d = dataDoExif({ DateTimeOriginal: '2026:03:14 06:05:09' }, new Date('2026-08-23T12:00:00'));
  assert.ok(d);
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 2);
  assert.equal(d.getDate(), 14);
  // A hora é o que as insígnias de madrugada/manhã leem: não pode escorregar.
  assert.equal(d.getHours(), 6);
  assert.equal(d.getMinutes(), 5);
});

teste('sem marca utilizável, a data da foto é indefinida em vez de chutada', () => {
  const agora = new Date('2026-08-23T12:00:00');
  assert.equal(dataDoExif(undefined, agora), null);
  assert.equal(dataDoExif({}, agora), null);
  assert.equal(dataDoExif({ DateTimeOriginal: '' }, agora), null);
  assert.equal(dataDoExif({ DateTimeOriginal: 'ontem de manhã' }, agora), null);
  assert.equal(dataDoExif({ DateTimeOriginal: 1770000000 }, agora), null);
  // Mês 13 e dia 32 o Date aceita rolando para frente; aqui não passam.
  assert.equal(dataDoExif({ DateTimeOriginal: '2026:13:01 10:00:00' }, agora), null);
  assert.equal(dataDoExif({ DateTimeOriginal: '2026:02:32 10:00:00' }, agora), null);
});

teste('relógio adiantado não gera captura no futuro', () => {
  const agora = new Date('2026-08-23T12:00:00');
  assert.equal(dataDoExif({ DateTimeOriginal: '2027:01:01 10:00:00' }, agora), null);
  // A borda do "agora" continua valendo: foto tirada há um minuto é foto de hoje.
  assert.ok(dataDoExif({ DateTimeOriginal: '2026:08:23 11:59:00' }, agora));
});

teste('DateTime serve de reserva quando DateTimeOriginal não veio', () => {
  const agora = new Date('2026-08-23T12:00:00');
  const d = dataDoExif({ DateTime: '2026:08:20 18:30:00' }, agora);
  assert.equal(d?.getDate(), 20);
  // Com os dois presentes, o original manda: é a hora do disparo, não a da última edição.
  const dois = dataDoExif(
    { DateTimeOriginal: '2026:08:19 07:00:00', DateTime: '2026:08:20 18:30:00' },
    agora,
  );
  assert.equal(dois?.getDate(), 19);
});

// ───────────────────────────────────────────────────────────────── tema (dois modos)

/** `destaqueTexto` vira `--cor-destaque-texto`. */
function paraVariavel(chave: string): string {
  return '--cor-' + chave.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
}

function hexParaRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Lê o bloco `:root` ou `.dark:root` do global.css e devolve as variáveis que ele declara. */
function variaveisDoCss(seletor: string): Map<string, string> {
  const css = readFileSync(join(process.cwd(), 'src', 'global.css'), 'utf8');
  const inicio = css.indexOf(seletor + ' {');
  assert.ok(inicio >= 0, `bloco "${seletor}" não encontrado em global.css`);
  const corpo = css.slice(inicio, css.indexOf('}', inicio));

  const vars = new Map<string, string>();
  for (const linha of corpo.matchAll(/(--cor-[a-z-]+):s*([^;]+);/g)) {
    vars.set(linha[1]!, linha[2]!.trim());
  }
  return vars;
}

const BLOCO: Record<Tema, string> = { claro: ':root', escuro: '.dark:root' };

teste('global.css e cores.ts declaram exatamente a mesma paleta', () => {
  for (const tema of ['claro', 'escuro'] as const) {
    const css = variaveisDoCss(BLOCO[tema]);
    const ts = PALETA[tema];

    for (const [chave, hex] of Object.entries(ts)) {
      const nome = paraVariavel(chave);
      const esperado = hexParaRgb(hex).join(' ');
      assert.equal(css.get(nome), esperado, `${tema}/${chave}: CSS e TS discordam`);
    }

    // Variável no CSS sem par no TS é cor que as telas usam e o código nativo não enxerga.
    assert.equal(css.size, Object.keys(ts).length, `${tema}: sobra variável no CSS`);
  }
});

/** Luminância relativa da WCAG. */
function luminancia(hex: string): number {
  const canais = hexParaRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
}

function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (claro + 0.05) / (escuro + 0.05);
}

teste('o texto se lê nos dois temas, no sol e na madrugada', () => {
  // O app é usado às 5h e às 14h. Contraste baixo aqui não é detalhe estético: é uma medida que
  // não se consegue ler com a tela molhada e o peixe na outra mão.
  const pares: Array<[keyof Paleta, keyof Paleta, number]> = [
    ['texto', 'fundo', 7],
    ['texto', 'superficie', 7],
    ['suave', 'fundo', 4.5],
    ['suave', 'superficie', 4.5],
    ['cobalto', 'fundo', 4.5],
    ['perigo', 'fundo', 4.5],
    ['destaqueTexto', 'destaque', 4.5],
  ];

  for (const tema of ['claro', 'escuro'] as const) {
    for (const [frente, fundo, minimo] of pares) {
      const r = contraste(PALETA[tema][frente], PALETA[tema][fundo]);
      assert.ok(
        r >= minimo,
        `${tema}: ${frente} sobre ${fundo} dá ${r.toFixed(2)}:1, abaixo de ${minimo}:1`,
      );
    }
  }
});

teste('as quatro raridades continuam distinguíveis entre si nos dois temas', () => {
  // Raridade é sinal, não enfeite: duas bolinhas parecidas fazem o álbum perder a informação.
  const raridades = ['comum', 'incomum', 'raro', 'lendario'] as const;

  for (const tema of ['claro', 'escuro'] as const) {
    for (let i = 0; i < raridades.length; i++) {
      for (let j = i + 1; j < raridades.length; j++) {
        const a = PALETA[tema][raridades[i]!];
        const b = PALETA[tema][raridades[j]!];
        assert.notEqual(a, b, `${tema}: ${raridades[i]} e ${raridades[j]} são a mesma cor`);
      }
    }
    // E nenhuma delas pode ser a cor da ação — o laranja é só do botão.
    for (const r of raridades) {
      assert.notEqual(PALETA[tema][r], PALETA[tema].destaque, `${tema}: ${r} colide com destaque`);
    }
  }
});

// ─────────────────────────────────────────────────── enquadramento da foto (3:4)

/** A janela dos testes é a máscara da carta: 300 de largura, 400 de altura. */
const JANELA = { largura: 300, altura: 400 };

teste('girar 90° troca os lados, girar 180° não', () => {
  const d = { largura: 4000, altura: 3000 };
  assert.deepEqual(dimensoesAposGirar(d, 0), { largura: 4000, altura: 3000 });
  assert.deepEqual(dimensoesAposGirar(d, 90), { largura: 3000, altura: 4000 });
  assert.deepEqual(dimensoesAposGirar(d, 180), { largura: 4000, altura: 3000 });
  assert.deepEqual(dimensoesAposGirar(d, 270), { largura: 3000, altura: 4000 });
});

teste('a escala de cobertura nunca deixa buraco na carta', () => {
  // Foto deitada: quem manda é a altura, senão sobraria vazio em cima e embaixo.
  assert.equal(escalaDeCobertura({ largura: 4000, altura: 3000 }, JANELA), 400 / 3000);
  // Foto em pé e mais estreita que 3:4: quem manda é a largura.
  assert.equal(escalaDeCobertura({ largura: 1000, altura: 2000 }, JANELA), 300 / 1000);
  // Imagem sem dimensão não vira divisão por zero.
  assert.equal(escalaDeCobertura({ largura: 0, altura: 0 }, JANELA), 1);
});

teste('sem zoom, o recorte é a faixa central na proporção da carta', () => {
  const imagem = { largura: 4000, altura: 3000 };
  const r = calcularRecorte({ imagem, janela: JANELA, escala: 1, deslocX: 0, deslocY: 0 });

  // A altura inteira cabe; a largura é cortada até dar 3:4.
  assert.equal(r.height, 3000);
  assert.equal(r.width, 2250);
  assert.ok(Math.abs(r.width / r.height - PROPORCAO_CARTA) < 0.001, 'saiu fora de 3:4');
  // Centralizado: sobra o mesmo dos dois lados.
  assert.equal(r.originX, (4000 - 2250) / 2);
  assert.equal(r.originY, 0);
});

teste('aproximar recorta menos imagem, mantendo a proporção', () => {
  const imagem = { largura: 4000, altura: 3000 };
  const um = calcularRecorte({ imagem, janela: JANELA, escala: 1, deslocX: 0, deslocY: 0 });
  const dois = calcularRecorte({ imagem, janela: JANELA, escala: 2, deslocX: 0, deslocY: 0 });

  assert.equal(dois.width, Math.round(um.width / 2));
  assert.equal(dois.height, Math.round(um.height / 2));
  assert.ok(Math.abs(dois.width / dois.height - PROPORCAO_CARTA) < 0.01);
});

teste('o arrasto move o recorte, e para na borda da imagem', () => {
  const imagem = { largura: 4000, altura: 3000 };
  const centro = calcularRecorte({ imagem, janela: JANELA, escala: 1, deslocX: 0, deslocY: 0 });

  // Arrastar a imagem para a direita mostra o lado esquerdo dela.
  const direita = calcularRecorte({ imagem, janela: JANELA, escala: 1, deslocX: 50, deslocY: 0 });
  assert.ok(direita.originX < centro.originX, 'o recorte não andou');

  // Exagerar o arrasto encosta na borda e para: nunca sai da imagem.
  const muito = calcularRecorte({ imagem, janela: JANELA, escala: 1, deslocX: 99999, deslocY: 0 });
  assert.equal(muito.originX, 0);
  const outro = calcularRecorte({ imagem, janela: JANELA, escala: 1, deslocX: -99999, deslocY: 0 });
  assert.equal(outro.originX, imagem.largura - outro.width);
});

teste('no eixo sem folga, não há para onde arrastar', () => {
  // Foto deitada sem zoom: a altura já está no limite, então o eixo Y não tem folga.
  const limites = limitesDeslocamento({ largura: 4000, altura: 3000 }, JANELA, 1);
  assert.equal(limites.y, 0);
  assert.ok(limites.x > 0);

  const r = calcularRecorte({
    imagem: { largura: 4000, altura: 3000 },
    janela: JANELA,
    escala: 1,
    deslocX: 0,
    deslocY: 500,
  });
  assert.equal(r.originY, 0, 'arrastou num eixo que não tinha folga');
});

teste('o recorte cabe dentro da imagem em qualquer combinação', () => {
  const imagens = [
    { largura: 4000, altura: 3000 },
    { largura: 3000, altura: 4000 },
    { largura: 1200, altura: 1600 },
    { largura: 800, altura: 800 },
    { largura: 5, altura: 4000 },
  ];
  for (const imagem of imagens) {
    for (const escala of [1, 1.5, 3, 5]) {
      for (const desloc of [-9999, -120, 0, 77, 9999]) {
        const r = calcularRecorte({ imagem, janela: JANELA, escala, deslocX: desloc, deslocY: desloc });
        const onde = `${imagem.largura}x${imagem.altura} escala ${escala} desloc ${desloc}`;
        assert.ok(Number.isInteger(r.originX) && Number.isInteger(r.width), `${onde}: não inteiro`);
        assert.ok(r.originX >= 0 && r.originY >= 0, `${onde}: origem negativa`);
        assert.ok(r.width > 0 && r.height > 0, `${onde}: recorte vazio`);
        assert.ok(r.originX + r.width <= imagem.largura, `${onde}: passou da largura`);
        assert.ok(r.originY + r.height <= imagem.altura, `${onde}: passou da altura`);
      }
    }
  }
});

teste('imagem sem dimensão conhecida não gera recorte inválido', () => {
  const r = calcularRecorte({
    imagem: { largura: 0, altura: 0 },
    janela: JANELA,
    escala: 1,
    deslocX: 0,
    deslocY: 0,
  });
  assert.ok(r.width > 0 && r.height > 0);
  assert.ok(!Number.isNaN(r.originX) && !Number.isNaN(r.originY));
});

// ─────────────────────────────────────────────── sincronização (SDD seção 4)

teste('o atraso segue a escala do SDD e nunca sai dela', () => {
  // Sem jitter (aleatorio devolve 0.5, o meio da faixa) o valor é o da tabela.
  const meio = () => 0.5;
  assert.equal(atrasoDaTentativa(0, meio), 2_000);
  assert.equal(atrasoDaTentativa(1, meio), 8_000);
  assert.equal(atrasoDaTentativa(2, meio), 30_000);
  assert.equal(atrasoDaTentativa(3, meio), 120_000);
  assert.equal(atrasoDaTentativa(4, meio), 600_000);
});

teste('o atraso satura no último degrau em vez de estourar o índice', () => {
  const meio = () => 0.5;
  // Tentativa acima do limite não pode virar undefined nem NaN.
  for (const n of [5, 9, 100]) {
    assert.equal(atrasoDaTentativa(n, meio), 600_000, `tentativa ${n}`);
  }
  // Nem valor negativo, que só apareceria por bug de contador.
  assert.equal(atrasoDaTentativa(-3, meio), 2_000);
});

teste('o jitter espalha em até 20% para os dois lados', () => {
  // Dez itens na fila voltando juntos não podem disparar no mesmo milissegundo.
  const minimo = atrasoDaTentativa(2, () => 0);
  const maximo = atrasoDaTentativa(2, () => 1);
  assert.equal(minimo, 24_000);
  assert.equal(maximo, 36_000);

  for (let i = 0; i < 200; i++) {
    const d = atrasoDaTentativa(2);
    assert.ok(d >= minimo && d <= maximo, `${d} fora da faixa`);
    assert.ok(Number.isInteger(d), 'atraso não inteiro');
  }
});

teste('desiste exatamente no limite de tentativas, não antes', () => {
  assert.ok(!desistiu(0));
  assert.ok(!desistiu(TENTATIVAS_MAX - 1));
  assert.ok(desistiu(TENTATIVAS_MAX));
  assert.ok(desistiu(TENTATIVAS_MAX + 1));
});

teste('conflito é last-write-wins, e empate fica com o remoto', () => {
  const antes = { updatedAt: '2026-08-20T10:00:00.000Z' };
  const depois = { updatedAt: '2026-08-20T10:00:01.000Z' };

  assert.ok(venceLocal(depois, antes), 'local mais novo deveria vencer');
  assert.ok(!venceLocal(antes, depois), 'local mais velho não pode vencer');
  // Empate: o remoto já foi visto por outros aparelhos, reescrevê-lo criaria diferença inexplicável.
  assert.ok(!venceLocal(antes, { ...antes }), 'empate deveria ficar com o remoto');
});

teste('fusos diferentes não confundem a comparação de conflito', () => {
  // O mesmo instante escrito de dois jeitos não pode dar vencedor.
  const zulu = { updatedAt: '2026-08-20T12:00:00.000Z' };
  const brasilia = { updatedAt: '2026-08-20T09:00:00.000-03:00' };
  assert.ok(!venceLocal(zulu, brasilia));
  assert.ok(!venceLocal(brasilia, zulu));
});

teste('operações na mesma linha se fundem em vez de virar duas idas ao servidor', () => {
  // Registrar e corrigir offline: o upsert manda o estado final de qualquer jeito.
  assert.deepEqual(fundir('create', 'update'), { operacao: 'create' });
  assert.deepEqual(fundir('update', 'update'), { operacao: 'update' });
  assert.deepEqual(fundir('update', 'delete'), { operacao: 'delete' });

  // Criar e apagar antes de sincronizar: o servidor nunca viu a linha, então nada precisa subir.
  assert.deepEqual(fundir('create', 'delete'), { descartarAmbas: true });
});

// ──────────────────────────────────────────────── código de convite (F10)

teste('o código gerado tem o tamanho certo e só usa o alfabeto sem ambiguidade', () => {
  for (let i = 0; i < 300; i++) {
    const c = gerarCodigoConvite();
    assert.equal(c.length, TAMANHO_CODIGO, `tamanho errado: ${c}`);
    // 0/O e 1/I/L ficam de fora: código lido em voz alta não pode depender de distinguir zero de ó.
    assert.ok(!/[01OIL]/.test(c), `caractere ambíguo em ${c}`);
    assert.ok(codigoValido(c), `o próprio gerador produziu código inválido: ${c}`);
  }
});

teste('o gerador cobre o alfabeto inteiro, incluindo as pontas', () => {
  // Sorteio no piso e no teto não pode estourar o índice nem repetir o mesmo símbolo.
  assert.equal(gerarCodigoConvite(() => 0), '222222');
  assert.equal(gerarCodigoConvite(() => 0.999999), 'ZZZZZZ');
});

teste('normalizar aceita o que a pessoa realmente digita', () => {
  assert.equal(normalizarCodigo('  a2b3c4 '), 'A2B3C4');
  assert.equal(normalizarCodigo('A2B-3C4'), 'A2B3C4');
  assert.equal(normalizarCodigo('a 2 b 3 c 4'), 'A2B3C4');
});

teste('normalizar não inventa correção de caractere ambíguo', () => {
  // Tentador "consertar" O para 0, mas nenhum dos dois está no alfabeto — corrigir um pelo outro
  // transformaria erro de digitação em outro código válido, que é pior do que recusar.
  assert.equal(normalizarCodigo('A2B3CO'), 'A2B3CO');
  assert.ok(!codigoValido('A2B3CO'), 'código com O deveria ser recusado');
  assert.ok(!codigoValido('A2B3C1'), 'código com 1 deveria ser recusado');
});

teste('código do tamanho errado é recusado antes de gastar ida ao servidor', () => {
  assert.ok(!codigoValido(''));
  assert.ok(!codigoValido('A2B3C'));
  assert.ok(!codigoValido('A2B3C45'));
  assert.ok(codigoValido('A2B3C4'));
});

// ──────────────────────────────────────────────────────────────────── resultado

console.log(`\n${passou} passou, ${falhas.length} falhou\n`);
for (const f of falhas) console.log(`  ✗ ${f}\n`);
if (falhas.length > 0) process.exit(1);
