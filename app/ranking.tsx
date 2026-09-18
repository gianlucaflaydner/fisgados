import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getSpecies, RARITY_POINTS } from '@/catalog';
import {
  maioresPorEspecie,
  rankingDeColecao,
  rankingDeEspecies,
  rankingDoMes,
  type CapturaDeGrupo,
  type Posicao,
} from '@/domain/ranking';
import { useSession } from '@/stores/session';
import { useSync } from '@/stores/sync';
import { dadosDoGrupo, type DadosDoGrupo } from '@/sync/amigos';
import { useCores } from '@/theme';

type Aba = 'colecao' | 'especies' | 'mes' | 'maiores';

/** Uma linha da lista. As três primeiras abas listam pessoas; a última lista espécies. */
type Linha =
  | { tipo: 'pessoa'; chave: string; posicao: Posicao }
  | { tipo: 'especie'; chave: string; nome: string; captura: CapturaDeGrupo };

const ABAS: { id: Aba; rotulo: string; explica: string }[] = [
  {
    id: 'colecao',
    rotulo: 'Coleção',
    explica: 'Soma dos pontos das espécies desbloqueadas: comum 1, incomum 3, raro 8, lendário 20.',
  },
  { id: 'especies', rotulo: 'Espécies', explica: 'Quantas espécies diferentes cada um já pegou.' },
  { id: 'mes', rotulo: 'No mês', explica: 'Capturas registradas neste mês.' },
  { id: 'maiores', rotulo: 'Maior exemplar', explica: 'O maior de cada espécie no grupo.' },
];

/**
 * Rankings do grupo — F11.
 *
 * Quatro eixos, separados de propósito. Coleção premia variedade e raridade, então quem só pesca
 * tilápia não lidera ali; "no mês" premia constância; "maior exemplar" premia o peixe da vida. Um
 * ranking único misturaria os três e o pescador de um só tipo de peixe nunca teria onde aparecer.
 *
 * A regra de cada aba fica escrita na própria tela. Ranking cuja conta não se entende vira
 * discussão no grupo do WhatsApp.
 */
export default function Ranking() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cores = useCores();
  const user = useSession((s) => s.user);
  const dispararSync = useSync((s) => s.disparar);

  const [aba, setAba] = useState<Aba>('colecao');
  const [dados, setDados] = useState<DadosDoGrupo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      let vivo = true;
      (async () => {
        setCarregando(true);
        // Sobe o que ainda está na fila antes de ler: senão a própria captura de hoje não
        // aparece no ranking, e a primeira reação é achar que o app perdeu o peixe.
        await dispararSync();
        const r = await dadosDoGrupo(user.id);
        if (!vivo) return;
        if (r.ok) {
          setDados(r.valor);
          setErro(null);
        } else {
          setErro(r.erro);
        }
        setCarregando(false);
      })();
      return () => {
        vivo = false;
      };
    }, [user?.id, dispararSync]),
  );

  const posicoes = useMemo((): Posicao[] => {
    if (!dados) return [];
    if (aba === 'colecao') {
      return rankingDeColecao(dados.desbloqueios, (id) => {
        const s = getSpecies(id);
        return s ? RARITY_POINTS[s.rarity] : 0;
      });
    }
    if (aba === 'especies') return rankingDeEspecies(dados.desbloqueios);
    if (aba === 'mes') {
      // O fuso do aparelho: a data gravada está em UTC e perdeu o fuso original da captura.
      return rankingDoMes(dados.capturas, new Date(), -new Date().getTimezoneOffset());
    }
    return [];
  }, [dados, aba]);

  const maiores = useMemo(() => {
    if (!dados || aba !== 'maiores') return [];
    return [...maioresPorEspecie(dados.capturas).entries()]
      .map(([speciesId, c]) => ({ speciesId, captura: c, nome: getSpecies(speciesId)?.commonName ?? speciesId }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [dados, aba]);

  const linhas = useMemo((): Linha[] => {
    if (aba === 'maiores') {
      return maiores.map((m) => ({ tipo: 'especie', chave: m.speciesId, nome: m.nome, captura: m.captura }));
    }
    return posicoes.map((p) => ({ tipo: 'pessoa', chave: p.userId, posicao: p }));
  }, [aba, maiores, posicoes]);

  const nomeDe = (id: string) => (id === user?.id ? 'Você' : (dados?.nomes.get(id) ?? 'Pescador'));
  const sozinho = dados !== null && dados.nomes.size <= 1;
  const explicacao = ABAS.find((a) => a.id === aba)!.explica;

  return (
    <View className="flex-1 bg-fundo">
      <View className="border-b border-borda">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 6 }}
        >
          {ABAS.map((a) => {
            const ativa = a.id === aba;
            return (
              <Pressable
                key={a.id}
                onPress={() => setAba(a.id)}
                className={
                  ativa
                    ? 'rounded-xl bg-cobalto px-3 py-1.5'
                    : 'rounded-xl border border-borda px-3 py-1.5 active:opacity-70'
                }
              >
                <Text className={ativa ? 'text-xs font-semibold text-superficie' : 'text-xs font-semibold text-suave'}>
                  {a.rotulo}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {carregando && !dados ? (
        <ActivityIndicator className="mt-8" color={cores.cobalto} />
      ) : erro && !dados ? (
        <Text className="mx-5 mt-6 text-sm leading-5 text-perigo">{erro}</Text>
      ) : (
        <FlatList
          data={linhas}
          keyExtractor={(item) => item.chave}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ListHeaderComponent={
            <View className="px-5 pb-2 pt-4">
              <Text className="text-sm leading-5 text-suave">{explicacao}</Text>
              {sozinho ? (
                <Pressable
                  onPress={() => router.push('/amigos')}
                  className="mt-3 rounded-2xl border border-dashed border-borda p-4 active:opacity-70"
                >
                  <Text className="text-sm leading-5 text-suave">
                    Ranking é mais divertido com gente.{' '}
                    <Text className="font-semibold text-cobalto">Convide quem pesca com você</Text>
                  </Text>
                </Pressable>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <Text className="mx-5 mt-2 text-sm text-suave">
              {aba === 'mes' ? 'Ninguém registrou captura neste mês ainda.' : 'Nada para mostrar ainda.'}
            </Text>
          }
          renderItem={({ item, index }) => {
            if (item.tipo === 'especie') {
              const eu = item.captura.userId === user?.id;
              return (
                <View className="mx-5 mt-2 flex-row items-center justify-between rounded-2xl border border-borda bg-superficie px-4 py-3">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-texto">{item.nome}</Text>
                    <Text className={eu ? 'text-xs font-semibold text-cobalto' : 'text-xs text-suave'}>
                      {nomeDe(item.captura.userId)}
                    </Text>
                  </View>
                  <Text
                    className="text-lg font-extrabold text-cobalto"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {formatarCm(item.captura.lengthCm)} cm
                  </Text>
                </View>
              );
            }

            const { posicao } = item;
            const eu = posicao.userId === user?.id;
            return (
              <View
                className="mx-5 mt-2 flex-row items-center rounded-2xl border bg-superficie px-4 py-3"
                style={{ borderColor: eu ? cores.cobalto : cores.borda }}
              >
                <Text
                  className="w-8 text-base font-bold text-suave"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {index + 1}
                </Text>
                <Text className={eu ? 'flex-1 text-base font-bold text-cobalto' : 'flex-1 text-base font-semibold text-texto'}>
                  {nomeDe(posicao.userId)}
                </Text>
                <Text className="text-lg font-extrabold text-texto" style={{ fontVariant: ['tabular-nums'] }}>
                  {posicao.valor}
                </Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function formatarCm(cm: number): string {
  return Number.isInteger(cm) ? String(cm) : cm.toFixed(1).replace('.', ',');
}
