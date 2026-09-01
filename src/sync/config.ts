/**
 * Configuração da nuvem — Etapa 3.
 *
 * A nuvem é **opcional por construção**. O requisito não funcional principal do PRD é registrar
 * uma captura sem rede, e o app inteiro já funciona assim: conta local, álbum local, histórico
 * local. Sincronizar é o que acontece depois, quando existe servidor e sinal.
 *
 * Por isso nada aqui estoura quando falta configuração. Sem as variáveis, `nuvemConfigurada()`
 * devolve `false`, a fila de sincronização apenas acumula, e nenhuma tela muda de comportamento.
 * É o mesmo estado de quem está numa pescaria sem sinal — e esse estado precisa ser o caminho
 * normal, não a exceção.
 *
 * As variáveis usam o prefixo `EXPO_PUBLIC_` porque o Expo só embute no bundle as que o têm. A
 * chave anônima do Supabase é pública por desenho: quem protege os dados é o RLS do banco
 * (`supabase/migrations/0001_esquema.sql`), não o segredo da chave. A chave `service_role`, essa
 * sim secreta, **nunca** entra num app cliente.
 */

const URL_SUPABASE = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const CHAVE_ANONIMA = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

export interface ConfigNuvem {
  url: string;
  chaveAnonima: string;
}

/**
 * Há servidor configurado?
 *
 * Confere o formato, e não só a presença: uma variável preenchida com o texto de exemplo do
 * `.env.example` passaria num teste de "está vazia?" e falharia na primeira chamada de rede, com
 * um erro que não diz o que houve.
 */
export function nuvemConfigurada(): boolean {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(URL_SUPABASE) && CHAVE_ANONIMA.length > 20;
}

/** A configuração, ou `null` quando não há nuvem. Quem chama decide o que fazer sem ela. */
export function configNuvem(): ConfigNuvem | null {
  if (!nuvemConfigurada()) return null;
  return { url: URL_SUPABASE.replace(/\/$/, ''), chaveAnonima: CHAVE_ANONIMA };
}

/** Frase para a interface. Some quando a nuvem existe. */
export function motivoSemNuvem(): string | null {
  if (nuvemConfigurada()) return null;
  return 'Sincronização desligada: este aparelho não tem servidor configurado. Suas capturas continuam salvas aqui.';
}
