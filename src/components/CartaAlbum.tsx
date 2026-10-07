import { Image, Pressable, Text, View } from 'react-native';

import type { Species } from '@/catalog';
import { getIlustracao } from '@/catalog/ilustracoes';
import { Silhueta } from './Icone';
import { Gema } from './ui';
import { coresDeRaridade, useCores } from '@/theme';

/**
 * A carta da grade do álbum.
 *
 * A arte é a **ilustração** da espécie, não a foto. Foto de peixe é foto de um peixe específico,
 * numa mão específica, com um fundo qualquer; a ilustração é a espécie — é o que cabe numa carta
 * de álbum e o que fica igual para todo mundo. A foto continua no app, na ficha da espécie, como
 * referência de campo.
 *
 * Trancada e aberta são a **mesma arte**, e é isso que faz o desbloqueio valer: a ilustração tem
 * fundo transparente, então pintada de uma cor só ela vira a silhueta exata daquele peixe. Dá para
 * ver o formato — bagre de barbilhão, traíra de cabeça grande, arraia de disco — sem ver a cor.
 * Desbloquear é literalmente a cor voltando ao desenho.
 *
 * O nome fica legível na trancada de propósito: a carta vazia precisa dizer **o que procurar**.
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
  const arte = getIlustracao(species.id);
  const n = String(numero).padStart(2, '0');

  if (!aberta) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityLabel={`${species.commonName}, ainda não fisgada`}
        className="flex-1 rounded-[14px] p-[3px] active:opacity-70"
        style={{ backgroundColor: paleta.campo, borderWidth: 1.5, borderStyle: 'dashed', borderColor: paleta.borda }}
      >
        <View className="items-center justify-center" style={{ aspectRatio: 16 / 10 }}>
          {arte ? (
            // `tintColor` pinta a imagem inteira de uma cor só. Com fundo transparente, o que sobra
            // é o contorno da espécie — a silhueta sai da própria arte, sem um segundo arquivo.
            <Image
              source={arte}
              className="h-full w-full"
              resizeMode="contain"
              tintColor={paleta.elevado}
            />
          ) : (
            <Silhueta largura={60} cor={paleta.elevado} />
          )}
          <Text
            className="absolute left-1.5 top-1 font-display text-[10px] text-apoio"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            Nº {n}
          </Text>
        </View>
        <View className="px-1.5 pb-2 pt-1">
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
        <View style={{ aspectRatio: 16 / 10 }} className="items-center justify-center bg-elevado">
          {arte ? (
            <Image source={arte} className="h-full w-full" resizeMode="contain" />
          ) : (
            <Silhueta largura={52} cor={paleta.borda} />
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
