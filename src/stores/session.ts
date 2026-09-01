/**
 * Quem está usando o app agora.
 *
 * A verdade da sessão está no SQLite (tabela `session`); este store é a cópia em memória que as
 * telas observam. Existe para que a troca de conta redesenhe a árvore inteira de uma vez — o
 * guard de rota e o histórico da home leem a mesma coisa e nunca discordam por um instante.
 *
 * **A sessão não expira.** Não há prazo, não há renovação, não há revalidação periódica: quem
 * entrou continua entrado até tocar em "Sair". Um app que se usa na beira do açude, sem sinal e
 * com a mão molhada, não pode pedir senha de novo no meio de uma pescaria. Quando a Etapa 3
 * trouxer o Supabase, o token que expira fica do lado de lá — a permanência local continua sendo
 * esta linha no banco.
 */

import { create } from 'zustand';

import { sair, usuarioDaSessao } from '../auth';
import type { UserRow } from '../db/schema';

/**
 * `erro` é diferente de "sem usuário". Sem usuário é o login; erro é o banco não ter respondido,
 * e nesse caso ninguém pode ser deslogado — a pessoa continua logada, o app só não conseguiu
 * lembrar quem ela é ainda.
 */
export type EstadoSessao = 'carregando' | 'pronto' | 'erro';

/** Falha de leitura no boot costuma ser passageira. Tenta de novo antes de incomodar alguém. */
const TENTATIVAS = 3;
const ESPERA_MS = 250;

interface SessionStore {
  user: UserRow | null;
  estado: EstadoSessao;
  restaurar: () => Promise<void>;
  definir: (user: UserRow) => void;
  encerrar: () => Promise<void>;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const useSession = create<SessionStore>((set) => ({
  user: null,
  estado: 'carregando',

  restaurar: async () => {
    set({ estado: 'carregando' });

    for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
      try {
        set({ user: await usuarioDaSessao(), estado: 'pronto' });
        return;
      } catch {
        if (tentativa < TENTATIVAS) await espera(ESPERA_MS * tentativa);
      }
    }

    // Esgotadas as tentativas, o app mostra um aviso com "Tentar de novo" — e **não** o login.
    // Mandar digitar a senha por causa de uma leitura falha seria deslogar quem não pediu.
    set({ estado: 'erro' });
  },

  definir: (user) => set({ user, estado: 'pronto' }),

  encerrar: async () => {
    // A tela some primeiro: se apagar a linha do banco falhar, o app não pode continuar
    // mostrando o histórico de quem pediu para sair.
    set({ user: null, estado: 'pronto' });
    try {
      await sair();
    } catch {
      // Nada de útil a fazer aqui, e um erro não tratado viraria tela vermelha em cima de quem
      // só quis sair. O custo do silêncio é a sessão voltar no próximo boot; o do redbox é agora.
    }
  },
}));

/**
 * Id do dono para as queries. Estoura se não houver sessão, e isso é intencional: nenhuma tela
 * dentro do app deveria ser alcançável deslogada, então cair aqui é bug de rota, não de dado.
 */
export function userIdAtual(): string {
  const { user } = useSession.getState();
  if (!user) throw new Error('Sem sessão ativa: tela protegida foi aberta sem login.');
  return user.id;
}
