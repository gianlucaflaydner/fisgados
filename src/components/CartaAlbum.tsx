import { Image, Pressable, Text, View } from 'react-native';

import type { Species } from '@/catalog';
import { getFoto } from '@/catalog/fotos';
import { Silhueta } from './Icone';
import { Gema } from './ui';
import { coresDeRaridade, useCores } from '@/theme';

/**
 * A carta da grade do álbum.
 *
 * Aberta e trancada são **objetos diferentes**, e isso é a mudança que o guia pede: a aberta tem
 * moldura na cor da raridade, foto e sombra, como figurinha colada; a trancada é um espaço vazio
 * de borda pontilhada, com a silhueta do peixe e o nome visível. Antes as duas eram a mesma arte
 * em escala de cinza, o que deixava a página inteira parecendo uma grade de fotos apagadas em vez
 * de um álbum com lacunas.
 *
 * O nome fica legível na trancada de propósito: a carta vazia precisa dizer **o que procurar** —
 * é ela que puxa para a próxima pescaria.
 *
 * O número ("Nº 07") é a posição no álbum, igual para todo mundo, para que "me falta a 47" queira
 * dizer alguma coisa.
 */
export function CartaAlbum({
  species,
  numero,
  aberta,
  recordeCm,
  onPress,
}: {
  species: Species;
  numero: number;
  aberta: boolean;
  recordeCm?: number;
  onPress: () => void;
}) {
  const paleta = useCores();
  const rar = coresDeRaridade(paleta)[species.rarity];
  const foto = getFoto(species.id);
  const n = String(numero).padStart(2, '0');

  if (!aberta) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityLabel={`${species.commonName}, ainda não fisgada`}
        className="flex-1 rounded-[14px] p-[3px] active:opacity-70"
        style={{ backgroundColor: paleta.campo, borderWidth: 1.5, borderStyle: 'dashed', borderColor: paleta.borda }}
      >
        <View className="items-center justify-center" style={{ height: 101 }}>
          <Silhueta largura={60} cor={paleta.elevado} />
          <Text
            className="absolute left-1.5 top-1 font-display text-[10px] text-apoio"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            Nº {n}
          </Text>
        </View>
        <View className="px-1.5 pb-2 pt-1.5">
          <Text className="font-corpo-forte text-[12px] text-apoio" numberOfLines={1}>
            {species.commonName}
          </Text>
          <Text className="mt-0.5 font-corpo text-[11px] text-apoio/80">não fisgada</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`${species.commonName}, fisgada`}
      className="flex-1 rounded-[14px] p-[3px] active:opacity-80"
      style={{
        backgroundColor: rar,
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }}
    >
      <View className="overflow-hidden rounded-[11px] bg-superficie">
        <View style={{ height: 104 }} className="bg-elevado">
          {foto ? (
            <Image source={foto} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Silhueta largura={52} cor={paleta.borda} />
            </View>
          )}

          <View className="absolute left-1.5 top-1.5 rounded-md bg-fundo/85 px-1.5 py-0.5">
            <Text className="font-display text-[10px] text-texto" style={{ fontVariant: ['tabular-nums'] }}>
              Nº {n}
            </Text>
          </View>

          <View className="absolute right-1.5 top-1.5">
            <Gema raridade={species.rarity} tamanho={9} contorno />
          </View>
        </View>

        <View className="px-2 pb-2 pt-1.5">
          <Text className="font-display text-[13px] text-texto" numberOfLines={1}>
            {species.commonName}
          </Text>
          {recordeCm ? (
            <Text className="font-display-medio text-[12px] text-suave" style={{ fontVariant: ['tabular-nums'] }}>
              {formatarCm(recordeCm)} cm
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/** Sem casa decimal quando é redondo: "42 cm", não "42,0 cm". */
function formatarCm(cm: number): string {
  return Number.isInteger(cm) ? String(cm) : cm.toFixed(1).replace('.', ',');
}
