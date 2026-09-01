/**
 * Rascunho da captura em andamento.
 *
 * Existe porque o fluxo cruza três telas (câmera → detalhes → seletor de espécie) e passar foto
 * e medida por parâmetro de rota daria URL grande e estado duplicado. Vive só em memória: se o
 * app morrer no meio, o rascunho morre junto — o que está salvo está no SQLite.
 */

import { create } from 'zustand';

/**
 * De onde veio a foto. Muda o que o app pode assumir sobre o resto do registro: foto tirada
 * agora acontece onde a pessoa está; foto da galeria pode ser de outro dia e de outro lugar.
 */
export type OrigemFoto = 'camera' | 'galeria';

/** A foto como saiu do aparelho, esperando enquadramento. Descartada assim que vira `photoUri`. */
export interface FotoParaEnquadrar {
  uri: string;
  largura: number;
  altura: number;
}

export interface Draft {
  /** A foto final, já enquadrada em 3:4 e comprimida. É esta que vai para o banco. */
  photoUri: string | null;
  fotoBruta: FotoParaEnquadrar | null;
  origemFoto: OrigemFoto | null;
  speciesId: string | null;
  lengthCm: string;
  weightG: string;
  placeLabel: string;
  released: boolean;
  lat: number | null;
  lng: number | null;
  caughtAt: Date;
  offlineOrigin: boolean;
}

const vazio = (): Draft => ({
  photoUri: null,
  fotoBruta: null,
  origemFoto: null,
  speciesId: null,
  lengthCm: '',
  weightG: '',
  placeLabel: '',
  released: false,
  lat: null,
  lng: null,
  caughtAt: new Date(),
  offlineOrigin: false,
});

interface DraftStore extends Draft {
  set: (patch: Partial<Draft>) => void;
  reset: () => void;
}

export const useDraft = create<DraftStore>((set) => ({
  ...vazio(),
  set: (patch) => set(patch),
  reset: () => set(vazio()),
}));
