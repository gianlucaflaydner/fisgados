import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

import { getSpecies } from '@/catalog';
import { getFoto } from '@/catalog/fotos';
import { apresentar, porcentagem, type Sugestao } from '@/domain/identificacao';
import { useIdentificacao } from '@/stores/identificacao';
import { useCores } from '@/theme';

interface Props {
  /** A foto do rascunho. Resultado de outra foto não aparece. */
  photoUri: string | null;
  escolhida: string | null;
  onEscolher: (speciesId: string) => void;
  onAbrirLista: () => void;
}

/** Espécies que o catálogo marca como fáceis de confundir (SDD 6.3). */
const parecidasCom = (id: string) => getSpecies(id)?.visuallySimilarTo ?? [];

/**
 * Sugestões da IA no formulário de registro — F02.
 *
 * Fica embaixo do campo de espécie e nunca no lugar dele: a IA sugere, quem decide é a pessoa
 * (RN02). Tocar numa sugestão só preenche o campo, igual a escolher na lista. Nada aqui escolhe
 * sozinho, nem com 99%.
 *
 * Quando a IA falha, some sem mensagem (SDD 6.5). O seletor manual já está logo acima, e um
 * "erro na identificação" faria parecer que o registro deu errado — e não deu.
 */
export function SugestoesIA({ photoUri, escolhida, onEscolher, onAbrirLista }: Props) {
  const uri = useIdentificacao((s) => s.uri);
  const resultado = useIdentificacao((s) => s.resultado);
  const cores = useCores();

  if (!photoUri || uri !== photoUri) return null;

  if (resultado.estado === 'buscando') {
    return (
      <View className="mt-3 flex-row items-center">
        <ActivityIndicator size="small" color={cores.suave} />
        <Text className="ml-2 text-sm text-suave">Olhando a foto para sugerir a espécie...</Text>
      </View>
    );
  }

  if (resultado.estado === 'falhou') {
    if (resultado.motivo !== 'limite' || !resultado.avisar) return null;
    return (
      <Text className="mt-3 text-xs leading-4 text-suave">
        As sugestões pela foto de hoje acabaram. Amanhã elas voltam; até lá, escolha na lista.
      </Text>
    );
  }

  if (resultado.estado !== 'pronta') return null;

  const a = apresentar(resultado.sugestoes, parecidasCom);

  if (a.tipo === 'nenhuma') {
    return (
      <Text className="mt-3 text-xs leading-4 text-suave">
        Pela foto não deu para ter certeza da espécie. Escolha na lista.
      </Text>
    );
  }

  return (
    <View className="mt-3">
      {a.tipo === 'duvida' ? (
        <>
          <Text className="mb-2 text-sm leading-5 text-texto">
            Fica entre estes dois. Compare com o seu peixe:
          </Text>
          <View className="flex-row gap-2">
            {[a.primeira, a.segunda].map((s) => (
              <CartaoDuvida key={s.speciesId} s={s} ativa={s.speciesId === escolhida} onPress={() => onEscolher(s.speciesId)} />
            ))}
          </View>
          {a.demais.map((s) => (
            <Linha key={s.speciesId} s={s} ativa={s.speciesId === escolhida} onPress={() => onEscolher(s.speciesId)} />
          ))}
        </>
      ) : (
        <>
          <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-suave">Pela foto, parece</Text>
          {a.sugestoes.map((s) => (
            <Linha key={s.speciesId} s={s} ativa={s.speciesId === escolhida} onPress={() => onEscolher(s.speciesId)} />
          ))}
        </>
      )}

      <Pressable onPress={onAbrirLista} hitSlop={8} className="mt-2 self-start py-1 active:opacity-60">
        <Text className="text-sm font-semibold text-cobalto">Nenhuma dessas? Ver a lista toda</Text>
      </Pressable>
    </View>
  );
}

function Linha({ s, ativa, onPress }: { s: Sugestao; ativa: boolean; onPress: () => void }) {
  const cores = useCores();
  const especie = getSpecies(s.speciesId);
  const foto = getFoto(s.speciesId);
  if (!especie) return null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: ativa }}
      className="mt-2 flex-row items-center rounded-2xl border bg-superficie p-2.5 active:opacity-70"
      style={{ borderColor: ativa ? cores.cobalto : cores.borda, borderWidth: ativa ? 2 : 1 }}
    >
      <View className="h-12 w-12 overflow-hidden rounded-xl bg-elevado">
        {foto ? <Image source={foto} className="h-full w-full" resizeMode="cover" /> : null}
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-base font-semibold text-texto" numberOfLines={1}>
          {especie.commonName}
        </Text>
        {s.motivo ? (
          <Text className="mt-0.5 text-xs leading-4 text-suave" numberOfLines={2}>
            {s.motivo}
          </Text>
        ) : null}
      </View>
      <Text className="ml-2 text-sm font-bold text-cobalto" style={{ fontVariant: ['tabular-nums'] }}>
        {porcentagem(s.confianca)}
      </Text>
    </Pressable>
  );
}

/**
 * Metade da dúvida. A foto do catálogo é grande de propósito: é olhando para ela, com o peixe
 * ao lado, que a pessoa desempata — o texto do motivo ajuda, a imagem decide.
 */
function CartaoDuvida({ s, ativa, onPress }: { s: Sugestao; ativa: boolean; onPress: () => void }) {
  const cores = useCores();
  const especie = getSpecies(s.speciesId);
  const foto = getFoto(s.speciesId);
  if (!especie) return null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: ativa }}
      className="flex-1 overflow-hidden rounded-2xl border bg-superficie active:opacity-70"
      style={{ borderColor: ativa ? cores.cobalto : cores.borda, borderWidth: ativa ? 2 : 1 }}
    >
      <View className="bg-elevado" style={{ aspectRatio: 4 / 3 }}>
        {foto ? <Image source={foto} className="h-full w-full" resizeMode="cover" /> : null}
      </View>
      <View className="p-2.5">
        <View className="flex-row items-baseline justify-between">
          <Text className="flex-1 text-sm font-semibold text-texto" numberOfLines={1}>
            {especie.commonName}
          </Text>
          <Text className="ml-1 text-xs font-bold text-cobalto" style={{ fontVariant: ['tabular-nums'] }}>
            {porcentagem(s.confianca)}
          </Text>
        </View>
        {s.motivo ? <Text className="mt-1 text-xs leading-4 text-suave">{s.motivo}</Text> : null}
      </View>
    </Pressable>
  );
}
