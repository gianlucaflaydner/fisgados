/**
 * Leitura da data que a câmera grava na foto.
 *
 * Vive em `domain/` porque é análise de texto pura — e porque tem mais caso de borda do que
 * parece: aparelho com relógio errado, campo ausente, formato quebrado.
 */

/**
 * Data de captura no formato EXIF `YYYY:MM:DD HH:MM:SS`, ou `null` quando não dá para confiar.
 *
 * A marca não tem fuso: é a hora que o relógio do aparelho mostrava. A `Date` é montada no fuso
 * local justamente por isso — três insígnias dependem da hora do dia (PRD 11.6), e "6h da manhã"
 * na foto precisa continuar sendo 6h da manhã no histórico.
 */
export function dataDoExif(
  exif: Record<string, unknown> | null | undefined,
  agora: Date = new Date(),
): Date | null {
  const bruto = exif?.['DateTimeOriginal'] ?? exif?.['DateTime'];
  if (typeof bruto !== 'string') return null;

  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(bruto.trim());
  if (!m) return null;

  const [, ano, mes, dia, hora, min, seg] = m;
  const data = new Date(
    Number(ano),
    Number(mes) - 1,
    Number(dia),
    Number(hora),
    Number(min),
    Number(seg),
  );
  if (Number.isNaN(data.getTime())) return null;

  // O `Date` do JS acomoda mês 13 e dia 32 rolando para o mês seguinte, calado. Uma foto com
  // EXIF corrompido viraria uma data plausível e errada; conferir de volta é o que impede isso.
  if (data.getMonth() !== Number(mes) - 1 || data.getDate() !== Number(dia)) return null;

  // Câmera com relógio adiantado produziria captura no futuro. Melhor ignorar a marca e deixar a
  // tela de detalhes usar a hora de agora do que gravar uma data impossível.
  return data.getTime() > agora.getTime() ? null : data;
}
