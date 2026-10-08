import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { SectionList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Progresso, Segmentado } from '@/components/ui';
import { listBadgeKeys, listCatches, listUnlockedIds } from '@/db/queries';
import {
  chave,
  HISTORIAS,
  NOME_DA_FAMILIA,
  PONTOS_DE_HISTORIA,
  pontosDeInsignia,
  vitrine,
  type CapturaParaInsignia,
  type Familia,
  type Grau,
  type InsigniaDeHistoria,
  type LinhaNaVitrine,
} from '@/domain/insignias';
import { useSession } from '@/stores/session';
import { useCores } from '@/theme';

type Filtro = 'conquistadas' | 'todas';

/**
 * A lista mistura dois tipos de item: linha com grau e insígnia de história, que não tem grau.
 * A união explícita é o que permite o `renderItem` escolher o desenho sem adivinhar.
 */
type ItemDaVitrine =
  | { tipo: 'linha'; linha: LinhaNaVitrine }
  | { tipo: 'historia'; historia: InsigniaDeHistoria; ganha: boolean };

interface Secao {
  title: string;
  data: ItemDaVitrine[];
}

/** A ordem das famílias na vitrine: do que todo mundo tem para o que é de poucos. */
const ORDEM: Familia[] = ['fisgadas', 'colecao', 'trofeu', 'constancia', 'historia', 'especie'];

/**
 * Insígnias — PRD seção 11.
 *
 * A vitrine do segundo eixo de progressão do app. O álbum premia **variedade**; as insígnias
 * premiam volume, tamanho e constância — e é isso que dá o que mostrar a quem pesca tilápia no
 * mesmo açude há dez anos e nunca vai completar carta nenhuma.
 *
 * Por padrão a tela abre no que **já foi conquistado**: a lista inteira são quase cem linhas, e
 * abrir numa parede de cinza é o contrário de vitrine. "Todas" fica a um toque, para quem quer ver
 * o que existe pela frente.
 */
export default function Insignias() {
  const insets = useSafeAreaInsets();
  const cores = useCores();
  const userId = useSession((s) => s.user?.id);

  const [capturas, setCapturas] = useState<CapturaParaInsignia[]>([]);
  const [desbloqueios, setDesbloqueios] = useState<Set<string>>(new Set());
  const [concedidas, setConcedidas] = useState<Set<string>>(new Set());
  const [filtro, setFiltro] = useState<Filtro>('conquistadas');

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let vivo = true;
      (async () => {
        const [lista, ids, chaves] = await Promise.all([
          listCatches(userId, 5000),
          listUnlockedIds(userId),
          listBadgeKeys(userId),
        ]);
        if (!vivo) return;
        setCapturas(lista);
        setDesbloqueios(ids);
        setConcedidas(chaves);
      })();
      return () => {
        vivo = false;
      };
    }, [userId]),
  );

  const linhas = useMemo(
    () => vitrine(capturas, desbloqueios, concedidas, -new Date().getTimezoneOffset()),
    [capturas, desbloqueios, concedidas],
  );

  const pontos = pontosDeInsignia(concedidas);
  const conquistadas = linhas.filter((l) => l.atual !== null).length;
  const historiasGanhas = HISTORIAS.filter((h) => concedidas.has(chave(`historia:${h.id}`, 'bronze')));

  const secoes = useMemo((): Secao[] => {
    const porFamilia = ORDEM.filter((f) => f !== 'historia').map((familia): Secao => ({
      title: NOME_DA_FAMILIA[familia],
      data: linhas
        .filter((l) => l.linha.familia === familia)
        .filter((l) => (filtro === 'todas' ? true : l.atual !== null))
        // Conquistadas primeiro; dentro delas, o grau mais alto na frente.
        .sort((a, b) => b.pontos - a.pontos || b.valor - a.valor)
        .map((linha) => ({ tipo: 'linha', linha })),
    }));

    const historia: Secao = {
      title: NOME_DA_FAMILIA.historia,
      data: (filtro === 'todas' ? HISTORIAS : historiasGanhas).map((h) => ({
        tipo: 'historia',
        historia: h,
        ganha: concedidas.has(chave(`historia:${h.id}`, 'bronze')),
      })),
    };

    // "História" entra antes de "Por espécie": são doze linhas contra oitenta e quatro, e deixar a
    // família gigante por último é o que mantém a tela legível ao rolar.
    return [...porFamilia.slice(0, 4), historia, ...porFamilia.slice(4)].filter((s) => s.data.length > 0);
  }, [linhas, filtro, historiasGanhas, concedidas]);

  return (
    <View className="flex-1 bg-fundo">
      <SectionList
        sections={secoes}
        keyExtractor={(item) =>
          item.tipo === 'historia' ? `h-${item.historia.id}` : `l-${item.linha.linha.id}`
        }
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <View className="gap-3 px-5 pb-1 pt-4">
            <View className="flex-row items-end gap-3 rounded-painel border border-borda bg-superficie p-4">
              <View>
                <Text
                  className="font-display text-[44px] leading-[42px] text-acao"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {pontos}
                </Text>
                <Text className="font-corpo-forte text-[13px] text-suave">pontos de insígnia</Text>
              </View>
              <Text className="flex-1 pb-1 text-right font-corpo text-[13px] leading-[18px] text-apoio">
                {conquistadas + historiasGanhas.length} insígnias em{' '}
                {linhas.length + HISTORIAS.length} linhas
              </Text>
            </View>

            <Segmentado
              opcoes={[
                { id: 'conquistadas', rotulo: 'Conquistadas' },
                { id: 'todas', rotulo: 'Todas' },
              ]}
              valor={filtro}
              onChange={setFiltro}
            />
          </View>
        }
        ListEmptyComponent={
          <View className="mx-5 mt-5 gap-2 rounded-painel border border-dashed border-borda-forte p-6">
            <Text className="font-display text-[19px] text-texto">Nenhuma ainda</Text>
            <Text className="font-corpo text-[14px] leading-5 text-suave">
              A primeira chega rápido: dez capturas fecham "Molhou o Anzol", e o primeiro peixe
              grande fecha "Passou de Palmo". Toque em "Todas" para ver o que existe.
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text className="mx-5 mb-1 mt-5 font-corpo-forte text-[12px] uppercase tracking-[0.12em] text-suave">
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => {
          if (item.tipo === 'historia') {
            return (
              <View
                className="mx-5 mt-2 flex-row items-center gap-3 rounded-carta border bg-superficie px-4 py-3"
                style={{ borderColor: item.ganha ? cores.destaque : cores.borda, opacity: item.ganha ? 1 : 0.6 }}
              >
                <View className="flex-1">
                  <Text className="font-display text-[16px] text-texto">{item.historia.nome}</Text>
                  <Text className="mt-0.5 font-corpo text-[12.5px] leading-[17px] text-apoio">
                    {item.historia.condicao}
                  </Text>
                </View>
                <Text
                  className="font-display text-[14px]"
                  style={{ color: item.ganha ? cores.destaque : cores.apoio }}
                >
                  {item.ganha ? `+${PONTOS_DE_HISTORIA}` : '—'}
                </Text>
              </View>
            );
          }

          const l = item.linha;
          return (
            <View className="mx-5 mt-2 gap-2 rounded-carta border border-borda bg-superficie px-4 py-3">
              <View className="flex-row items-center gap-2">
                {l.atual ? <SeloDeGrau grau={l.atual.grau} /> : null}
                <View className="min-w-0 flex-1">
                  <Text className="font-display text-[16px] text-texto" numberOfLines={1}>
                    {l.atual ? l.atual.nome : l.linha.titulo}
                  </Text>
                  <Text className="font-corpo text-[12px] text-apoio" numberOfLines={1}>
                    {l.atual ? l.linha.titulo : l.linha.conta}
                  </Text>
                </View>
                <Text
                  className="font-display-medio text-[14px] text-suave"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {l.valor}
                </Text>
              </View>

              {l.proximo ? (
                <View className="gap-1.5">
                  <Progresso fracao={l.valor / l.proximo.exige} altura={6} />
                  <Text className="font-corpo text-[12px] text-apoio">
                    {l.faltam === 0
                      ? `${l.proximo.nome} na próxima vez que o app conferir`
                      : `faltam ${l.faltam} para ${l.proximo.nome}`}
                  </Text>
                </View>
              ) : (
                <Text className="font-corpo text-[12px] text-apoio">linha completa</Text>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

/** O selo do grau: metal com o nome escrito, porque cor sozinha não diz qual é. */
export function SeloDeGrau({ grau }: { grau: Grau }) {
  const cores = useCores();
  return (
    <View className="rounded-selo px-2 py-1" style={{ backgroundColor: cores[grau] }}>
      <Text className="font-display text-[10px] tracking-[0.08em]" style={{ color: '#2A1C00' }}>
        {grau.toUpperCase()}
      </Text>
    </View>
  );
}
