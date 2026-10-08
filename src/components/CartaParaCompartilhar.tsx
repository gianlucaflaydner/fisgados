import { forwardRef } from 'react';
import { Image, Text, View } from 'react-native';

import { getSpecies } from '@/catalog';
import type { CatchRow } from '@/db/schema';
import { weightLabel } from '@/domain/weight';
import { coresDeRaridade, PALETA } from '@/theme';

/** O lado da imagem gerada. 1080 é o que o WhatsApp e o Instagram esperam. */
export const LADO_DO_CARD = 1080;

/**
 * A captura como imagem para mandar no grupo — F12.
 *
 * Esta carta não é a do histórico: é uma imagem fixa de 1080×1080 que sai do app e vive no
 * WhatsApp de outra pessoa. Por isso ela **não** usa o tema do aparelho. Quem recebe não escolheu
 * tema nenhum, e um card claro no fundo branco do WhatsApp sumiria — vai sempre na Água Funda,
 * que é a identidade do app e o que se lê em qualquer conversa.
 *
 * Pelo mesmo motivo os tamanhos são absolutos e não responsivos: o alvo tem um tamanho só, e o
 * `view-shot` fotografa exatamente este retângulo.
 *
 * O que entra é o que o pescador contaria: a foto, a espécie, a medida, o lugar e a data. O que
 * não entra é a coordenada — ela nunca sai do aparelho (RN09), muito menos numa imagem que vai
 * para um grupo.
 */
export const CartaParaCompartilhar = forwardRef<View, { row: CatchRow; nome: string }>(
  function CartaParaCompartilhar({ row, nome }, ref) {
    const cores = PALETA.escuro;
    const species = row.speciesId ? getSpecies(row.speciesId) : undefined;
    const moldura = species ? coresDeRaridade(cores)[species.rarity] : cores.borda;
    const peso = weightLabel(row.weightG, row.weightEstG);
    const data = new Date(row.caughtAt);

    return (
      <View
        ref={ref}
        collapsable={false}
        style={{
          width: LADO_DO_CARD,
          height: LADO_DO_CARD,
          backgroundColor: cores.fundo,
          padding: 48,
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1, borderRadius: 40, padding: 10, backgroundColor: moldura }}>
          <View style={{ flex: 1, borderRadius: 32, overflow: 'hidden', backgroundColor: cores.superficie }}>
            <View style={{ flex: 1, backgroundColor: cores.elevado }}>
              <Image source={{ uri: row.photoLocal }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              {row.placeLabel ? (
                <View
                  style={{
                    position: 'absolute',
                    left: 28,
                    top: 28,
                    backgroundColor: 'rgba(7,20,23,0.82)',
                    borderRadius: 999,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                  }}
                >
                  <Text style={{ color: cores.texto, fontFamily: 'InstrumentSans_600SemiBold', fontSize: 26 }}>
                    {row.placeLabel}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={{ padding: 32, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text
                      numberOfLines={1}
                      style={{ color: cores.texto, fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 54 }}
                    >
                      {species ? species.commonName : 'Não identificado'}
                    </Text>
                    {species ? (
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          backgroundColor: moldura,
                          borderRadius: 5,
                          transform: [{ rotate: '45deg' }],
                        }}
                      />
                    ) : null}
                  </View>
                  {species ? (
                    <Text
                      numberOfLines={1}
                      style={{ color: cores.suave, fontFamily: 'InstrumentSerif_400Regular_Italic', fontSize: 34 }}
                    >
                      {species.scientificName}
                    </Text>
                  ) : null}
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={{
                      color: cores.texto,
                      fontFamily: 'BricolageGrotesque_800ExtraBold',
                      fontSize: 86,
                      lineHeight: 86,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {formatar(row.lengthCm)}
                    <Text style={{ fontSize: 34, color: cores.suave }}> cm</Text>
                  </Text>
                  {peso ? (
                    <Text style={{ color: cores.apoio, fontFamily: 'InstrumentSans_400Regular', fontSize: 28 }}>
                      {peso}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        </View>

        <View
          style={{
            marginTop: 28,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text style={{ color: cores.texto, fontFamily: 'BricolageGrotesque_700Bold', fontSize: 32 }}>
              {nome}
            </Text>
            <Text style={{ color: cores.apoio, fontFamily: 'InstrumentSans_400Regular', fontSize: 26 }}>
              {data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {row.released ? (
              <View
                style={{
                  backgroundColor: cores.lendario,
                  borderRadius: 12,
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  transform: [{ rotate: '-3deg' }],
                }}
              >
                <Text style={{ color: '#2A1C00', fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 22 }}>
                  DEVOLVIDO À ÁGUA
                </Text>
              </View>
            ) : null}
            <Text style={{ color: cores.destaque, fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 38 }}>
              Fisgados
            </Text>
          </View>
        </View>
      </View>
    );
  },
);

function formatar(cm: number): string {
  return Number.isInteger(cm) ? String(cm) : cm.toFixed(1).replace('.', ',');
}
