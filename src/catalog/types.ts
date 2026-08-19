/**
 * Tipos do catálogo de espécies.
 *
 * O catálogo é um JSON embarcado no bundle (SDD seção 1): read-only, versionado junto com o
 * app, disponível sem rede. Nada aqui depende de React ou de I/O — o app importa só os tipos.
 */

export type Rarity = 'comum' | 'incomum' | 'raro' | 'lendario';

export type AlbumId = 'pesqueiros-sul' | 'rios-acudes-sul' | 'costa-sul';

export const ALBUM_IDS: readonly AlbumId[] = ['pesqueiros-sul', 'rios-acudes-sul', 'costa-sul'];

export type BadgeTier = 'bronze' | 'prata' | 'ouro' | 'platina' | 'diamante';

export const BADGE_TIERS: readonly BadgeTier[] = ['bronze', 'prata', 'ouro', 'platina', 'diamante'];

/**
 * Relação comprimento-peso do FishBase: P(g) = a × C(cm)^b.
 *
 * `a` é sempre normalizado para **comprimento total (TL)**, que é o que o pescador mede com o
 * peixe na régua. Estudos publicados em SL ou FL só entram quando o FishBase fornece o `aTL`
 * já convertido; não convertemos por conta própria (PRD 9.1, SDD seção 5).
 */
export interface LengthWeight {
  a: number;
  b: number;
  /**
   * Eixo em que `a` está expresso: comprimento total para quase tudo, largura do disco para
   * arraias. Explícito para que ninguém precise confiar na memória ao auditar.
   */
  lengthType: 'TL' | 'WD';
  /**
   * Como o `a` chegou a TL: publicado já em TL, lido do campo `aTL` do FishBase, ou reescalado
   * a partir de SL/FL pela relação comprimento-comprimento. Importa numa auditoria futura.
   */
  origin: 'TL' | 'aTL' | 'convertido';
  /**
   * Preenchido quando o coeficiente foi emprestado de uma espécie congênere, por não existir
   * estudo para a espécie do catálogo. A ficha deve dizer isso — estimativa emprestada é
   * estimativa mais grosseira, e esconder isso contraria o princípio 1 do PRD.
   */
  proxySpecies: string | null;
  /** Localidade do estudo escolhido — a procedência importa mais que a precisão decimal. */
  locality: string;
  /** Tamanho da amostra do estudo, quando informado. */
  sampleSize: number | null;
  /** Quantos estudos sobreviveram ao filtro. 1 significa que não houve escolha a fazer. */
  candidates: number;
  fishbaseVersion: string;
}

/**
 * Os cinco nomes da linha de insígnia da espécie (PRD 11.6).
 *
 * Espécie lendária não tem bronze nem prata: a primeira captura já entrega o ouro, então esses
 * dois campos vêm nulos. Espécie sem nomes escritos à mão recebe os nomes da regra de fallback
 * e fica com `curated: false`, para aparecer na lista de pendências do build.
 */
export interface BadgeLine {
  bronze: string | null;
  prata: string | null;
  ouro: string;
  platina: string;
  diamante: string;
  curated: boolean;
}

/**
 * Como o pescador mede este peixe.
 *
 * `comprimento` é o padrão e vale para tudo que tem corpo alongado. `largura` existe para as
 * arraias: ninguém mede uma arraia do focinho à ponta do rabo — mede-se a largura do disco, e
 * exigir o contrário produziria dado que ninguém consegue coletar duas vezes igual.
 *
 * Afeta o rótulo do campo na tela de registro e o eixo da relação comprimento-peso.
 */
export type MeasureAxis = 'comprimento' | 'largura';

export interface Species {
  /** Slug estável. Nunca muda: é chave estrangeira no SQLite e no Postgres. */
  id: string;
  albums: AlbumId[];
  /** Posição na grade de cada álbum em que a espécie aparece. */
  albumOrder: Partial<Record<AlbumId, number>>;

  commonName: string;
  /** Apelidos regionais. Alimentam a busca do seletor manual (PRD 9.1). */
  aliases: string[];
  scientificName: string;
  /**
   * Variedade da espécie, quando a carta representa uma linhagem e não um táxon — carpa-espelho
   * e carpa-colorida são ambas *Cyprinus carpio*, e a tilápia-vermelha é uma linhagem de
   * *Oreochromis*. São cartas próprias porque o pescador as reconhece como peixes diferentes,
   * e o álbum é sobre reconhecimento, não sobre taxonomia. `null` para a maioria.
   */
  variety: string | null;
  rarity: Rarity;

  /** Eixo de medida. Só as arraias verdadeiras usam `largura`. */
  measure: MeasureAxis;

  /**
   * Faixa regional curada, no eixo de `measure`. Valida entrada e define troféu (RN19).
   * Os nomes seguem dizendo `Length` porque comprimento é o caso de quase todas as espécies;
   * para as arraias, leia como largura do disco.
   */
  minLengthCm: number;
  avgLengthCm: number;
  maxLengthCm: number;

  /** null quando não há estudo confiável: a espécie simplesmente não estima peso. */
  lengthWeight: LengthWeight | null;

  habitat: string[];
  /** Uma ou duas frases para a ficha da espécie (F08). */
  fact: string;
  silhouette: string;
  /** Ids que a IA costuma confundir. Alimenta a desambiguação do SDD 6.3. */
  visuallySimilarTo: string[];

  badges: BadgeLine;

  /** Híbrido de pesqueiro: não existe no FishBase, nunca terá coeficiente próprio. */
  hybrid: boolean;

  /** Auditoria da nomenclatura, preenchida pelo build (PRD 9.1, validação 1). */
  taxonomy: {
    fishbaseSpecCode: number | null;
    status: 'aceito' | 'sinonimo' | 'nao-encontrado' | 'hibrido';
    /** Preenchido quando o nome curado é sinônimo: o nome aceito hoje pelo FishBase. */
    acceptedName: string | null;
  };
}

export interface Album {
  id: AlbumId;
  name: string;
  /** Quantas cartas o álbum tem. Espécies repetidas contam como carta em cada álbum. */
  cardCount: number;
}

export interface Catalog {
  /** Versão do catálogo, incrementada a cada mudança de conteúdo. */
  version: number;
  generatedAt: string;
  fishbaseVersion: string;
  albums: Album[];
  species: Species[];
}
