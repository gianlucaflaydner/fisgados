/**
 * Rascunho da captura em andamento.
 *
 * Existe porque o fluxo cruza três telas (câmera → detalhes → seletor de espécie) e passar foto
 * e medida por parâmetro de rota daria URL grande e estado duplicado. Vive só em memória: se o
 * app morrer no meio, o rascunho morre junto — o que está salvo está no SQLite.
 */

import { create } from 'zustand';

export interface Draft {
  photoUri: string | null;
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
