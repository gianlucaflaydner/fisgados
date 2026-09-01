/**
 * Contas e sessão — F14.
 *
 * Tudo aqui é local. Não existe servidor até a Etapa 3, então "logar" quer dizer: achar a linha
 * de `users` que casa com o e-mail, conferir o hash da senha e gravar quem está ativo. As regras
 * sobre o que é um cadastro aceitável ficam em `domain/conta`, onde dá para testá-las sem
 * emulador; aqui fica o que precisa do banco e do módulo nativo de criptografia.
 *
 * Sobre o hash: é SHA-256 com sal por usuário, e isso **não** é armazenamento de senha de nível
 * servidor — falta o custo de derivação (Argon2/bcrypt) que torna um vazamento caro de quebrar.
 * A escolha é consciente e limitada a esta etapa: o banco não sai do aparelho, quem tem o arquivo
 * do SQLite já tem as fotos e o histórico junto, e na Etapa 3 a autenticação passa a ser do
 * Supabase Auth (SDD seção 2) — este módulo vira a ponte para o `auth.uid()`, não o guardião.
 * O que o sal garante desde já é que a senha não é comparada em texto puro nem repetida entre
 * duas contas do mesmo aparelho.
 */

import * as Crypto from 'expo-crypto';
import { eq } from 'drizzle-orm';

import { db } from '../db';
import { session, users, type UserRow } from '../db/schema';
import { uuidv7 } from '../db/queries';
import { normalizarEmail, validarCadastro } from '../domain/conta';

export type AuthResult = { ok: true; user: UserRow } | { ok: false; erro: string };

export { SENHA_MIN, normalizarEmail } from '../domain/conta';

function hex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashSenha(senha: string, sal: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${sal}:${senha}`);
}

/**
 * Cria a conta e já deixa a pessoa dentro do app.
 *
 * Cadastrar e depois pedir para logar de novo é atrito sem contrapartida: quem acabou de digitar
 * a senha provou que a sabe.
 */
export async function registrar(entrada: {
  nome: string;
  email: string;
  senha: string;
}): Promise<AuthResult> {
  const problema = validarCadastro(entrada);
  if (problema) return { ok: false, erro: problema };

  const nome = entrada.nome.trim();
  const email = normalizarEmail(entrada.email);

  const existente = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existente.length > 0) {
    return { ok: false, erro: 'Já existe uma conta com esse e-mail neste aparelho.' };
  }

  const sal = hex(Crypto.getRandomBytes(16));
  const user: UserRow = {
    id: uuidv7(),
    name: nome,
    email,
    passwordHash: await hashSenha(entrada.senha, sal),
    passwordSalt: sal,
    createdAt: new Date().toISOString(),
  };

  await db.insert(users).values(user);
  await abrirSessao(user.id);
  return { ok: true, user };
}

export async function entrar(entrada: { email: string; senha: string }): Promise<AuthResult> {
  const email = normalizarEmail(entrada.email);
  const achados = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = achados[0];

  // Mesma mensagem para e-mail inexistente e senha errada: não vale entregar quem tem conta aqui.
  const generico = { ok: false, erro: 'E-mail ou senha incorretos.' } as const;
  if (!user) return generico;

  const hash = await hashSenha(entrada.senha, user.passwordSalt);
  if (hash !== user.passwordHash) return generico;

  await abrirSessao(user.id);
  return { ok: true, user };
}

/** Linha única (`id = 1`): trocar de conta substitui a sessão, nunca acumula duas. */
async function abrirSessao(userId: string): Promise<void> {
  const agora = new Date().toISOString();
  await db
    .insert(session)
    .values({ id: 1, userId, startedAt: agora })
    .onConflictDoUpdate({ target: session.id, set: { userId, startedAt: agora } });
}

export async function sair(): Promise<void> {
  await db.delete(session).where(eq(session.id, 1));
}

/**
 * Quem estava logado quando o app fechou.
 *
 * Se a sessão apontar para um usuário que não existe mais, ela é limpa em vez de propagada — um
 * `userId` órfão filtraria o histórico para o vazio sem explicar nada a ninguém.
 */
export async function usuarioDaSessao(): Promise<UserRow | null> {
  const linhas = await db.select().from(session).where(eq(session.id, 1)).limit(1);
  const ativa = linhas[0];
  if (!ativa) return null;

  const achados = await db.select().from(users).where(eq(users.id, ativa.userId)).limit(1);
  const user = achados[0];
  if (!user) {
    await sair();
    return null;
  }
  return user;
}
