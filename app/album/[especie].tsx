import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getSpecies, RARITY_LABEL, RARITY_POINTS } from '@/catalog';
import { CREDITOS } from '@/catalog/creditos';
import { getFoto } from '@/catalog/fotos';
import { getIlustracao } from '@/catalog/ilustracoes';
import { listCatchesOfSpecies } from '@/db/queries';
import type { CatchRow } from '@/db/schema';
import { measureLabel, weightLabel } from '@/domain/weight';
import { personalBest } from '@/domain/ranking';
import { useSession } from '@/stores/session';
import { coresDeRaridade, useCores } from '@/theme';

/**
 * Ficha da espécie — F08.
 *
 * É a única tela do app que se **lê** em vez de operar, e o texto reflete isso: a curiosidade vem
 * em corpo maior, com entrelinha de leitura e largura contida. O resto é consulta rápida — faixa
 * de tamanho, eixo de medida, seu recorde — em tabela de duas colunas, com numeral tabular.
 *
 * A foto aqui é grande e em cor mesmo com a carta trancada. Ficha é guia de campo: quem abre
 * antes de desbloquear está tentando descobrir se o peixe na mão é este, e cinza atrapalharia.
 */
export default function Ficha() {
  const { especie } = useLocalSearchParams<{ especie: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const paleta = useCores();
  const cores = coresDeRaridade(paleta);
  const user = useSession((s) => s.user);

  const [capturas, setCapturas] = useState<CatchRow[]>([]);
  const species = especie ? getSpecies(especie) : undefined;

  useFocusEffect(
    useCallback(() => {
      if (!user?.id || !especie) return;
      let vivo = true;
      listCatchesOfSpecies(user.id, especie).then((lista) => {
        if (vivo) setCapturas(lista);
      });
      return () => {
        vivo = false;
      };
    }, [user?.id, especie]),
  );

  if (!species) {
    return (
      <View className="flex-1 items-center justify-center bg-fundo px-8">
        <Text className="text-center font-corpo text-[16px] text-suave">Espécie não encontrada no catálogo.</Text>
      </View>
    );
  }

  const arte = getIlustracao(species.id);
  const foto = getFoto(species.id);
  const credito = CREDITOS.find((c) => c.especie === species.commonName);
  const rar = cores[species.rarity];
  const melhor = personalBest(capturas);
  const primeira = capturas.length > 0 ? capturas[capturas.length - 1] : undefined;

  return (
    <ScrollView
      className="flex-1 bg-fundo"
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      {/*
        A ilustração primeiro, grande, com a moldura da raridade: é a carta do álbum em tamanho de
        ficha. A foto de verdade vem depois, como referência — ver o painel no fim da tela.
      */}
      <View className="items-center px-5 pt-4">
        <View
          className="w-full items-center justify-center overflow-hidden rounded-carta bg-elevado"
          style={{ aspectRatio: 16 / 10, borderWidth: 4, borderColor: rar }}
        >
          {arte ? (
            <Image source={arte} className="h-full w-full" resizeMode="contain" />
          ) : (
            <Text className="font-corpo text-[14px] text-suave">Sem ilustração desta espécie</Text>
          )}
        </View>
      </View>

      <View className="px-5 pt-4">
        <Text className="font-display text-[28px] leading-[32px] tracking-[-0.02em] text-texto">
          {species.commonName}
        </Text>
        <Text className="font-cientifico text-[17px] text-suave">{species.scientificName}</Text>

        <View className="mt-3 flex-row flex-wrap gap-1.5">
          <Etiqueta cor={rar}>
            {RARITY_LABEL[species.rarity]} · {RARITY_POINTS[species.rarity]} pts
          </Etiqueta>
          {species.habitat.map((h) => (
            <Etiqueta key={h}>{h}</Etiqueta>
          ))}
        </View>

        {species.fact ? (
          <Text className="mt-4 max-w-[620px] font-corpo text-[16px] leading-[24px] text-suave">
            {species.fact}
          </Text>
        ) : null}

        <View className="mt-5 rounded-painel border border-borda bg-superficie px-4">
          <Linha rotulo="Eixo de medida" valor={measureLabel(species)} />
          <Linha rotulo="Tamanho típico" valor={`${species.avgLengthCm} cm`} />
          <Linha rotulo="Máximo registrado" valor={`${species.maxLengthCm} cm`} />
          <Linha
            rotulo="Seu recorde"
            valor={melhor ? rotuloRecorde(melhor.lengthCm, melhor.weightG) : '—'}
            destaque={Boolean(melhor)}
          />
          <Linha
            rotulo="Você já pegou"
            valor={capturas.length === 0 ? 'nenhuma vez' : `${capturas.length}×`}
          />
          <Linha
            rotulo="Primeira captura"
            valor={primeira ? formatarData(primeira.caughtAt) : '—'}
            ultima
          />
        </View>

        {/*
          A foto de referência — o lugar onde a foto de verdade continua existindo.

          Ela sai da carta e fica aqui porque serve a outra coisa: a ilustração diz "é esta espécie
          do álbum", a foto diz "é com isto que o bicho se parece na água". Quem abre a ficha com o
          peixe na mão está justamente comparando, e é por isso que ela vem em cor mesmo com a
          carta trancada.
        */}
        {foto ? (
          <View className="mt-5 overflow-hidden rounded-painel border border-borda bg-superficie">
            <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
              <Text className="font-corpo-forte text-[12px] uppercase tracking-[0.12em] text-suave">
                Foto de referência
              </Text>
              <Pressable onPress={() => router.push('/creditos')} hitSlop={8} className="active:opacity-60">
                <Text className="font-corpo-forte text-[12px] text-acao">Créditos</Text>
              </Pressable>
            </View>
            <Image source={foto} style={{ width: '100%', aspectRatio: 4 / 3 }} resizeMode="cover" />
            {credito ? (
              <Text className="px-4 pb-3 pt-2 font-corpo text-[11.5px] leading-[16px] text-apoio">
                {credito.autor} · {credito.licenca}
              </Text>
            ) : null}
          </View>
        ) : null}

        {capturas.length === 0 ? (
          <View className="mt-4 rounded-painel border border-dashed border-borda-forte p-4">
            <Text className="font-corpo text-[14px] leading-[20px] text-suave">
              Carta ainda trancada. Ela abre na primeira captura confirmada desta espécie — e não
              volta a fechar, mesmo se você apagar o registro depois.
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function rotuloRecorde(cm: number, gramas: number | null): string {
  const peso = weightLabel(gramas, null);
  const medida = Number.isInteger(cm) ? String(cm) : cm.toFixed(1).replace('.', ',');
  return peso ? `${medida} cm · ${peso}` : `${medida} cm`;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function Linha({
  rotulo,
  valor,
  destaque,
  ultima,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
  ultima?: boolean;
}) {
  return (
    <View
      className={
        ultima
          ? 'flex-row items-center justify-between py-2.5'
          : 'flex-row items-center justify-between border-b border-borda py-2.5'
      }
    >
      <Text className="font-corpo text-[14px] text-suave">{rotulo}</Text>
      <Text
        className={destaque ? 'font-display text-[15px] text-acao' : 'font-display-medio text-[15px] text-texto'}
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {valor}
      </Text>
    </View>
  );
}

function Etiqueta({ children, cor }: { children: React.ReactNode; cor?: string }) {
  return (
    <View
      className="h-7 justify-center rounded-full border border-borda-forte bg-elevado px-2.5"
      style={cor ? { borderColor: cor } : undefined}
    >
      <Text
        className="font-corpo-forte text-[12px] text-suave"
        style={cor ? { color: cor } : undefined}
      >
        {children}
      </Text>
    </View>
  );
}
