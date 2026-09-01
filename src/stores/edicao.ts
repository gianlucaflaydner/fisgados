/**
 * A captura em edição.
 *
 * Existe pelo mesmo motivo do rascunho: o seletor de espécie é uma tela à parte, e devolver um
 * valor de uma rota para outra não tem caminho limpo no expo-router. A diferença é que o rascunho
 * guarda uma captura que ainda não existe, e este guarda uma que já está no banco — por isso
 * carrega o `id`, e por isso é preenchido a partir da linha, não zerado.
 */

import { create } from 'zustand';

export interface Edicao {
  id: string | null;
  speciesId: string | null;
  lengthCm: string;
  weightG: string;
  placeLabel: string;
  released: boolean;
}

const vazio = (): Edicao => ({
  id: null,
  speciesId: null,
  lengthCm: '',
  weightG: '',
  placeLabel: '',
  released: false,
});

interface EdicaoStore extends Edicao {
  set: (patch: Partial<Edicao>) => void;
  carregar: (valores: Edicao) => void;
  reset: () => void;
}

export const useEdicao = create<EdicaoStore>((set) => ({
  ...vazio(),
  set: (patch) => set(patch),
  carregar: (valores) => set(valores),
  reset: () => set(vazio()),
}));
