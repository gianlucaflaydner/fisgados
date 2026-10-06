/**
 * Pontos de pesca — agrupamento e conquistas por local.
 *
 * O local sempre foi texto livre (`place_label`), e isso é certo: pesqueiro novo aparece toda
 * temporada, e nenhuma lista fechada acompanharia. O que estava faltando era a memória — quem
 * pesca no mesmo açude há dez anos digitava o nome dele a cada captura, e digitava diferente:
 * "Pesqueiro Recanto", "pesqueiro recanto", "Recanto ". Três nomes, um lugar, e nenhum ranking
 * por local que se sustentasse.
 *
 * Então o nome continua livre e o **agrupamento** passa a ser por chave normalizada. Nada aqui
 * corrige o que a pessoa escreveu: o que aparece na tela é sempre a grafia que ela usou por
 * último, e a chave existe só para juntar o que é o mesmo lugar.
 *
 * Código puro, sem banco: é o tipo de regra que se descobre errada só com dado de verdade.
 */

/** Um local como o histórico conhece. `nome` é a última grafia usada; `chave` é o que agrupa. */
export interface Local {
  chave: string;
  nome: string;
  capturas: number;
  /** Espécies diferentes já pegas ali. "Não identificado" não conta. */
  especies: number;
  /** ISO 8601 da captura mais recente — é por ela que a lista se ordena no formulário. */
  ultimaEm: string;
}

/** O mínimo que foi registrado de uma captura para agrupar por local. */
export interface CapturaComLocal {
  placeLabel: string | null;
  speciesId: string | null;
  caughtAt: string;
}

/**
 * A chave de agrupamento: sem acento, sem caixa, sem espaço dobrado e sem pontuação de borda.
 *
 * Não tira "pesqueiro" nem "rio" do começo de propósito. "Rio Grande" e "Grande" podem ser dois
 * lugares diferentes, e juntar por conta própria seria o app decidindo onde a pessoa pescou.
 */
export function chaveDeLocal(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Junta as capturas por local, do mais recente para o mais antigo.
 *
 * Recente primeiro, e não mais frequente primeiro: a pescaria de hoje é quase sempre no mesmo
 * lugar da anterior, e é esse o toque que se quer poupar. A contagem aparece no rótulo, para
 * quem quiser escolher pelo histórico.
 */
export function agruparLocais(capturas: readonly CapturaComLocal[]): Local[] {
  const mapa = new Map<string, { nome: string; capturas: number; especies: Set<string>; ultimaEm: string }>();

  for (const c of capturas) {
    const nome = (c.placeLabel ?? '').trim();
    if (nome.length === 0) continue;
    const chave = chaveDeLocal(nome);
    if (chave.length === 0) continue;

    const atual = mapa.get(chave);
    if (!atual) {
      mapa.set(chave, {
        nome,
        capturas: 1,
        especies: new Set(c.speciesId ? [c.speciesId] : []),
        ultimaEm: c.caughtAt,
      });
      continue;
    }

    atual.capturas++;
    if (c.speciesId) atual.especies.add(c.speciesId);
    // A grafia que vale é a da captura mais recente: foi a última decisão da pessoa.
    if (c.caughtAt > atual.ultimaEm) {
      atual.ultimaEm = c.caughtAt;
      atual.nome = nome;
    }
  }

  return [...mapa.entries()]
    .map(([chave, v]) => ({ chave, nome: v.nome, capturas: v.capturas, especies: v.especies.size, ultimaEm: v.ultimaEm }))
    .sort((a, b) => (a.ultimaEm < b.ultimaEm ? 1 : a.ultimaEm > b.ultimaEm ? -1 : a.nome.localeCompare(b.nome, 'pt-BR')));
}

/**
 * Filtra a lista pelo que já foi digitado no campo.
 *
 * Três níveis, nesta ordem: o nome começa com o que foi digitado, uma palavra do meio começa com
 * ele, ou ele aparece em qualquer lugar. Quem digita "re" quer a Represa antes do Pesqueiro
 * Recanto; quem digita "rec" só tem o Recanto. Dentro de cada nível vale a ordem da lista, que é
 * a da última pescaria.
 */
export function sugerirLocais(locais: readonly Local[], texto: string, limite = 6): Local[] {
  const q = chaveDeLocal(texto);
  if (q.length === 0) return locais.slice(0, limite);

  const nome: Local[] = [];
  const palavra: Local[] = [];
  const meio: Local[] = [];
  for (const l of locais) {
    const k = l.chave;
    // Já escrito por inteiro: não é sugestão, é o que está no campo.
    if (k === q) continue;
    if (k.startsWith(q)) nome.push(l);
    else if (k.includes(` ${q}`)) palavra.push(l);
    else if (k.includes(q)) meio.push(l);
  }
  return [...nome, ...palavra, ...meio].slice(0, limite);
}
