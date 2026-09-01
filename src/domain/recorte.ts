/**
 * Enquadramento da foto da captura.
 *
 * A máscara não é um recorte genérico: é a carta. A proporção 3:4 é a mesma da grade do álbum, e
 * por isso a foto enquadrada aqui serve na carta e no card do histórico sem que nada precise
 * cortar de novo por conta própria — recorte automático é o que faz o peixe sair pela metade.
 *
 * Vive em `domain/` porque é geometria pura: dá para testar sem emulador, e é onde erro de sinal
 * ou de arredondamento se esconde bem.
 */

/** Proporção da carta, largura sobre altura. Muda aqui e muda no álbum inteiro. */
export const PROPORCAO_CARTA = 3 / 4;

/** Quanto o usuário pode aproximar. Além disso a foto vira borrão e a carta perde o peixe. */
export const ESCALA_MAX = 5;

export type Rotacao = 0 | 90 | 180 | 270;

export interface Dimensoes {
  largura: number;
  altura: number;
}

export interface Recorte {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

/** Girar em 90° ou 270° troca os lados. O resto do cálculo trabalha sobre o resultado disto. */
export function dimensoesAposGirar(d: Dimensoes, rotacao: Rotacao): Dimensoes {
  return rotacao === 90 || rotacao === 270
    ? { largura: d.altura, altura: d.largura }
    : { largura: d.largura, altura: d.altura };
}

/**
 * Escala que faz a imagem cobrir a janela inteira, sem sobrar buraco.
 *
 * É o piso do zoom: abaixo disso apareceria fundo vazio dentro da carta, e carta com canto vazio
 * não é foto mal enquadrada, é defeito.
 */
export function escalaDeCobertura(imagem: Dimensoes, janela: Dimensoes): number {
  if (imagem.largura <= 0 || imagem.altura <= 0) return 1;
  return Math.max(janela.largura / imagem.largura, janela.altura / imagem.altura);
}

/**
 * Até onde o arrasto pode ir sem descolar a imagem da janela.
 *
 * Devolve o módulo do deslocamento máximo em cada eixo. Com a imagem exatamente do tamanho da
 * janela num eixo, o limite é zero — não há folga para arrastar, e insistir só produziria borda.
 */
export function limitesDeslocamento(
  imagem: Dimensoes,
  janela: Dimensoes,
  escala: number,
): { x: number; y: number } {
  const total = escalaDeCobertura(imagem, janela) * escala;
  return {
    x: Math.max(0, (imagem.largura * total - janela.largura) / 2),
    y: Math.max(0, (imagem.altura * total - janela.altura) / 2),
  };
}

/** Prende um valor entre dois limites. */
export function prender(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

export interface EstadoEnquadramento {
  /** Dimensões da imagem **já girada**, em pixels do arquivo. */
  imagem: Dimensoes;
  /** A máscara na tela, em pixels de layout. */
  janela: Dimensoes;
  /** Multiplicador sobre a escala de cobertura. 1 = imagem no menor tamanho que cobre a janela. */
  escala: number;
  /** Deslocamento do centro da imagem em relação ao centro da janela, em pixels de tela. */
  deslocX: number;
  deslocY: number;
}

/**
 * Converte o que está na tela para um retângulo em pixels do arquivo.
 *
 * O `expo-image-manipulator` recorta em coordenadas da imagem, não da tela, e exige inteiros.
 * Todo o arredondamento acontece no fim, uma vez só: arredondar no meio da conta acumula erro e
 * produz uma faixa de um pixel de fundo na borda da carta.
 */
export function calcularRecorte(estado: EstadoEnquadramento): Recorte {
  const { imagem, janela } = estado;

  // Imagem degenerada não gera recorte inválido: devolve o que existe e deixa o resto seguir.
  if (imagem.largura <= 0 || imagem.altura <= 0 || janela.largura <= 0 || janela.altura <= 0) {
    return {
      originX: 0,
      originY: 0,
      width: Math.max(1, Math.round(imagem.largura)),
      height: Math.max(1, Math.round(imagem.altura)),
    };
  }

  const total = escalaDeCobertura(imagem, janela) * Math.max(1, estado.escala);
  const limites = limitesDeslocamento(imagem, janela, Math.max(1, estado.escala));

  const deslocX = prender(estado.deslocX, -limites.x, limites.x);
  const deslocY = prender(estado.deslocY, -limites.y, limites.y);

  // Quanto da imagem cabe na janela, em pixels do arquivo.
  const larguraVisivel = Math.min(imagem.largura, janela.largura / total);
  const alturaVisivel = Math.min(imagem.altura, janela.altura / total);

  // Canto superior esquerdo da janela, em coordenadas da imagem.
  const originX = (imagem.largura - larguraVisivel) / 2 - deslocX / total;
  const originY = (imagem.altura - alturaVisivel) / 2 - deslocY / total;

  const width = Math.max(1, Math.round(larguraVisivel));
  const height = Math.max(1, Math.round(alturaVisivel));

  return {
    originX: Math.round(prender(originX, 0, imagem.largura - width)),
    originY: Math.round(prender(originY, 0, imagem.altura - height)),
    width,
    height,
  };
}
