import { useState, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Icone, type NomeDoIcone } from './Icone';
import type { Rarity } from '@/catalog';
import { coresDeRaridade, useCores } from '@/theme';

/**
 * As peças do style guide, num arquivo só.
 *
 * Ficam juntas porque são pequenas e porque é a lista inteira do guia: botão, campo, pílula,
 * etiqueta, selo, gema, abas e rótulo. Espalhadas em oito arquivos de vinte linhas, a primeira
 * tela nova inventaria a nona variante — e o desenho se desfaz pela borda, não pelo centro.
 */

/* ──────────────────────────────────────────────────────────────────────── botões */

/**
 * A ação da tela — uma por tela, nunca duas.
 *
 * O "degrau" de 6 px embaixo é sombra sólida, não desfoque: no toque o botão desce 4 px e o degrau
 * encurta, o que dá a sensação de afundar sem animação nenhuma. Sombra desfocada não aparece em
 * fundo escuro, e este botão é apertado de pé, com a mão molhada, olhando para o peixe.
 */
export function BotaoPrincipal({
  titulo,
  onPress,
  icone,
  desabilitado,
  carregando,
}: {
  titulo: string;
  onPress: () => void;
  icone?: NomeDoIcone;
  desabilitado?: boolean;
  carregando?: boolean;
}) {
  const cores = useCores();
  const [pressionado, setPressionado] = useState(false);
  const inerte = desabilitado || carregando;

  return (
    <Pressable
      onPress={onPress}
      disabled={inerte}
      onPressIn={() => setPressionado(true)}
      onPressOut={() => setPressionado(false)}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(inerte), busy: Boolean(carregando) }}
      style={{
        height: 56,
        borderRadius: 16,
        backgroundColor: cores.destaque,
        opacity: inerte ? 0.55 : 1,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 10,
        // O degrau: borda inferior grossa na isca afundada. Some quando o botão é pressionado,
        // e a tradução para baixo compensa, para nada pular na tela.
        borderBottomWidth: pressionado ? 2 : 6,
        borderBottomColor: cores.destaqueBaixo,
        transform: [{ translateY: pressionado ? 4 : 0 }],
      }}
    >
      {icone ? <Icone nome={icone} tamanho={22} cor={cores.destaqueTexto} traco={2.2} /> : null}
      <Text style={{ color: cores.destaqueTexto }} className="font-corpo-negrito text-[17px]">
        {carregando ? 'Um instante...' : titulo}
      </Text>
    </Pressable>
  );
}

/** Ação de apoio: altura 48, fundo de chip, borda viva. */
export function BotaoSecundario({
  titulo,
  onPress,
  icone,
  desabilitado,
  largura,
}: {
  titulo: string;
  onPress: () => void;
  icone?: NomeDoIcone;
  desabilitado?: boolean;
  /** `cheia` ocupa a linha; o padrão se ajusta ao texto. */
  largura?: 'cheia';
}) {
  const cores = useCores();
  return (
    <Pressable
      onPress={onPress}
      disabled={desabilitado}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(desabilitado) }}
      className={`h-12 flex-row items-center justify-center gap-2 rounded-campo border border-borda-forte bg-elevado px-5 active:opacity-70 ${largura === 'cheia' ? 'self-stretch' : 'self-start'}`}
      style={{ opacity: desabilitado ? 0.5 : 1 }}
    >
      {icone ? <Icone nome={icone} tamanho={18} cor={cores.texto} traco={2.2} /> : null}
      <Text className="font-corpo-forte text-[15px] text-texto">{titulo}</Text>
    </Pressable>
  );
}

/** Link de texto. É a isca escrita — o único lugar em que o laranja não é um botão cheio. */
export function BotaoTexto({ titulo, onPress }: { titulo: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" className="self-start py-1 active:opacity-60">
      <Text className="font-corpo-forte text-[15px] text-acao">{titulo}</Text>
    </Pressable>
  );
}

/** Botão quadrado de 44 px, só ícone. Voltar, buscar, trocar tema. */
export function BotaoIcone({
  nome,
  onPress,
  rotulo,
  sobreFoto,
}: {
  nome: NomeDoIcone;
  onPress: () => void;
  rotulo: string;
  /** Sobre a foto da captura, onde o fundo é imagem e não painel. */
  sobreFoto?: boolean;
}) {
  const cores = useCores();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      className="h-11 w-11 items-center justify-center rounded-campo border active:opacity-70"
      style={
        sobreFoto
          ? { backgroundColor: 'rgba(7,20,23,0.7)', borderColor: 'rgba(238,242,234,0.18)' }
          : { backgroundColor: cores.elevado, borderColor: cores.bordaForte }
      }
    >
      <Icone nome={nome} tamanho={22} cor={sobreFoto ? '#EEF2EA' : cores.texto} traco={2.2} />
    </Pressable>
  );
}

/* ──────────────────────────────────────────────────────────────────── formulário */

/** O rótulo de campo do guia: 12 px, caixa alta, bem espaçado. */
export function Rotulo({ children, opcional }: { children: string; opcional?: boolean }) {
  return (
    <Text className="font-corpo-forte text-[12px] uppercase tracking-[0.12em] text-suave">
      {children}
      {opcional ? <Text className="font-corpo-medio text-[12px] normal-case tracking-normal text-apoio">  opcional</Text> : null}
    </Text>
  );
}

/**
 * Campo de texto de 54 px.
 *
 * O foco é a isca: borda de 2 px e um halo de 4 px. Num app usado no sol, saber qual campo está
 * ativo não pode depender de um fio de 1 px mudando de tom.
 */
export function Campo({
  rotulo,
  opcional,
  dica,
  sufixo,
  icone,
  ...props
}: TextInputProps & {
  rotulo?: string;
  opcional?: boolean;
  /** Linha de apoio embaixo do campo. */
  dica?: string;
  /** Unidade fixa à direita: "cm", "kg". */
  sufixo?: string;
  icone?: NomeDoIcone;
}) {
  const cores = useCores();
  const [focado, setFocado] = useState(false);

  return (
    <View className="gap-2">
      {rotulo ? <Rotulo opcional={opcional}>{rotulo}</Rotulo> : null}
      <View
        className="h-[54px] flex-row items-center gap-2.5 rounded-campo px-3.5"
        style={{
          backgroundColor: cores.campo,
          borderWidth: focado ? 2 : 1.5,
          borderColor: focado ? cores.destaque : cores.borda,
        }}
      >
        {icone ? <Icone nome={icone} tamanho={18} cor={focado ? cores.destaque : cores.apoio} /> : null}
        <TextInput
          {...props}
          onFocus={(e) => {
            setFocado(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocado(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={cores.apoio}
          className="flex-1 font-corpo text-[16px] text-texto"
        />
        {sufixo ? <Text className="font-corpo-forte text-[14px] text-suave">{sufixo}</Text> : null}
      </View>
      {dica ? <Text className="font-corpo text-[12.5px] leading-[18px] text-apoio">{dica}</Text> : null}
    </View>
  );
}

/**
 * O campo de medida — o maior número da tela.
 *
 * Tem botões de −1 e +1 do lado porque a medida chega por fita métrica torta, com o peixe se
 * mexendo: corrigir um centímetro com o polegar é mais rápido e mais seguro que abrir o teclado
 * numérico e reescrever. Altura 64 e dígito de 34 px, que se lê de pé, com a tela inclinada.
 */
export function CampoDeMedida({
  valor,
  onChange,
  unidade = 'cm',
  rotulo,
  dica,
}: {
  valor: string;
  onChange: (v: string) => void;
  unidade?: string;
  rotulo: string;
  dica?: ReactNode;
}) {
  const cores = useCores();
  const [focado, setFocado] = useState(false);

  function passo(delta: number) {
    const atual = Number(valor.replace(',', '.'));
    const base = Number.isFinite(atual) && atual > 0 ? atual : 0;
    const novo = Math.max(0, Math.round((base + delta) * 10) / 10);
    onChange(novo === 0 ? '' : String(novo));
  }

  return (
    <View className="gap-2">
      <Rotulo>{rotulo}</Rotulo>
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => passo(-1)}
          accessibilityRole="button"
          accessibilityLabel={`Diminuir 1 ${unidade}`}
          className="h-16 w-14 items-center justify-center rounded-botao border border-borda-forte bg-elevado active:opacity-70"
        >
          <Icone nome="menos" tamanho={22} cor={cores.texto} traco={2.6} />
        </Pressable>

        <View
          className="h-16 flex-1 flex-row items-center justify-center gap-1.5 rounded-botao"
          style={{
            backgroundColor: cores.campo,
            borderWidth: focado ? 2 : 1.5,
            borderColor: focado ? cores.destaque : cores.borda,
          }}
        >
          <TextInput
            value={valor}
            onChangeText={onChange}
            onFocus={() => setFocado(true)}
            onBlur={() => setFocado(false)}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={cores.apoio}
            className="min-w-[64px] text-right font-display text-[34px] text-texto"
            style={{ fontVariant: ['tabular-nums'] }}
          />
          <Text className="font-corpo-forte text-[16px] text-suave">{unidade}</Text>
        </View>

        <Pressable
          onPress={() => passo(1)}
          accessibilityRole="button"
          accessibilityLabel={`Aumentar 1 ${unidade}`}
          className="h-16 w-14 items-center justify-center rounded-botao border border-borda-forte bg-elevado active:opacity-70"
        >
          <Icone nome="mais" tamanho={22} cor={cores.texto} traco={2.6} />
        </Pressable>
      </View>
      {dica}
    </View>
  );
}

/** Dois ou mais botões num trilho — abas do ranking, destino da captura. */
export function Segmentado<T extends string>({
  opcoes,
  valor,
  onChange,
}: {
  opcoes: { id: T; rotulo: string }[];
  valor: T;
  onChange: (id: T) => void;
}) {
  const cores = useCores();
  return (
    <View
      className="flex-row gap-1 rounded-campo p-1"
      style={{ backgroundColor: cores.campo, borderWidth: 1.5, borderColor: cores.borda }}
    >
      {opcoes.map((o) => {
        const ativa = o.id === valor;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativa }}
            className="h-10 flex-1 items-center justify-center rounded-[10px] active:opacity-70"
            style={{ backgroundColor: ativa ? cores.texto : 'transparent' }}
          >
            <Text
              className={ativa ? 'font-corpo-negrito text-[13.5px]' : 'font-corpo-forte text-[13.5px]'}
              style={{ color: ativa ? cores.fundo : cores.suave }}
              numberOfLines={1}
            >
              {o.rotulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───────────────────────────────────────────────────────── selos, etiquetas, gema */

/**
 * Selo — o carimbo inclinado da figurinha colada.
 *
 * Os −3° não são enfeite: é o que faz "TROFÉU" parecer colado na foto em vez de desenhado por
 * cima dela. Dois tons só: isca para troféu, ouro para recorde.
 */
export function Selo({ texto, tom = 'isca' }: { texto: string; tom?: 'isca' | 'ouro' }) {
  const cores = useCores();
  const fundo = tom === 'isca' ? cores.destaque : cores.lendario;
  return (
    <View
      className="rounded-selo px-2.5 py-1"
      style={{ backgroundColor: fundo, transform: [{ rotate: '-3deg' }] }}
    >
      <Text className="font-display text-[11px] tracking-[0.08em]" style={{ color: '#2A1C00' }}>
        {texto}
      </Text>
    </View>
  );
}

/** Contador de vezes: pílula clara, número em display. Fica no canto da foto. */
export function Contador({ texto }: { texto: string }) {
  const cores = useCores();
  return (
    <View className="rounded-full px-2 py-1" style={{ backgroundColor: cores.texto }}>
      <Text className="font-display text-[12px]" style={{ color: cores.fundo }}>
        {texto}
      </Text>
    </View>
  );
}

/** Etiqueta de metadado — sempre com ícone, nunca só texto. Local, data, "solto". */
export function Etiqueta({
  texto,
  icone,
  tom = 'neutro',
}: {
  texto: string;
  icone?: NomeDoIcone;
  tom?: 'neutro' | 'solto';
}) {
  const cores = useCores();
  const solto = tom === 'solto';
  return (
    <View
      className="h-7 max-w-full flex-row items-center gap-1.5 rounded-full px-2.5"
      style={{ backgroundColor: solto ? `${cores.incomum}24` : cores.elevado }}
    >
      {icone ? <Icone nome={icone} tamanho={13} cor={solto ? cores.incomum : cores.suave} /> : null}
      <Text
        className={solto ? 'font-corpo-forte text-[12.5px]' : 'font-corpo-medio text-[12.5px]'}
        style={{ color: solto ? cores.incomum : cores.suave }}
        numberOfLines={1}
      >
        {texto}
      </Text>
    </View>
  );
}

/**
 * A gema de raridade: losango na cor da raridade.
 *
 * Nunca viaja sozinha. Onde ela aparece, a moldura da carta já está na mesma cor e o nome da
 * raridade está escrito por extenso em algum lugar da tela — cor não carrega dado só.
 */
export function Gema({ raridade, tamanho = 10, contorno }: { raridade: Rarity; tamanho?: number; contorno?: boolean }) {
  const paleta = useCores();
  const cor = coresDeRaridade(paleta)[raridade];
  return (
    <View
      accessibilityElementsHidden
      style={{
        width: tamanho,
        height: tamanho,
        backgroundColor: cor,
        borderRadius: Math.max(2, tamanho / 5),
        transform: [{ rotate: '45deg' }],
        borderWidth: contorno ? 1.5 : 0,
        borderColor: paleta.fundo,
      }}
    />
  );
}

/** Painel: o retângulo de conteúdo do guia — superfície, borda de 1 px, raio 24. */
export function Painel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`rounded-painel border border-borda bg-superficie p-4 ${className}`}>{children}</View>;
}

/** Barra de progresso de 8 px. A isca marca o quanto já foi fisgado. */
export function Progresso({ fracao, altura = 8 }: { fracao: number; altura?: number }) {
  const cores = useCores();
  const pct = Math.max(0, Math.min(1, fracao)) * 100;
  return (
    <View style={{ height: altura, borderRadius: altura / 2, backgroundColor: cores.elevado, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height: '100%', borderRadius: altura / 2, backgroundColor: cores.destaque }} />
    </View>
  );
}

/** Título de tela: 34 px, display, bem apertado. */
export function TituloDaTela({ children, acima }: { children: string; acima?: string }) {
  return (
    <View className="gap-0.5">
      {acima ? <Text className="font-corpo text-[14px] text-suave">{acima}</Text> : null}
      <Text className="font-display text-[34px] leading-[36px] tracking-[-0.03em] text-texto">{children}</Text>
    </View>
  );
}
