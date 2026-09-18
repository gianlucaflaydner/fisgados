/**
 * Foto da captura — entrada, enquadramento e preparo.
 *
 * A imagem entra por dois caminhos, câmera e galeria (F02), passa pelo enquadramento e sai por um
 * só: recortada em 3:4, com lado maior de 1600 px e JPEG 80.
 *
 * A compressão não acontece mais na entrada, e sim depois do recorte. Comprimir antes seria jogar
 * fora resolução que o zoom do enquadramento ainda vai usar — quem aproxima 3× num arquivo já
 * reduzido fica com um peixe borrado na carta.
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { dataDoExif } from '../domain/exif';
import type { Recorte, Rotacao } from '../domain/recorte';

/** Requisito não funcional do PRD 11.13. Teto, não alvo: foto menor não é ampliada. */
export const LADO_MAIOR_PX = 1600;
export const QUALIDADE_JPEG = 0.8;

/** A foto como saiu do aparelho, antes de qualquer decisão de enquadramento. */
export interface FotoBruta {
  uri: string;
  largura: number;
  altura: number;
  /** Quando a foto foi tirada, lido do EXIF. `null` quando a imagem não traz a marca. */
  capturadaEm: Date | null;
}

export type EscolhaGaleria = { estado: 'escolhida'; foto: FotoBruta } | { estado: 'cancelada' };

/**
 * Abre a galeria do aparelho.
 *
 * O peixe de ontem também vale: muita captura é fotografada no calor do momento, com o app
 * fechado, e obrigar a refotografar a tela do celular é o tipo de exigência que faz a pessoa
 * desistir de registrar. O original permanece na galeria — o app copia, nunca move.
 *
 * Não há pedido de permissão antes: o seletor do sistema roda fora do app e devolve só o que a
 * pessoa escolheu ali. Pedir acesso à galeria inteira seria uma caixa de diálogo a mais para
 * conseguir menos — e uma recusa bloquearia um caminho que funcionaria sem ela.
 *
 * O EXIF é lido só para descobrir **quando** a foto foi tirada, e descartado em seguida. A
 * coordenada que ele carrega não é aproveitada de propósito: o formato varia entre aparelhos e
 * uma leitura errada viraria uma pescaria registrada no lugar errado, calada.
 */
export async function escolherDaGaleria(): Promise<EscolhaGaleria> {
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    // Sem recorte do sistema: o enquadramento é nosso, na proporção da carta.
    allowsEditing: false,
    quality: 1,
    exif: true,
  });
  if (r.canceled) return { estado: 'cancelada' };

  const foto = r.assets[0];
  if (!foto) return { estado: 'cancelada' };

  return {
    estado: 'escolhida',
    foto: {
      uri: foto.uri,
      largura: foto.width,
      altura: foto.height,
      capturadaEm: dataDoExif(foto.exif),
    },
  };
}

/**
 * Descobre o tamanho real de uma imagem quando o sistema não informou.
 *
 * A galeria às vezes devolve largura e altura zeradas. Sem elas, o enquadramento não teria como
 * calcular nada — uma passada sem ação no manipulador resolve, ao custo de uma decodificação.
 */
export async function medirImagem(uri: string): Promise<{ largura: number; altura: number }> {
  const r = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 1,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { largura: r.width, altura: r.height };
}

/**
 * Abre a galeria e devolve a foto pronta para o enquadramento, com as dimensões reais. `null`
 * quando a pessoa fecha a galeria sem escolher.
 *
 * Existe porque três telas abrem a galeria — câmera, enquadramento e detalhes — e o cuidado com
 * a largura zerada que alguns aparelhos devolvem não pode ficar só em uma delas. Esquecer em uma
 * tela quebraria o enquadramento exatamente para quem troca de foto.
 */
export async function fotoDaGaleria(): Promise<FotoBruta | null> {
  const escolha = await escolherDaGaleria();
  if (escolha.estado === 'cancelada') return null;

  const { uri, capturadaEm, largura, altura } = escolha.foto;
  const medida = largura > 0 && altura > 0 ? { largura, altura } : await medirImagem(uri);
  return { uri, ...medida, capturadaEm };
}

/**
 * Aplica o enquadramento e entrega o arquivo final.
 *
 * A ordem importa: girar antes de recortar, porque o retângulo do recorte foi calculado sobre a
 * imagem já girada. Depois vem o teto de 1600 px e a compressão, nessa ordem — reduzir antes de
 * comprimir gasta menos memória do que o contrário.
 */
export async function finalizarFoto(
  uri: string,
  opcoes: { rotacao: Rotacao; recorte: Recorte },
): Promise<string> {
  const acoes: ImageManipulator.Action[] = [];

  if (opcoes.rotacao !== 0) acoes.push({ rotate: opcoes.rotacao });
  acoes.push({ crop: opcoes.recorte });

  const maiorLado = Math.max(opcoes.recorte.width, opcoes.recorte.height);
  if (maiorLado > LADO_MAIOR_PX) {
    acoes.push({
      resize:
        opcoes.recorte.width >= opcoes.recorte.height
          ? { width: LADO_MAIOR_PX }
          : { height: LADO_MAIOR_PX },
    });
  }

  const resultado = await ImageManipulator.manipulateAsync(uri, acoes, {
    compress: QUALIDADE_JPEG,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return resultado.uri;
}
