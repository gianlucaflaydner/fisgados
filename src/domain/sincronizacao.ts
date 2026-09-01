/**
 * Regras da sincronização — SDD seção 4.
 *
 * Código puro: a política de repetição e a de conflito não dependem de rede nem de banco, e são
 * exatamente o tipo de coisa que só se descobre errada em produção, com o aparelho de outra
 * pessoa e sem log. Aqui elas são testáveis sem emulador e sem servidor.
 *
 * O worker que consome isto ainda não existe — depende de um projeto Supabase que este repositório
 * não tem. As regras existem antes porque são a parte que não muda quando o backend chegar.
 */

/** SDD 4: 2s, 8s, 30s, 2min, 10min. Depois disso o item para e vira aviso discreto. */
export const ATRASOS_MS = [2_000, 8_000, 30_000, 120_000, 600_000] as const;

export const TENTATIVAS_MAX = ATRASOS_MS.length;

/**
 * Quanto esperar antes da próxima tentativa.
 *
 * O jitter não é enfeite: sem ele, um app que perdeu a rede no meio de uma pescaria volta com
 * dez itens na fila e dispara os dez no mesmo milissegundo quando o sinal volta. Espalhar em até
 * ±20% resolve isso com uma linha.
 *
 * `aleatorio` é injetável para o teste poder fixar o resultado — sortear dentro da função a
 * tornaria impossível de verificar.
 */
export function atrasoDaTentativa(tentativas: number, aleatorio: () => number = Math.random): number {
  const indice = Math.min(Math.max(tentativas, 0), ATRASOS_MS.length - 1);
  const base = ATRASOS_MS[indice]!;
  const jitter = 1 + (aleatorio() * 2 - 1) * 0.2;
  return Math.round(base * jitter);
}

/** Passou do limite de tentativas? Aí o item deixa de ser retentado e vira erro visível. */
export function desistiu(tentativas: number): boolean {
  return tentativas >= TENTATIVAS_MAX;
}

export interface Versionado {
  /** ISO 8601. */
  updatedAt: string;
}

/**
 * Conflito — SDD 4: last-write-wins por `updated_at`.
 *
 * Basta porque cada captura tem um dono só e o MVP roda um dispositivo por conta. Empate resolve
 * a favor do **remoto**: se os dois lados marcam o mesmo instante, o servidor é quem já foi visto
 * por outros aparelhos, e reescrevê-lo produziria uma diferença que ninguém consegue explicar.
 */
export function venceLocal(local: Versionado, remoto: Versionado): boolean {
  return Date.parse(local.updatedAt) > Date.parse(remoto.updatedAt);
}

export type EntidadeSync = 'catch' | 'unlock';
export type OperacaoSync = 'create' | 'update' | 'delete';

/**
 * Duas operações sobre a mesma linha podem virar uma só.
 *
 * Registrar e corrigir antes de haver rede não precisa de duas idas ao servidor — o `upsert`
 * manda o estado final de qualquer jeito. E `create` seguido de `delete` de algo que o servidor
 * nunca viu se resolve apagando os dois: mandar a criação para em seguida mandar a exclusão é
 * gastar bateria e dados para chegar ao mesmo lugar.
 */
export function fundir(
  anterior: OperacaoSync,
  nova: OperacaoSync,
): { operacao: OperacaoSync } | { descartarAmbas: true } {
  if (anterior === 'create' && nova === 'delete') return { descartarAmbas: true };
  if (anterior === 'create') return { operacao: 'create' };
  if (nova === 'delete') return { operacao: 'delete' };
  return { operacao: nova };
}
