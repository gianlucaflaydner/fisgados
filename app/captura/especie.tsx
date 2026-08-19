import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { RARITY_LABEL, searchSpecies, SPECIES, type Species } from '@/catalog';
import { useDraft } from '@/stores/draft';

const CORES: Record<Species['rarity'], string> = {
  comum: '#7C9A8E',
  incomum: '#4A9DE0',
  raro: '#A472E8',
  lendario: '#E0A82E',
};

/**
 * Seletor manual — F03. É o caminho garantido, e na Etapa 1 é o único.
 *
 * Sem busca, mostra o catálogo inteiro em ordem alfabética. Com busca, usa o índice de apelidos:
 * quem tem o peixe na mão digita "traira" sem acento, ou o nome que se fala na região dele.
 */
export default function SeletorEspecie() {
  const router = useRouter();
  const setDraft = useDraft((s) => s.set);
  const [query, setQuery] = useState('');

  const todas = useMemo(
    () => [...SPECIES].sort((a, b) => a.commonName.localeCompare(b.commonName, 'pt-BR')),
    [],
  );

  const resultados = query.trim().length > 0 ? searchSpecies(query, 40) : todas;

  function escolher(id: string | null) {
    setDraft({ speciesId: id });
    router.back();
  }

  return (
    <View className="flex-1 bg-fundo">
      <View className="px-5 pb-2 pt-3">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por nome ou apelido"
          placeholderTextColor="#5E7972"
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
          <Pressable
            onPress={() => escolher(null)}
            className="mx-5 mt-4 rounded-2xl border border-dashed border-borda p-4 active:opacity-70"
          >
            <Text className="text-base font-semibold text-texto">Não identificado</Text>
            <Text className="mt-1 text-sm text-suave">
              Registra no histórico com foto e medida, mas não desbloqueia carta.
            </Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => escolher(item.id)}
            className="mx-5 mt-2 flex-row items-center rounded-2xl border border-borda bg-superficie px-4 py-3 active:opacity-70"
          >
            <View
              className="mr-3 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CORES[item.rarity] }}
            />
            <View className="flex-1">
              <Text className="text-base font-semibold text-texto">{item.commonName}</Text>
              <Text className="mt-0.5 text-xs italic text-suave">{item.scientificName}</Text>
            </View>
            <Text className="ml-2 text-xs" style={{ color: CORES[item.rarity] }}>
              {RARITY_LABEL[item.rarity]}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
