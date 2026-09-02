/**
 * Quem está usando o app agora.
 *
 * A verdade da sessão é o token guardado pelo supabase-js; este store é a cópia em memória que
 * as telas observam. Existe para que a troca de conta redesenhe a árvore inteira de uma vez — o
 * guard de rota e o histórico da home leem a mesma coisa e nunca discordam por um instante.
 *
 * **A sessão não expira na prática.** O primeiro login exige rede, porque a conta mora no
 * Supabase; dali em diante o token fica no aparelho e o supabase-js o renova sozinho quando
 * houver conexão. Sem sinal, a sessão em cache abre o app do mesmo jeito — que é o estado normal
 * de uma pescaria, e não a exceção.
 */

import { create } from 'zustand';

import { sair, usuarioDaSessao, type Usuario } from '../auth';

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
  user: Usuario | null;
  estado: EstadoSessao;
  restaurar: () => Promise<void>;
  definir: (user: Usuario) => void;
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
