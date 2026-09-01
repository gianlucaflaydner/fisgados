import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getSpecies, RARITY_LABEL, RARITY_POINTS } from '@/catalog';
import { getFoto } from '@/catalog/fotos';
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
        <Text className="text-center text-base text-suave">Espécie não encontrada no catálogo.</Text>
      </View>
    );
  }

  const foto = getFoto(species.id);
  const rar = cores[species.rarity];
  const melhor = personalBest(capturas);
  const primeira = capturas.length > 0 ? capturas[capturas.length - 1] : undefined;

  return (
    <ScrollView
      className="flex-1 bg-fundo"
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      <View className="items-center px-5 pt-4">
        <View
          className="w-full overflow-hidden rounded-2xl bg-elevado"
          style={{ aspectRatio: 3 / 4, maxHeight: 300, borderWidth: 2, borderColor: rar }}
        >
          {foto ? (
            <Image source={foto} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Text className="text-sm text-suave">Sem foto desta espécie</Text>
            </View>
          )}
        </View>
      </View>

      <View className="px-5 pt-4">
        <Text className="text-2xl font-extrabold tracking-tight text-texto">
          {species.commonName}
        </Text>
        <Text className="text-sm italic text-suave">{species.scientificName}</Text>

        <View className="mt-3 flex-row flex-wrap gap-1.5">
          <Etiqueta cor={rar}>
            {RARITY_LABEL[species.rarity]} · {RARITY_POINTS[species.rarity]} pts
          </Etiqueta>
          {species.habitat.map((h) => (
            <Etiqueta key={h}>{h}</Etiqueta>
          ))}
        </View>

        {species.fact ? (
          <Text className="mt-4 max-w-[620px] text-[15px] leading-6 text-suave">
            {species.fact}
          </Text>
        ) : null}

        <View className="mt-5 rounded-2xl border border-borda bg-superficie px-4">
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

        {capturas.length === 0 ? (
          <View className="mt-4 rounded-2xl border border-dashed border-borda p-4">
            <Text className="text-sm leading-5 text-suave">
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
      <Text className="text-sm text-suave">{rotulo}</Text>
      <Text
        className={destaque ? 'text-sm font-bold text-cobalto' : 'text-sm font-semibold text-texto'}
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
      className="rounded-full border border-borda px-2.5 py-0.5"
      style={cor ? { borderColor: cor } : undefined}
    >
      <Text
        className="text-[11px] font-semibold text-suave"
        style={cor ? { color: cor } : undefined}
      >
        {children}
      </Text>
    </View>
  );
}
