/**
 * A identificação da foto em andamento.
 *
 * Começa assim que o enquadramento termina e corre em paralelo ao formulário (PRD 6.1, passo 3):
 * quem está com o peixe na mão já vai digitando a medida enquanto a IA olha a foto.
 *
 * O resultado fica preso à foto que o originou. Trocar a foto começa outra identificação, e a
 * resposta atrasada da foto anterior é descartada ao chegar — senão uma sugestão da tilápia
 * descartada apareceria em cima da traíra nova.
 */

import { create } from 'zustand';

import { getPref, setPref } from '../db/queries';
import type { Sugestao } from '../domain/identificacao';
import { identificarFoto, type ResultadoIdentificacao } from '../sync/identificar';

export type EstadoIdentificacao =
  | { estado: 'ociosa' }
  | { estado: 'buscando' }
  | { estado: 'pronta'; modelo: string; sugestoes: Sugestao[] }
  /** `avisar` só é verdadeiro na primeira vez do dia em que o limite bate (SDD 6.5). */
  | { estado: 'falhou'; motivo: Extract<ResultadoIdentificacao, { ok: false }>['motivo']; avisar: boolean };

interface IdentificacaoStore {
  /** A foto a que o resultado pertence. */
  uri: string | null;
  resultado: EstadoIdentificacao;
  iniciar: (uri: string) => void;
  limpar: () => void;
}

const AVISO_LIMITE = 'ia_aviso_limite_em';

/** O aviso de limite aparece uma vez por dia, não a cada foto: já se sabe, não precisa repetir. */
async function primeiroAvisoDoDia(): Promise<boolean> {
  const hoje = new Date().toLocaleDateString('sv-SE'); // AAAA-MM-DD no fuso do aparelho
  try {
    if ((await getPref(AVISO_LIMITE)) === hoje) return false;
    await setPref(AVISO_LIMITE, hoje);
  } catch {
    // Sem conseguir lembrar, avisa: melhor repetir o aviso do que esconder por que a IA sumiu.
  }
  return true;
}

export const useIdentificacao = create<IdentificacaoStore>((set, get) => ({
  uri: null,
  resultado: { estado: 'ociosa' },

  iniciar: (uri) => {
    set({ uri, resultado: { estado: 'buscando' } });
    void (async () => {
      const r = await identificarFoto(uri);
      const resultado: EstadoIdentificacao = r.ok
        ? { estado: 'pronta', modelo: r.modelo, sugestoes: r.sugestoes }
        : { estado: 'falhou', motivo: r.motivo, avisar: r.motivo === 'limite' && (await primeiroAvisoDoDia()) };
      if (get().uri === uri) set({ resultado });
    })();
  },

  limpar: () => set({ uri: null, resultado: { estado: 'ociosa' } }),
}));
