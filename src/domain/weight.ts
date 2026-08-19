/**
 * Estimativa de peso — RN05.
 *
 * Código puro: sem React, sem I/O, sem catálogo global. Recebe a espécie e devolve número.
 */

import type { Species } from '../catalog/types';

/**
 * P(gramas) = a × C(cm)^b, com C no eixo declarado pela espécie (comprimento ou largura).
 *
 * Devolve `null` quando a espécie não tem coeficiente confiável. Nesse caso o app não inventa
 * um número: pede o peso real ou fica sem peso (PRD 9.1).
 */
export function estimateWeightG(measureCm: number, species: Species): number | null {
  const lw = species.lengthWeight;
  if (!lw) return null;
  if (!Number.isFinite(measureCm) || measureCm <= 0) return null;
  return lw.a * Math.pow(measureCm, lw.b);
}

/**
 * Formata peso para exibição, sempre com a unidade que faz sentido na grandeza.
 * Português usa vírgula decimal; `toFixed` produz ponto, então trocamos.
 */
export function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(2).replace('.', ',')} kg`;
  return `${Math.round(grams)} g`;
}

/**
 * O texto do peso na tela. A RN05 exige que estimativa apareça marcada como estimativa —
 * o usuário precisa saber que é cálculo, não balança.
 */
export function weightLabel(realG: number | null, estimatedG: number | null): string | null {
  if (realG !== null) return formatWeight(realG);
  if (estimatedG !== null) return `≈ ${formatWeight(estimatedG)} (estimado)`;
  return null;
}

/** Rótulo do campo de medida, que muda conforme o eixo da espécie (RN04). */
export function measureLabel(species: Species): string {
  return species.measure === 'largura' ? 'Largura do disco' : 'Comprimento';
}

/** Limites absolutos da RN04. Fora disso o app pede confirmação antes de salvar. */
export const MEASURE_MIN_CM = 5;
export const MEASURE_MAX_CM = 250;

export type MeasureCheck =
  | { ok: true }
  | { ok: false; kind: 'fora-do-limite' | 'fora-da-especie'; message: string };

/**
 * Valida a medida informada.
 *
 * Dois níveis, de propósito. Fora de 5–250 cm é quase sempre erro de digitação. Dentro disso mas
 * fora da faixa da espécie pode ser o peixe da vida do sujeito — então avisa, e deixa salvar.
 */
export function checkMeasure(measureCm: number, species: Species | null): MeasureCheck {
  if (!Number.isFinite(measureCm) || measureCm <= 0) {
    return { ok: false, kind: 'fora-do-limite', message: 'Informe a medida em centímetros.' };
  }
  if (measureCm < MEASURE_MIN_CM || measureCm > MEASURE_MAX_CM) {
    return {
      ok: false,
      kind: 'fora-do-limite',
      message: `A medida precisa ficar entre ${MEASURE_MIN_CM} e ${MEASURE_MAX_CM} cm.`,
    };
  }
  if (species && (measureCm < species.minLengthCm || measureCm > species.maxLengthCm)) {
    const eixo = species.measure === 'largura' ? 'largura' : 'comprimento';
    return {
      ok: false,
      kind: 'fora-da-especie',
      message:
        `${measureCm} cm está fora da faixa esperada para ${species.commonName} ` +
        `(${species.minLengthCm}–${species.maxLengthCm} cm de ${eixo}). Confirma?`,
    };
  }
  return { ok: true };
}

/**
 * Troféu — RN19: exemplar com pelo menos 80% do tamanho máximo da espécie.
 * Espécie sem faixa validada não gera troféu; insígnia barata é pior que insígnia nenhuma.
 */
export const TROPHY_RATIO = 0.8;

export function isTrophy(measureCm: number, species: Species): boolean {
  if (!species.maxLengthCm) return false;
  return measureCm >= species.maxLengthCm * TROPHY_RATIO;
}
