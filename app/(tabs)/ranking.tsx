import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getSpecies, RARITY_LABEL, RARITY_ORDER, RARITY_POINTS, type Rarity } from '@/catalog';
import { BotaoSecundario, Gema, Segmentado, TituloDaTela } from '@/components/ui';
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
import { iniciais } from './amigos';

type Aba = 'colecao' | 'especies' | 'mes' | 'maiores';

/** Uma linha da lista. As três primeiras abas listam pessoas; a última lista espécies. */
type Linha =
  | { tipo: 'pessoa'; chave: string; posicao: Posicao }
  | { tipo: 'especie'; chave: string; nome: string; captura: CapturaDeGrupo };

const ABAS: { id: Aba; rotulo: string; explica: string }[] = [
  { id: 'colecao', rotulo: 'Coleção', explica: 'Cada espécie desbloqueada soma pontos pela raridade:' },
  { id: 'especies', rotulo: 'Espécies', explica: 'Quantas espécies diferentes cada um já pegou.' },
  { id: 'mes', rotulo: 'No mês', explica: 'Capturas registradas neste mês.' },
  { id: 'maiores', rotulo: 'Maior', explica: 'O maior exemplar de cada espécie no grupo.' },
];

/**
 * Rankings do grupo — F11.
 *
 * Quatro eixos, separados de propósito. Coleção premia variedade e raridade, então quem só pesca
 * tilápia não lidera ali; "no mês" premia constância; "maior exemplar" premia o peixe da vida. Um
 * ranking único misturaria os três e o pescador de um só tipo de peixe nunca teria onde aparecer.
 *
 * A regra de cada aba fica escrita na própria tela, e a da coleção aparece como quadro de pontos
 * por raridade. Ranking cuja conta não se entende vira discussão no grupo do WhatsApp.
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

  /**
   * As raridades de cada pessoa, para a linha de gemas embaixo do nome.
   *
   * A linha de gemas conta a mesma história do número de pontos, mas de um jeito que se lê de
   * relance: três gemas prata não são a mesma coleção que uma dourada.
   */
  const porPessoa = useMemo(() => {
    const mapa = new Map<string, Rarity[]>();
    for (const d of dados?.desbloqueios ?? []) {
      const r = getSpecies(d.speciesId)?.rarity;
      if (!r) continue;
      mapa.set(d.userId, [...(mapa.get(d.userId) ?? []), r]);
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => RARITY_ORDER.indexOf(b) - RARITY_ORDER.indexOf(a));
    }
    return mapa;
  }, [dados]);

  return (
    <View className="flex-1 bg-fundo">
      <FlatList
        data={linhas}
        keyExtractor={(item) => item.chave}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        ListHeaderComponent={
          <View className="gap-4 px-5" style={{ paddingTop: insets.top + 12 }}>
            <TituloDaTela acima="Seu grupo">Ranking</TituloDaTela>

            <Segmentado opcoes={ABAS.map((a) => ({ id: a.id, rotulo: a.rotulo }))} valor={aba} onChange={setAba} />

            <View className="gap-2.5">
              <Text className="font-corpo text-[13px] leading-[18px] text-suave">{explicacao}</Text>
              {aba === 'colecao' ? (
                <View className="flex-row gap-1.5">
                  {RARITY_ORDER.map((r) => (
                    <View
                      key={r}
                      className="flex-1 items-center gap-1 rounded-[12px] border border-borda bg-superficie px-1 py-2.5"
                    >
                      <Gema raridade={r} />
                      <Text
                        className="font-display text-[18px] text-texto"
                        style={{ fontVariant: ['tabular-nums'] }}
                      >
                        {RARITY_POINTS[r]}
                      </Text>
                      <Text className="font-corpo text-[11.5px] text-suave">{RARITY_LABEL[r].toLowerCase()}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {carregando && !dados ? <ActivityIndicator className="mt-4" color={cores.destaque} /> : null}
            {erro && !dados ? <Text className="font-corpo text-[14px] leading-5 text-perigo">{erro}</Text> : null}

            {sozinho ? (
              <View className="items-center gap-3.5 rounded-painel border border-dashed border-borda-forte px-5 py-6">
                <Text className="text-center font-display text-[19px] text-texto">Ranking é melhor com gente</Text>
                <Text className="text-center font-corpo text-[14px] leading-5 text-suave">
                  Chame quem pesca com você e veja quem completa o álbum primeiro.
                </Text>
                <BotaoSecundario
                  titulo="Convidar amigos"
                  icone="compartilhar"
                  onPress={() => router.navigate('/amigos')}
                />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          dados && !sozinho ? (
            <Text className="mx-5 mt-3 font-corpo text-[14px] text-suave">
              {aba === 'mes' ? 'Ninguém registrou captura neste mês ainda.' : 'Nada para mostrar ainda.'}
            </Text>
          ) : null
        }
        renderItem={({ item, index }) => {
          if (item.tipo === 'especie') {
            const eu = item.captura.userId === user?.id;
            return (
              <View className="mx-5 mt-2 flex-row items-center justify-between rounded-carta border border-borda bg-superficie px-4 py-3">
                <View className="flex-1">
                  <Text className="font-display-medio text-[17px] text-texto">{item.nome}</Text>
                  <Text
                    className={eu ? 'font-corpo-forte text-[12.5px] text-acao' : 'font-corpo text-[12.5px] text-suave'}
                  >
                    {nomeDe(item.captura.userId)}
                  </Text>
                </View>
                <Text
                  className="font-display text-[22px] text-texto"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {formatarCm(item.captura.lengthCm)}
                  <Text className="font-display-medio text-[13px] text-suave"> cm</Text>
                </Text>
              </View>
            );
          }

          const { posicao } = item;
          const eu = posicao.userId === user?.id;
          const podio = index < 3;

          return (
            <View
              className="mx-5 mt-2 flex-row items-center gap-3 rounded-painel px-4 py-3.5"
              style={{
                backgroundColor: cores.superficie,
                borderWidth: eu ? 1.5 : 1,
                borderColor: eu ? cores.destaque : cores.borda,
              }}
            >
              {/* A posição é um selo quadrado; o pódio ganha ouro, prata e bronze. */}
              <View
                className="h-[34px] w-[34px] items-center justify-center rounded-[10px]"
                style={{ backgroundColor: podio ? [cores.ouro, cores.prata, cores.bronze][index] : cores.elevado }}
              >
                <Text
                  className="font-display text-[18px]"
                  style={{ color: podio ? '#2A1C00' : cores.suave, fontVariant: ['tabular-nums'] }}
                >
                  {index + 1}
                </Text>
              </View>

              <View
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: cores.elevado, borderWidth: 2, borderColor: cores.bordaForte }}
              >
                <Text className="font-display text-[15px] text-texto">{iniciais(nomeDe(posicao.userId))}</Text>
              </View>

              <View className="min-w-0 flex-1 gap-1">
                <Text className="font-display text-[18px] text-texto" numberOfLines={1}>
                  {nomeDe(posicao.userId)}
                </Text>
                {aba !== 'mes' ? (
                  <View className="flex-row items-center gap-1">
                    {(porPessoa.get(posicao.userId) ?? []).slice(0, 8).map((r, i) => (
                      <Gema key={`${r}-${i}`} raridade={r} tamanho={8} />
                    ))}
                    <Text className="ml-1 font-corpo text-[12.5px] text-suave">
                      {(porPessoa.get(posicao.userId) ?? []).length} espécies
                    </Text>
                  </View>
                ) : null}
              </View>

              <View className="flex-row items-baseline gap-1">
                <Text
                  className="font-display text-[30px] leading-[30px] text-texto"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {posicao.valor}
                </Text>
                <Text className="font-corpo-forte text-[13px] text-suave">{aba === 'colecao' ? 'pts' : ''}</Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

function formatarCm(cm: number): string {
  return Number.isInteger(cm) ? String(cm) : cm.toFixed(1).replace('.', ',');
}
