/**
 * Tema ativo — claro, escuro ou seguindo o sistema.
 *
 * São três estados, não dois. "Seguir o sistema" é o padrão porque o celular já sabe a preferência
 * da pessoa e costuma virar sozinho no fim da tarde — exatamente quando a pescaria muda de luz.
 * Os outros dois existem para quem quer mandar no assunto.
 *
 * Quem aplica de fato o tema é o NativeWind, através de `colorScheme.set`. Este store só guarda a
 * escolha e a devolve ao banco, para que ela sobreviva a fechar o app.
 */

import { colorScheme } from 'nativewind';
import { create } from 'zustand';

import { getPref, setPref } from '../db/queries';

export type Preferencia = 'sistema' | 'claro' | 'escuro';

const CHAVE = 'tema';

/** Os nomes do app são em português; os do NativeWind, não. A tradução mora aqui e só aqui. */
const PARA_NATIVEWIND = {
  sistema: 'system',
  claro: 'light',
  escuro: 'dark',
} as const;

function ehPreferencia(v: string | undefined): v is Preferencia {
  return v === 'sistema' || v === 'claro' || v === 'escuro';
}

interface TemaStore {
  preferencia: Preferencia;
  restaurar: () => Promise<void>;
  definir: (p: Preferencia) => Promise<void>;
}

export const useTema = create<TemaStore>((set) => ({
  preferencia: 'sistema',
  restaurar: async () => {
    try {
      const salva = await getPref(CHAVE);
      const preferencia: Preferencia = ehPreferencia(salva) ? salva : 'sistema';
      colorScheme.set(PARA_NATIVEWIND[preferencia]);
      set({ preferencia });
    } catch {
      // Sem preferência lida, o sistema decide. Tema é gosto: não vale segurar o boot por isso.
      colorScheme.set('system');
    }
  },
  definir: async (preferencia) => {
    // A tela muda primeiro. Gravar é consequência, não pré-condição — e se a gravação falhar, o
    // pior que acontece é o app voltar ao padrão no próximo boot.
    colorScheme.set(PARA_NATIVEWIND[preferencia]);
    set({ preferencia });
    try {
      await setPref(CHAVE, preferencia);
    } catch {
      // Preferência não persistida não justifica erro na cara de quem só queria trocar o tema.
    }
  },
}));
