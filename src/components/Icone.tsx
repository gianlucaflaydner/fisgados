import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useCores } from '@/theme';

/**
 * Os ícones do app, em traço — do style guide.
 *
 * Desenhados aqui, em SVG, e não vindos de uma biblioteca de ícones: são doze, todos de traço de
 * 2 px no mesmo quadro de 24, e uma dependência de mil ícones para usar doze cobraria o preço no
 * tamanho do bundle e na variação de estilo entre eles.
 *
 * Sem emoji em lugar nenhum: emoji muda de desenho a cada sistema e não aceita a cor do tema.
 */
export type NomeDoIcone =
  | 'inicio'
  | 'album'
  | 'mais'
  | 'ranking'
  | 'amigos'
  | 'local'
  | 'relogio'
  | 'balanca'
  | 'camera'
  | 'voltar'
  | 'avancar'
  | 'busca'
  | 'lua'
  | 'menos'
  | 'cadeado'
  | 'soltar'
  | 'compartilhar';

interface Props {
  nome: NomeDoIcone;
  tamanho?: number;
  /** Padrão: a cor do texto do tema. */
  cor?: string;
  traco?: number;
}

export function Icone({ nome, tamanho = 24, cor, traco = 2 }: Props) {
  const paleta = useCores();
  const c = cor ?? paleta.texto;
  const comum = {
    stroke: c,
    strokeWidth: traco,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24">
      {nome === 'inicio' ? <Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" {...comum} /> : null}

      {nome === 'album' ? (
        <>
          <Rect x="3" y="3" width="7.5" height="9" rx="1.5" {...comum} />
          <Rect x="13.5" y="3" width="7.5" height="9" rx="1.5" {...comum} />
          <Rect x="3" y="14.5" width="7.5" height="6.5" rx="1.5" {...comum} />
          <Rect x="13.5" y="14.5" width="7.5" height="6.5" rx="1.5" {...comum} />
        </>
      ) : null}

      {nome === 'mais' ? <Path d="M12 5v14M5 12h14" {...comum} strokeWidth={traco + 0.6} /> : null}
      {nome === 'menos' ? <Path d="M5 12h14" {...comum} strokeWidth={traco + 0.6} /> : null}

      {nome === 'ranking' ? (
        <>
          <Path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" {...comum} />
          <Path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" {...comum} />
        </>
      ) : null}

      {nome === 'amigos' ? (
        <>
          <Circle cx="9" cy="8" r="3.5" {...comum} />
          <Path d="M2.5 20a6.5 6.5 0 0 1 13 0" {...comum} />
          <Path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" {...comum} />
        </>
      ) : null}

      {nome === 'local' ? (
        <>
          <Path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z" {...comum} />
          <Circle cx="12" cy="9.5" r="2.5" {...comum} />
        </>
      ) : null}

      {nome === 'relogio' ? (
        <>
          <Rect x="3.5" y="5" width="17" height="15" rx="2.5" {...comum} />
          <Path d="M3.5 10h17M8 3v4M16 3v4" {...comum} />
        </>
      ) : null}

      {nome === 'balanca' ? (
        <>
          <Path d="M6 8h12l2 12H4z" {...comum} />
          <Path d="M9 8a3 3 0 0 1 6 0" {...comum} />
        </>
      ) : null}

      {nome === 'camera' ? (
        <>
          <Path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...comum} />
          <Circle cx="12" cy="13" r="4" {...comum} />
        </>
      ) : null}

      {nome === 'voltar' ? <Path d="M15 5l-7 7 7 7" {...comum} strokeWidth={traco + 0.2} /> : null}
      {nome === 'avancar' ? <Path d="M9 5l7 7-7 7" {...comum} strokeWidth={traco + 0.2} /> : null}

      {nome === 'busca' ? (
        <>
          <Circle cx="11" cy="11" r="6.5" {...comum} />
          <Path d="M20 20l-4.2-4.2" {...comum} />
        </>
      ) : null}

      {nome === 'lua' ? <Path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" {...comum} /> : null}

      {nome === 'cadeado' ? (
        <>
          <Rect x="4" y="10" width="16" height="11" rx="2.5" {...comum} />
          <Path d="M8 10V7a4 4 0 0 1 8 0v3" {...comum} />
        </>
      ) : null}

      {nome === 'soltar' ? <Path d="M4 12h12M12 6l6 6-6 6" {...comum} /> : null}

      {nome === 'compartilhar' ? (
        <>
          <Path d="M12 15V3M7 8l5-5 5 5" {...comum} />
          <Path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" {...comum} />
        </>
      ) : null}

    </Svg>
  );
}

/**
 * A silhueta de peixe da carta bloqueada.
 *
 * Fica fora do `Icone` porque não é símbolo de interface: é o desenho que ocupa o lugar da foto
 * que ainda não existe, preenchido e num quadro deitado (64×32). O nome da espécie aparece do
 * lado, legível — a carta trancada precisa dizer **o que procurar**.
 */
export function Silhueta({ largura, cor }: { largura: number; cor: string }) {
  return (
    <Svg width={largura} height={largura / 2} viewBox="0 0 64 32">
      <Path d="M3 16C11 6 29 4 43 12l12-8v24l-12-8C29 28 11 26 3 16z" fill={cor} />
    </Svg>
  );
}
