import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getPref, setPref, removePref } from '../db/queries';
import { configNuvem } from './config';

/**
 * O cliente Supabase — Etapa 3.
 *
 * É `null` quando não há configuração, e isso é o normal e não o erro: o PRD exige registrar uma
 * captura sem rede, e o app inteiro funciona assim. Quem chama trata a ausência como "ainda não
 * dá para sincronizar", nunca como falha.
 */

/**
 * A sessão é guardada no SQLite que o app já tem, na tabela `app_prefs`.
 *
 * Nenhuma dependência nova: sem isto seria preciso trazer o AsyncStorage só para guardar duas
 * strings, e a sessão passaria a viver num lugar diferente do resto dos dados locais.
 *
 * Ressalva honesta: `app_prefs` é uma tabela comum, não o Keychain do iOS nem o Keystore do
 * Android. Num aparelho desbloqueado e com acesso ao sistema de arquivos, o token é legível —
 * mas quem chega lá também lê as fotos e o histórico inteiro, que estão no mesmo banco. Quando
 * houver dado de outras pessoas em jogo (Etapa 3 completa, com amigos), vale trocar por
 * `expo-secure-store`, que é onde essa conversa muda.
 */
const armazenamento = {
  async getItem(chave: string): Promise<string | null> {
    return (await getPref(chave)) ?? null;
  },
  async setItem(chave: string, valor: string): Promise<void> {
    await setPref(chave, valor);
  },
  async removeItem(chave: string): Promise<void> {
    await removePref(chave);
  },
};

let cliente: SupabaseClient | null | undefined;

/**
 * O cliente, criado uma vez. `null` quando falta configuração.
 *
 * `detectSessionInUrl` fica desligado porque isso é app nativo e não navegador — ligado, o
 * supabase-js procuraria token na URL e não acharia nada.
 */
export function supabase(): SupabaseClient | null {
  if (cliente !== undefined) return cliente;

  const config = configNuvem();
  if (!config) {
    cliente = null;
    return null;
  }

  cliente = createClient(config.url, config.chaveAnonima, {
    auth: {
      storage: armazenamento,
      // A sessão precisa sobreviver a fechar o app: ninguém digita senha na beira do açude.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return cliente;
}

/** Só para teste: força o próximo `supabase()` a reconstruir com a configuração atual. */
export function esquecerCliente(): void {
  cliente = undefined;
}
