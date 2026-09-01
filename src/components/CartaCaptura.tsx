import { Image, Pressable, Text, View } from 'react-native';

import { getSpecies, RARITY_LABEL } from '@/catalog';
import type { CatchRow } from '@/db/schema';
import { isTrophy, weightLabel } from '@/domain/weight';
import { coresDeRaridade, useCores } from '@/theme';

/**
 * A captura como carta.
 *
 * É o mesmo objeto da grade do álbum, deitado: moldura na cor da raridade, gema no canto, arte
 * ocupando a largura inteira e uma faixa embaixo. Antes isto era uma linha de lista com miniatura
 * de 64px — cabiam sete por tela e nenhuma dava vontade de olhar, o que é um problema num app
 * cujo conteúdo *é* a foto do peixe.
 *
 * A moldura repete a informação da bolinha de raridade de propósito: cor nunca carrega dado
 * sozinha, e o rótulo escrito continua ali no rodapé do card.
 */
export function CartaCaptura({
  row,
  recorde,
  quantas,
  onPress,
}: {
  row: CatchRow;
  /** Esta captura é a maior daquela espécie? Vem de `listPersonalBests`, não do que está na tela. */
  recorde?: boolean;
  quantas?: number;
  /** Abre a correção. Sem isto o card é só leitura. */
  onPress?: () => void;
}) {
  const paleta = useCores();
  const cores = coresDeRaridade(paleta);

  const species = row.speciesId ? getSpecies(row.speciesId) : undefined;
  const rar = species ? cores[species.rarity] : paleta.suave;
  const peso = weightLabel(row.weightG, row.weightEstG);
  const trofeu = species ? isTrophy(row.lengthCm, species) : false;

  const data = new Date(row.caughtAt);
  const quando = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityLabel={`${species ? species.commonName : 'Captura não identificada'}, ${row.lengthCm} cm`}
      className="mx-5 mt-3 overflow-hidden rounded-2xl bg-superficie active:opacity-80"
      style={{ borderWidth: 2, borderColor: rar }}
    >
      <View className="h-32 w-full bg-elevado">
        <Image source={{ uri: row.photoLocal }} className="h-full w-full" resizeMode="cover" />

        {/* Selo só aparece quando há o que dizer. Troféu ganha de recorde: é o mais raro dos dois. */}
        {trofeu || recorde ? (
          <View className="absolute left-2 top-2 rounded-full bg-destaque px-2.5 py-1">
            <Text className="text-[10px] font-extrabold uppercase tracking-wide text-destaque-texto">
              {trofeu ? 'Troféu' : 'Recorde'}
            </Text>
          </View>
        ) : null}

        <View
          className="absolute right-2 top-2 h-2.5 w-2.5 rotate-45"
          style={{ backgroundColor: rar, borderWidth: 1.5, borderColor: paleta.superficie }}
        />

        {quantas && quantas > 1 ? (
          <View className="absolute bottom-2 right-2 rounded-md bg-cobalto px-1.5 py-0.5">
            <Text className="text-[10px] font-semibold text-superficie">{quantas}×</Text>
          </View>
        ) : null}
      </View>

      <View className="px-3 pb-3 pt-2">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <Text className="text-base font-extrabold tracking-tight text-texto" numberOfLines={1}>
              {species ? species.commonName : 'Não identificado'}
            </Text>
            {species ? (
              <Text className="text-[11px] italic text-suave" numberOfLines={1}>
                {species.scientificName}
              </Text>
            ) : null}
          </View>

          <View className="items-end">
            <Text className="text-2xl font-extrabold tracking-tighter text-cobalto">
              {formatarMedida(row.lengthCm)}
              <Text className="text-[11px] font-semibold text-suave"> cm</Text>
            </Text>
            {peso ? <Text className="text-[11px] text-suave">{peso}</Text> : null}
          </View>
        </View>

        <View className="mt-2 flex-row flex-wrap items-center gap-1">
          {species ? (
            <Etiqueta cor={rar}>{RARITY_LABEL[species.rarity]}</Etiqueta>
          ) : null}
          {row.placeLabel ? <Etiqueta>{row.placeLabel}</Etiqueta> : null}
          <Etiqueta>{`${quando} · ${hora}`}</Etiqueta>
          {row.released ? <Etiqueta>solto</Etiqueta> : null}
        </View>
      </View>
    </Pressable>
  );
}

/** Sem casas decimais quando é número redondo: "42 cm" e não "42,0 cm". */
function formatarMedida(cm: number): string {
  return Number.isInteger(cm) ? String(cm) : cm.toFixed(1).replace('.', ',');
}

function Etiqueta({ children, cor }: { children: React.ReactNode; cor?: string }) {
  return (
    <View
      className="rounded-full border border-borda px-2 py-0.5"
      style={cor ? { borderColor: cor } : undefined}
    >
      <Text className="text-[10px] font-semibold text-suave" style={cor ? { color: cor } : undefined}>
        {children}
      </Text>
    </View>
  );
}
