import { Image, Pressable, Text, View } from 'react-native';

import type { Species } from '@/catalog';
import { getFoto } from '@/catalog/fotos';
import { coresDeRaridade, useCores } from '@/theme';

/**
 * A carta do álbum — 3:4, a mesma proporção da máscara de enquadramento da captura.
 *
 * Trancada e aberta são a **mesma arte**: o que muda é a cor. Um asset por espécie, não dois, e o
 * desbloqueio vira a cor voltando ao desenho — o peixe já estava lá, você é que o revelou. O
 * cinza sai do `filter` nativo do React Native 0.76+, então não custa arquivo extra no bundle.
 *
 * A raridade aparece na moldura **e** na gema do canto, nunca só numa delas: cor sozinha não
 * carrega informação, e trancada a gema apaga junto para não sugerir que a carta está viva.
 */
export function CartaAlbum({
  species,
  numero,
  aberta,
  recordeCm,
  quantas,
  onPress,
}: {
  species: Species;
  /** Posição na grade do álbum, vinda do catálogo. É o que permite dizer "me falta a 47". */
  numero: number;
  aberta: boolean;
  recordeCm?: number;
  quantas?: number;
  onPress: () => void;
}) {
  const paleta = useCores();
  const cores = coresDeRaridade(paleta);
  const rar = cores[species.rarity];
  const foto = getFoto(species.id);

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`${species.commonName}, ${aberta ? 'desbloqueada' : 'não desbloqueada'}`}
      className="flex-1 overflow-hidden rounded-xl bg-superficie active:opacity-80"
      style={{ aspectRatio: 3 / 4, borderWidth: 2, borderColor: aberta ? rar : paleta.borda }}
    >
      <View className="flex-1 bg-elevado">
        {foto ? (
          // O filtro vive na View, não na Image: no React Native `filter` é propriedade de
          // ViewStyle e se aplica à subárvore. Trancada perde a cor, não o desenho — dá para ver
          // que peixe é, e é isso que puxa para a próxima pescaria.
          <View
            className="h-full w-full"
            style={aberta ? undefined : { filter: [{ grayscale: 1 }], opacity: 0.55 }}
          >
            <Image source={foto} className="h-full w-full" resizeMode="cover" />
          </View>
        ) : (
          <View className="h-full w-full items-center justify-center px-1">
            <Text className="text-center text-[9px] text-suave">sem foto</Text>
          </View>
        )}

        <Text
          className="absolute left-1 top-1 rounded bg-superficie/90 px-1 text-[9px] text-suave"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {String(numero).padStart(2, '0')}
        </Text>

        <View
          className="absolute right-1 top-1 h-2 w-2 rotate-45"
          style={{
            backgroundColor: aberta ? rar : paleta.borda,
            borderWidth: 1,
            borderColor: paleta.superficie,
          }}
        />

        {aberta && quantas && quantas > 1 ? (
          <View className="absolute bottom-1 right-1 rounded bg-cobalto px-1">
            <Text className="text-[9px] font-semibold text-superficie">{quantas}×</Text>
          </View>
        ) : null}
      </View>

      <View className="border-t border-borda bg-superficie px-1.5 py-1">
        <Text
          className={aberta ? 'text-[10px] font-bold text-texto' : 'text-[10px] font-semibold text-suave'}
          numberOfLines={1}
        >
          {species.commonName}
        </Text>
        {aberta && recordeCm ? (
          <Text className="text-[9px] text-suave" style={{ fontVariant: ['tabular-nums'] }}>
            {formatarCm(recordeCm)} cm
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Sem casa decimal quando é redondo: "42 cm", não "42,0 cm". */
function formatarCm(cm: number): string {
  return Number.isInteger(cm) ? String(cm) : cm.toFixed(1).replace('.', ',');
}
