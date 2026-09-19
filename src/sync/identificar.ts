import { FunctionsHttpError } from '@supabase/supabase-js';
import * as ImageManipulator from 'expo-image-manipulator';

import { getSpecies } from '../catalog';
import { sanearSugestoes, type Sugestao } from '../domain/identificacao';
import { supabase } from './cliente';

/**
 * Pede à Edge Function `identificar` as sugestões de espécie para uma foto — SDD seção 6.
 *
 * Nunca lança: a IA é aceleração, nunca dependência (SDD 6.5). Toda falha vira um motivo, e quem
 * chama segue pelo seletor manual, que já está na tela.
 */

export type ResultadoIdentificacao =
  | { ok: true; modelo: string; sugestoes: Sugestao[] }
  | { ok: false; motivo: 'sem-nuvem' | 'sem-sessao' | 'limite' | 'indisponivel' };

/** 600 × 800: sobra para o modelo ver mancha e boca, e a foto sobe em menos de um segundo no 4G. */
const LARGURA_PX = 600;

/**
 * O servidor desiste da Gemini em 6 s (SDD 6.5). Os 3 s a mais cobrem a subida da foto e a
 * partida a frio da função. O formulário já está na tela: esperar aqui não trava ninguém.
 */
const TIMEOUT_MS = 9_000;

async function fotoEmBase64(uri: string): Promise<string | null> {
  const r = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: LARGURA_PX } }], {
    compress: 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  return r.base64 ?? null;
}

export async function identificarFoto(uri: string): Promise<ResultadoIdentificacao> {
  const sb = supabase();
  if (!sb) return { ok: false, motivo: 'sem-nuvem' };

  try {
    const { data: sessao } = await sb.auth.getSession();
    if (!sessao.session) return { ok: false, motivo: 'sem-sessao' };

    const foto = await fotoEmBase64(uri);
    if (!foto) return { ok: false, motivo: 'indisponivel' };

    const { data, error } = await sb.functions.invoke<{ modelo?: unknown; sugestoes?: unknown }>('identificar', {
      body: { foto },
      timeout: TIMEOUT_MS,
    });

    if (error) {
      const status = error instanceof FunctionsHttpError ? (error.context as Response | undefined)?.status : undefined;
      if (status === 429) return { ok: false, motivo: 'limite' };
      if (status === 401) return { ok: false, motivo: 'sem-sessao' };
      return { ok: false, motivo: 'indisponivel' };
    }

    return {
      ok: true,
      modelo: typeof data?.modelo === 'string' ? data.modelo : 'desconhecido',
      sugestoes: sanearSugestoes(data?.sugestoes, (id) => getSpecies(id) !== undefined),
    };
  } catch {
    // Sem rede, DNS do projeto pausado, timeout: tudo cai aqui, e tudo significa a mesma coisa
    // para quem está com o peixe na mão — escolher na lista.
    return { ok: false, motivo: 'indisponivel' };
  }
}
