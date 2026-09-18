/**
 * Amigos e dados do grupo — F10 e F11.
 *
 * Tudo aqui exige rede, e diferente do registro de captura isso é inevitável: a lista de amigos e
 * as capturas deles moram no servidor. Por isso nenhuma função estoura — cada uma devolve um
 * resultado que diz o que houve, e a tela decide como contar isso para a pessoa.
 *
 * Quem pode ver o quê não é decidido aqui: o RLS do banco já garante que só amigos confirmados
 * leem capturas, perfis e desbloqueios uns dos outros. Este módulo pede tudo e recebe só o que é
 * permitido — de propósito, para que um erro neste arquivo não vire vazamento.
 */

import { codigoValido, normalizarCodigo } from '../domain/convite';
import type { CapturaDeGrupo, Desbloqueio } from '../domain/ranking';
import { supabase } from './cliente';

export interface Amigo {
  id: string;
  nome: string;
}

export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string };

const SEM_REDE =
  'Não foi possível falar com o servidor. Confira a internet; se ela estiver funcionando, o servidor pode estar fora do ar.';

function falha<T>(erro: string): Resultado<T> {
  return { ok: false, erro };
}

/**
 * Aceita o convite de alguém e cria a amizade nos dois sentidos.
 *
 * Quem escreve a linha inversa é a função `aceitar_convite` no banco (migration 0002), porque a
 * política de `friendships` só deixa cada um gravar as próprias linhas. Aceitar duas vezes não é
 * erro: tocar de novo no botão porque a tela demorou é o caso normal.
 */
export async function aceitarConvite(codigo: string): Promise<Resultado<Amigo>> {
  // Confere o formato antes de gastar uma ida ao servidor.
  if (!codigoValido(codigo)) {
    return falha('Código inválido. São 6 letras e números, sem 0, O, 1, I ou L.');
  }

  const sb = supabase();
  if (!sb) return falha(SEM_REDE);

  try {
    const { data, error } = await sb.rpc('aceitar_convite', { codigo: normalizarCodigo(codigo) });

    if (error) {
      if (error.code === 'P0002') return falha('Nenhum convite com esse código.');
      if (error.code === 'P0001') return falha('Esse é o seu próprio código. Envie para um amigo.');
      if (error.code === '28000') return falha('Entre na sua conta antes de aceitar o convite.');
      if (error.code === 'PGRST202') {
        return falha('O servidor ainda não aceita convites. Falta aplicar a migration 0002.');
      }
      return falha(error.message);
    }

    const linha = Array.isArray(data) ? data[0] : data;
    if (!linha?.amigo_id) return falha('O servidor não confirmou o convite. Tente de novo.');
    return { ok: true, valor: { id: linha.amigo_id, nome: linha.amigo_nome } };
  } catch {
    return falha(SEM_REDE);
  }
}

/** Nomes de uma lista de ids. O RLS devolve só o próprio perfil e os de amigos. */
async function nomes(ids: string[]): Promise<Map<string, string>> {
  const sb = supabase();
  const mapa = new Map<string, string>();
  if (!sb || ids.length === 0) return mapa;

  const { data } = await sb.from('profiles').select('id, display_name').in('id', ids);
  for (const p of data ?? []) mapa.set(p.id, p.display_name);
  return mapa;
}

export async function listarAmigos(meuId: string): Promise<Resultado<Amigo[]>> {
  const sb = supabase();
  if (!sb) return falha(SEM_REDE);

  try {
    const { data, error } = await sb.from('friendships').select('friend_id').eq('user_id', meuId);
    if (error) return falha(error.message);

    const ids = (data ?? []).map((f) => f.friend_id as string);
    const mapa = await nomes(ids);
    const amigos = ids
      .map((id) => ({ id, nome: mapa.get(id) ?? 'Pescador' }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    return { ok: true, valor: amigos };
  } catch {
    return falha(SEM_REDE);
  }
}

/** Desfaz a amizade nos dois sentidos — pelo mesmo motivo de simetria de aceitar. */
export async function removerAmigo(amigoId: string): Promise<Resultado<null>> {
  const sb = supabase();
  if (!sb) return falha(SEM_REDE);

  try {
    const { error } = await sb.rpc('remover_amizade', { outro: amigoId });
    if (error) return falha(error.message);
    return { ok: true, valor: null };
  } catch {
    return falha(SEM_REDE);
  }
}

export interface DadosDoGrupo {
  capturas: CapturaDeGrupo[];
  desbloqueios: Desbloqueio[];
  /** Nome de cada participante, inclusive o próprio. */
  nomes: Map<string, string>;
}

/**
 * Tudo que os rankings precisam, de uma vez.
 *
 * Não filtra por "meus amigos" aqui: o RLS já devolve só as linhas próprias e as de amigos
 * confirmados. Repetir o filtro no cliente seria uma segunda regra para manter igual à primeira —
 * e a do banco é a que vale.
 *
 * As próprias capturas vêm do servidor e não do SQLite, para que todos os participantes sejam
 * comparados pela mesma fonte. O preço é que uma captura que ainda não subiu não aparece no
 * ranking até sincronizar — quem chama deve disparar a sincronização antes.
 */
export async function dadosDoGrupo(meuId: string): Promise<Resultado<DadosDoGrupo>> {
  const sb = supabase();
  if (!sb) return falha(SEM_REDE);

  try {
    const [capturas, desbloqueios, amizades] = await Promise.all([
      sb
        .from('catches')
        .select('id, user_id, species_id, length_cm, weight_g, caught_at')
        .is('deleted_at', null),
      sb.from('unlocks').select('user_id, species_id'),
      sb.from('friendships').select('friend_id').eq('user_id', meuId),
    ]);

    const erro = capturas.error ?? desbloqueios.error ?? amizades.error;
    if (erro) return falha(erro.message);

    const ids = [meuId, ...(amizades.data ?? []).map((f) => f.friend_id as string)];

    return {
      ok: true,
      valor: {
        capturas: (capturas.data ?? []).map((c) => ({
          id: c.id,
          userId: c.user_id,
          speciesId: c.species_id,
          lengthCm: c.length_cm,
          weightG: c.weight_g,
          caughtAt: c.caught_at,
        })),
        desbloqueios: (desbloqueios.data ?? []).map((d) => ({
          userId: d.user_id,
          speciesId: d.species_id,
        })),
        nomes: await nomes(ids),
      },
    };
  } catch {
    return falha(SEM_REDE);
  }
}
