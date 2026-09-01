import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, Text, TextInput, View } from 'react-native';

import { RARITY_LABEL, searchSpecies, SPECIES } from '@/catalog';
import { getFoto } from '@/catalog/fotos';
import { useDraft } from '@/stores/draft';
import { useEdicao } from '@/stores/edicao';
import { coresDeRaridade, useCores } from '@/theme';

/**
 * Seletor manual — F03. É o caminho garantido, e na Etapa 1 é o único.
 *
 * Sem busca, mostra o catálogo inteiro em ordem alfabética. Com busca, usa o índice de apelidos:
 * quem tem o peixe na mão digita "traira" sem acento, ou o nome que se fala na região dele.
 *
 * Cada linha traz a foto da espécie porque esta é a tela em que a pessoa está tentando descobrir
 * o que pegou. Nome popular varia de município para município e nome científico não diz nada a
 * quem está na beira do açude — a foto é o que resolve a dúvida. É o caminho garantido enquanto
 * a identificação por IA (Fase 4) não existe, e continua sendo depois dela.
 */
export default function SeletorEspecie() {
  const router = useRouter();
  const setDraft = useDraft((s) => s.set);
  const setEdicao = useEdicao((s) => s.set);
  // A mesma tela atende o registro novo e a correção de um já salvo. Sem o alvo, escolher
  // espécie na edição escreveria no rascunho e sumiria sem deixar rastro.
  const { alvo } = useLocalSearchParams<{ alvo?: string }>();
  const [query, setQuery] = useState('');
  const paleta = useCores();
  // A raridade muda de claridade com o tema: o roxo sumiria no papel branco, o dourado na água.
  const cores = coresDeRaridade(paleta);

  const todas = useMemo(
    () => [...SPECIES].sort((a, b) => a.commonName.localeCompare(b.commonName, 'pt-BR')),
    [],
  );

  const resultados = query.trim().length > 0 ? searchSpecies(query, 40) : todas;

  function escolher(id: string | null) {
    if (alvo === 'edicao') setEdicao({ speciesId: id });
    else setDraft({ speciesId: id });
    router.back();
  }

  return (
    <View className="flex-1 bg-fundo">
      <View className="px-5 pb-2 pt-3">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por nome ou apelido"
          placeholderTextColor={paleta.suave}
          autoCorrect={false}
          autoCapitalize="none"
          className="rounded-2xl border border-borda bg-superficie px-4 py-3 text-base text-texto"
        />
      </View>

      <FlatList
        data={resultados}
        keyExtractor={(s) => s.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
        ListFooterComponent={
          <View>
            <Pressable
              onPress={() => escolher(null)}
              className="mx-5 mt-4 rounded-2xl border border-dashed border-borda p-4 active:opacity-70"
            >
              <Text className="text-base font-semibold text-texto">Não identificado</Text>
              <Text className="mt-1 text-sm text-suave">
                Registra no histórico com foto e medida, mas não desbloqueia carta.
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/creditos')}
              className="mx-5 mt-4 items-center py-2 active:opacity-60"
            >
              <Text className="text-xs text-suave">Fotos de terceiros · ver créditos</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => escolher(item.id)}
            className="mx-5 mt-2 flex-row items-center rounded-2xl border border-borda bg-superficie p-2.5 active:opacity-70"
          >
            <Foto id={item.id} cor={cores[item.rarity]} />
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-texto" numberOfLines={1}>
                {item.commonName}
              </Text>
              <Text className="mt-0.5 text-xs italic text-suave" numberOfLines={1}>
                {item.scientificName}
              </Text>
            </View>
            <View className="ml-2 flex-row items-center">
              <View
                className="mr-1.5 h-2 w-2 rounded-full"
                style={{ backgroundColor: cores[item.rarity] }}
              />
              <Text className="text-xs" style={{ color: cores[item.rarity] }}>
                {RARITY_LABEL[item.rarity]}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

/**
 * Miniatura da espécie, com a moldura na cor da raridade — a mesma linguagem da carta do álbum.
 *
 * Nem toda espécie tem foto: híbridos não existem em base taxonômica e algumas do Sul não têm
 * nenhuma imagem bem licenciada. Nesses casos fica um quadrado vazio da mesma medida, para a
 * lista não desalinhar e para a ausência não parecer defeito.
 */
function Foto({ id, cor }: { id: string; cor: string }) {
  const fonte = getFoto(id);

  return (
    <View
      className="h-14 w-14 overflow-hidden rounded-xl bg-elevado"
      style={{ borderWidth: 1.5, borderColor: cor }}
    >
      {fonte ? <Image source={fonte} className="h-full w-full" resizeMode="cover" /> : null}
    </View>
  );
}
