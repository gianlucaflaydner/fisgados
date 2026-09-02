/**
 * Contas e sessão — F14, agora no Supabase Auth.
 *
 * A conta deixou de ser local. Antes ela vivia no SQLite porque não havia servidor; agora que há,
 * manter dois sistemas de identidade convivendo seria duas verdades sobre quem é o usuário — e a
 * hora de escolher uma é antes de existir gente usando, não depois.
 *
 * **Uma conta por aparelho** (PRD F14, SDD "não há merge"). O aparelho lembra de quem ele é; se
 * outra conta entrar, os dados locais da anterior são apagados na troca, com confirmação. Sem
 * isso, dois históricos dividiriam o mesmo banco e a sincronização não teria como desempatar.
 *
 * **Offline depois do primeiro login.** Entrar exige rede uma vez, porque a conta mora no
 * servidor. Dali em diante a sessão fica no aparelho e o app abre sem sinal — que é o requisito
 * não funcional principal do PRD, e o estado normal de uma pescaria.
 */

import { gerarCodigoConvite } from '../domain/convite';
import { normalizarEmail, validarCadastro } from '../domain/conta';
import { getPref, setPref, limparDadosLocais } from '../db/queries';
import { supabase } from '../sync/cliente';
import { motivoSemNuvem } from '../sync/config';

export { SENHA_MIN, normalizarEmail } from '../domain/conta';

/** Quem está usando o app. O `id` é o uuid do Supabase Auth, e é o dono de toda captura. */
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  codigoConvite: string | null;
}

export type AuthResult = { ok: true; user: Usuario } | { ok: false; erro: string };

/** Qual conta este aparelho atende. Chave de `app_prefs`. */
const CONTA_DO_APARELHO = 'conta';

function semNuvem(): AuthResult {
  return {
    ok: false,
    erro:
      motivoSemNuvem() ??
      'Sem conexão com o servidor. Entrar exige rede na primeira vez; depois o app abre offline.',
  };
}

/**
 * Traduz o erro do Supabase para algo que se lê na beira do açude.
 *
 * As mensagens vêm em inglês e falam de "credentials" e "rate limit". Quem está com o peixe na
 * mão precisa saber o que fazer, não o que aconteceu no servidor.
 */
function traduzir(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'Já existe uma conta com esse e-mail. Tente entrar.';
  }
  if (m.includes('email not confirmed')) {
    return 'Confirme o e-mail que o Supabase enviou antes de entrar.';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'Sem conexão. Entrar exige rede na primeira vez; depois o app abre offline.';
  }
  return mensagem;
}

/**
 * Garante que existe um perfil para o usuário autenticado.
 *
 * O perfil não sai do Auth: `auth.users` guarda credencial, e `profiles` guarda o que o app
 * mostra — nome e código de convite. Criar na hora do cadastro e conferir a cada entrada cobre
 * o caso de o cadastro ter sido interrompido entre uma coisa e outra.
 */
async function garantirPerfil(id: string, nomeSugerido: string): Promise<Usuario | null> {
  const sb = supabase();
  if (!sb) return null;

  const { data: existente } = await sb
    .from('profiles')
    .select('id, display_name, invite_code')
    .eq('id', id)
    .maybeSingle();

  if (existente) {
    return {
      id,
      nome: existente.display_name,
      email: '',
      codigoConvite: existente.invite_code,
    };
  }

  const perfil = {
    id,
    display_name: nomeSugerido,
    invite_code: gerarCodigoConvite(),
  };
  const { error } = await sb.from('profiles').insert(perfil);
  if (error) return null;

  return { id, nome: perfil.display_name, email: '', codigoConvite: perfil.invite_code };
}

/**
 * Cria a conta e já deixa a pessoa dentro do app.
 *
 * Se o projeto exigir confirmação de e-mail, o Supabase devolve usuário sem sessão. Nesse caso o
 * app não finge que entrou: avisa que falta confirmar, porque um app que diz "bem-vindo" e não
 * abre é pior do que um que explica.
 */
export async function registrar(entrada: {
  nome: string;
  email: string;
  senha: string;
}): Promise<AuthResult> {
  const problema = validarCadastro(entrada);
  if (problema) return { ok: false, erro: problema };

  const sb = supabase();
  if (!sb) return semNuvem();

  const nome = entrada.nome.trim();
  const email = normalizarEmail(entrada.email);

  const { data, error } = await sb.auth.signUp({
    email,
    password: entrada.senha,
    options: { data: { display_name: nome } },
  });
  if (error) return { ok: false, erro: traduzir(error.message) };
  if (!data.user) return { ok: false, erro: 'O servidor não criou a conta. Tente de novo.' };

  if (!data.session) {
    return {
      ok: false,
      erro: 'Conta criada. Confirme o e-mail que você recebeu e depois entre.',
    };
  }

  const perfil = await garantirPerfil(data.user.id, nome);
  if (!perfil) return { ok: false, erro: 'Conta criada, mas o perfil falhou. Tente entrar.' };

  await adotarAparelho(perfil.id);
  return { ok: true, user: { ...perfil, email } };
}

export async function entrar(entrada: { email: string; senha: string }): Promise<AuthResult> {
  const sb = supabase();
  if (!sb) return semNuvem();

  const email = normalizarEmail(entrada.email);
  const { data, error } = await sb.auth.signInWithPassword({ email, password: entrada.senha });
  if (error) return { ok: false, erro: traduzir(error.message) };
  if (!data.user) return { ok: false, erro: 'E-mail ou senha incorretos.' };

  const nome = String(data.user.user_metadata?.display_name ?? email.split('@')[0]);
  const perfil = await garantirPerfil(data.user.id, nome);
  if (!perfil) return { ok: false, erro: 'Entrou, mas o perfil não carregou. Tente de novo.' };

  await adotarAparelho(perfil.id);
  return { ok: true, user: { ...perfil, email } };
}

/**
 * Vincula o aparelho a uma conta, apagando o que era da anterior.
 *
 * Uma conta por aparelho é regra do MVP, não limitação técnica. Sem apagar, dois históricos
 * dividiriam o mesmo SQLite: as queries filtram por dono e esconderiam um do outro, mas o banco
 * cresceria com dado que ninguém mais vê e a sincronização não teria como desempatar de quem é.
 */
async function adotarAparelho(userId: string): Promise<void> {
  const anterior = await getPref(CONTA_DO_APARELHO);
  if (anterior && anterior !== userId) await limparDadosLocais();
  await setPref(CONTA_DO_APARELHO, userId);
}

/** Que conta este aparelho atende, se já atendeu alguma. */
export async function contaDoAparelho(): Promise<string | null> {
  return (await getPref(CONTA_DO_APARELHO)) ?? null;
}

export async function sair(): Promise<void> {
  const sb = supabase();
  // `local` porque sem rede o servidor não responde, e sair precisa funcionar mesmo assim.
  await sb?.auth.signOut({ scope: 'local' });
}

/**
 * Quem estava logado quando o app fechou.
 *
 * Lê a sessão do armazenamento local, sem rede: é o que faz o app abrir numa pescaria sem sinal.
 * O supabase-js renova o token sozinho quando houver conexão.
 */
export async function usuarioDaSessao(): Promise<Usuario | null> {
  const sb = supabase();
  if (!sb) return null;

  const { data } = await sb.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;

  const nome = String(user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'pescador');

  // Sem rede o perfil não carrega, e isso não pode impedir o app de abrir: o que importa para o
  // histórico local é o id, que já veio da sessão.
  const perfil = await garantirPerfil(user.id, nome).catch(() => null);

  return {
    id: user.id,
    nome: perfil?.nome ?? nome,
    email: user.email ?? '',
    codigoConvite: perfil?.codigoConvite ?? null,
  };
}
