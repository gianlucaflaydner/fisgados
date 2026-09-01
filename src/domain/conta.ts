/**
 * Regras de conta — F14.
 *
 * Puro de propósito, como o resto de `domain/`: validação de cadastro é exatamente o tipo de
 * coisa que se quer verificar sem emulador. O módulo `auth/` cuida do hash e do banco; aqui
 * ficam só as regras sobre o que é um cadastro aceitável.
 */

/** Mínimo do MVP. Curto de propósito: a barreira aqui é lembrar, não resistir a ataque. */
export const SENHA_MIN = 6;
export const NOME_MIN = 2;

/** O e-mail é chave: "  Joao@Mail.com " e "joao@mail.com" são a mesma conta. */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Validação frouxa por escolha: e-mail aqui é identificador, não canal de contato verificado. */
export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/**
 * Primeiro problema encontrado, ou `null` se está tudo certo.
 *
 * Uma mensagem por vez, na ordem em que os campos aparecem na tela: listar três erros de uma vez
 * faz a pessoa reler o formulário inteiro para achar onde falhou.
 */
export function validarCadastro(entrada: {
  nome: string;
  email: string;
  senha: string;
}): string | null {
  if (entrada.nome.trim().length < NOME_MIN) return 'Diga como quer ser chamado.';
  if (!emailValido(normalizarEmail(entrada.email))) return 'Esse e-mail não parece válido.';
  if (entrada.senha.length < SENHA_MIN) {
    return `A senha precisa de pelo menos ${SENHA_MIN} caracteres.`;
  }
  return null;
}
