import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getSpecies, RARITY_LABEL, RARITY_ORDER, RARITY_POINTS, SPECIES } from '@/catalog';
import { CartaCaptura } from '@/components/CartaCaptura';
import { Icone } from '@/components/Icone';
import { BotaoIcone, Gema, Progresso } from '@/components/ui';
import { countBySpecies, listCatches, listPersonalBests, listUnlockedIds } from '@/db/queries';
import type { CatchRow } from '@/db/schema';
import { useSession } from '@/stores/session';
import { useSync } from '@/stores/sync';
import { useTema, type Preferencia } from '@/stores/tema';
import { coresDeRaridade, useCores } from '@/theme';

/** Vem do catálogo, não de constante: número escrito à mão é número que envelhece. */
const TOTAL_ESPECIES = SPECIES.length;

/**
 * Início — o painel do álbum em cima, o histórico embaixo.
 *
 * O cartão do álbum é a primeira coisa da tela e o maior número dela: em dia sem pescaria, ver
 * quanto falta é o único motivo de abrir o app. A faixa de raridades embaixo do número mostra de
 * que *tipo* é o que já foi fisgado — três comuns e um lendário não são a mesma coleção.
 *
 * O botão de registrar não está aqui: vive na barra inferior, em todas as telas (ver
 * `app/(tabs)/_layout.tsx`).
 */
export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const paleta = useCores();
  const cores = coresDeRaridade(paleta);
  const user = useSession((s) => s.user);
  const pendentes = useSync((s) => s.pendentes);
  const dispararSync = useSync((s) => s.disparar);

  const [rows, setRows] = useState<CatchRow[]>([]);
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [recordes, setRecordes] = useState<Map<string, number>>(new Map());
  const [contagem, setContagem] = useState<Map<string, number>>(new Map());

  // Recarrega ao voltar para a tela: o histórico muda quando o usuário registra algo.
  // Depende da conta porque o álbum é de quem está logado — trocar de conta troca a lista.
  const userId = user?.id;
  useFocusEffect(
    useCallback(() => {
      // Durante o logout esta tela ainda desenha um quadro antes de sair; sem dono, não há o que
      // buscar, e insistir mostraria o histórico de quem acabou de sair.
      if (!userId) return;

      let vivo = true;
      (async () => {
        const [lista, ids, melhores, quantas] = await Promise.all([
          listCatches(userId, 50),
          listUnlockedIds(userId),
          listPersonalBests(userId),
          countBySpecies(userId),
        ]);
        if (!vivo) return;
        setRows(lista);
        setAbertas(ids);
        setRecordes(melhores);
        setContagem(quantas);
        // Voltar para a home é um bom momento: acabou de registrar, ou acabou de chegar em casa.
        void dispararSync();
      })();
      return () => {
        vivo = false;
      };
    }, [userId, dispararSync]),
  );

  /** Quantas cartas de cada raridade, e os pontos de coleção que elas somam (PRD seção 10). */
  const porRaridade = useMemo(() => {
    const conta = { comum: 0, incomum: 0, raro: 0, lendario: 0 };
    let pontos = 0;
    for (const id of abertas) {
      const s = getSpecies(id);
      if (!s) continue;
      conta[s.rarity]++;
      pontos += RARITY_POINTS[s.rarity];
    }
    return { conta, pontos };
  }, [abertas]);

  return (
    <View className="flex-1 bg-fundo">
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        ListHeaderComponent={
          <View className="gap-5 px-5" style={{ paddingTop: insets.top + 12 }}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="font-corpo text-[14px] text-suave">Boa pescaria,</Text>
                <Text className="font-display text-[28px] leading-[30px] tracking-[-0.02em] text-texto">
                  {user?.nome ?? 'pescador'}
                </Text>
              </View>
              <BotaoTema />
            </View>

            {/* O cartão do álbum: contador, progresso por raridade e pontos de coleção. */}
            <Pressable
              onPress={() => router.navigate('/album')}
              accessibilityRole="button"
              className="gap-3.5 rounded-painel border border-borda bg-superficie p-4 active:opacity-80"
            >
              <View className="flex-row items-end justify-between">
                <View className="gap-1">
                  <Text className="font-corpo-forte text-[12px] uppercase tracking-[0.12em] text-suave">
                    Seu álbum
                  </Text>
                  <View className="flex-row items-baseline gap-2">
                    <Text
                      className="font-display text-[56px] leading-[50px] tracking-[-0.03em] text-acao"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {abertas.size}
                    </Text>
                    <Text className="font-display-medio text-[20px] text-suave">de {TOTAL_ESPECIES} espécies</Text>
                  </View>
                </View>
                <View
                  className="h-9 flex-row items-center gap-1 rounded-full px-3"
                  style={{ backgroundColor: paleta.texto }}
                >
                  <Text className="font-corpo-negrito text-[14px]" style={{ color: paleta.fundo }}>
                    Abrir
                  </Text>
                  <Icone nome="avancar" tamanho={16} cor={paleta.fundo} traco={2.4} />
                </View>
              </View>

              {/* Faixa de raridades: cada bloco é proporcional ao que já foi fisgado. */}
              <View className="h-2.5 flex-row gap-[3px]">
                {RARITY_ORDER.map((r) =>
                  porRaridade.conta[r] > 0 ? (
                    <View
                      key={r}
                      style={{
                        flex: porRaridade.conta[r],
                        borderRadius: 3,
                        backgroundColor: cores[r],
                      }}
                    />
                  ) : null,
                )}
                <View
                  style={{
                    flex: Math.max(1, TOTAL_ESPECIES - abertas.size),
                    borderRadius: 3,
                    backgroundColor: paleta.elevado,
                  }}
                />
              </View>

              <View className="flex-row flex-wrap items-center gap-x-3.5 gap-y-1">
                {RARITY_ORDER.filter((r) => porRaridade.conta[r] > 0).map((r) => (
                  <View key={r} className="flex-row items-center gap-1.5">
                    <Gema raridade={r} tamanho={9} />
                    <Text className="font-corpo text-[13px] text-suave">
                      {porRaridade.conta[r]} {RARITY_LABEL[r].toLowerCase()}
                      {porRaridade.conta[r] > 1 ? 's' : ''}
                    </Text>
                  </View>
                ))}
                <Text className="ml-auto font-corpo-forte text-[13px] text-texto">{porRaridade.pontos} pts</Text>
              </View>
            </Pressable>

            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => router.push('/insignias')}
                className="h-9 flex-row items-center gap-1.5 rounded-full border border-borda-forte bg-elevado px-3 active:opacity-70"
              >
                <Icone nome="ranking" tamanho={14} cor={paleta.suave} />
                <Text className="font-corpo-forte text-[13px] text-texto">Insígnias</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/locais')}
                className="h-9 flex-row items-center gap-1.5 rounded-full border border-borda-forte bg-elevado px-3 active:opacity-70"
              >
                <Icone nome="local" tamanho={14} cor={paleta.suave} />
                <Text className="font-corpo-forte text-[13px] text-texto">Meus pontos</Text>
              </Pressable>
              {pendentes > 0 ? (
                <Text className="font-corpo text-[12.5px] text-apoio">
                  {pendentes === 1 ? '1 captura ainda não subiu' : `${pendentes} capturas ainda não subiram`}
                </Text>
              ) : null}
            </View>

            <View className="flex-row items-baseline justify-between">
              <Text className="font-display text-[22px] tracking-[-0.01em] text-texto">Últimas capturas</Text>
              <Text className="font-corpo-forte text-[14px] text-suave">
                {rows.length === 0 ? 'nenhuma ainda' : `${rows.length} no histórico`}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className="mx-5 mt-4 gap-2 rounded-painel border border-dashed border-borda-forte p-6">
            <Text className="font-display text-[19px] text-texto">Comece pela primeira</Text>
            <Text className="font-corpo text-[14px] leading-5 text-suave">
              Toque no botão laranja, fotografe o peixe, escolha a espécie e informe a medida.
              Funciona sem internet.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <CartaCaptura
            row={item}
            recorde={item.speciesId ? recordes.get(item.speciesId) === item.lengthCm : false}
            quantas={item.speciesId ? contagem.get(item.speciesId) : undefined}
            onPress={() => router.push({ pathname: '/captura/[id]', params: { id: item.id } })}
          />
        )}
      />
    </View>
  );
}

const ROTULO: Record<Preferencia, string> = {
  sistema: 'Seguir o sistema',
  claro: 'Claro',
  escuro: 'Escuro',
};

/**
 * Troca de tema, no canto da home.
 *
 * Um menu de três opções em vez de um botão que alterna: com "seguir o sistema" no meio, alternar
 * em ciclo esconderia o estado atual — e é justamente o estado atual que a pessoa quer conferir
 * quando abre isso.
 */
function BotaoTema() {
  const preferencia = useTema((s) => s.preferencia);
  const definir = useTema((s) => s.definir);

  function abrir() {
    Alert.alert('Tema', `Agora: ${ROTULO[preferencia].toLowerCase()}`, [
      { text: ROTULO.sistema, onPress: () => void definir('sistema') },
      { text: ROTULO.claro, onPress: () => void definir('claro') },
      { text: ROTULO.escuro, onPress: () => void definir('escuro') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  return <BotaoIcone nome="lua" rotulo="Trocar tema" onPress={abrir} />;
}
