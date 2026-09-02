/**
 * Estado da sincronização, para a interface.
 *
 * O SDD é explícito: nunca bloquear a interface esperando sincronização. Este store existe para
 * que a tela consiga mostrar um indicador discreto — quantas capturas ainda não subiram — sem
 * que nenhuma ação do usuário dependa disso.
 *
 * `disparar()` pode ser chamado à vontade: o worker recusa rodadas simultâneas por conta própria,
 * e uma chamada sem nuvem ou com a fila vazia não custa nada.
 */

import { create } from 'zustand';

import { pendentesNaFila } from '../db/queries';
import { nuvemConfigurada } from '../sync/config';
import { sincronizar } from '../sync/worker';

interface SyncStore {
  pendentes: number;
  sincronizando: boolean;
  /** Roda uma rodada e atualiza o contador. Nunca estoura: falhar é caso previsto. */
  disparar: () => Promise<void>;
  /** Só relê o contador, sem tentar subir nada. */
  recontar: () => Promise<void>;
}

export const useSync = create<SyncStore>((set, get) => ({
  pendentes: 0,
  sincronizando: false,

  disparar: async () => {
    if (get().sincronizando || !nuvemConfigurada()) {
      await get().recontar();
      return;
    }
    set({ sincronizando: true });
    try {
      await sincronizar();
    } catch {
      // Uma rodada que falhou não é erro de interface: os itens continuam na fila com a próxima
      // tentativa agendada, e é isso que o contador vai mostrar.
    } finally {
      set({ sincronizando: false });
      await get().recontar();
    }
  },

  recontar: async () => {
    try {
      set({ pendentes: await pendentesNaFila() });
    } catch {
      // Contador é enfeite informativo. Falhar ao lê-lo não pode derrubar tela nenhuma.
    }
  },
}));
