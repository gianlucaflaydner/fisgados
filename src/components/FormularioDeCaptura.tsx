import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import type { Species } from '@/catalog';
import { getIlustracao } from '@/catalog/ilustracoes';
import { CampoLocal } from './CampoLocal';
import { Icone } from './Icone';
import { BotaoIcone, Campo, CampoDeMedida, Rotulo, Segmentado } from './ui';
import { estimateWeightG, measureLabel, weightLabel } from '@/domain/weight';
import { coresDeRaridade, useCores } from '@/theme';

/**
 * O formulário da captura — registrar e corrigir usam **este** arquivo.
 *
 * Eram duas telas com os mesmos campos escritos duas vezes, e isso era dívida reconhecida: o
 * primeiro campo novo ia entrar num lado e esquecer o outro. Agora quem corrige vê exatamente a
 * tela que preencheu, porque é a mesma.
 *
 * O desenho vem do guia: a foto ocupa o topo inteiro, com a data por cima e um degradê que a
 * entrega ao fundo da tela; os campos vêm abaixo, com a medida em destaque; a ação fica numa
 * barra fixa no pé, sobre degradê, sempre no mesmo lugar.
 */
export interface ValoresDaCaptura {
  species: Species | undefined;
  lengthCm: string;
  weightG: string;
  placeLabel: string;
  released: boolean;
}

interface Props extends ValoresDaCaptura {
  titulo: string;
  fotoUri: string | null;
  /** ISO 8601 ou Date da captura. Fica por cima da foto — é o que a pessoa confere. */
  quando: Date | null;
  onVoltar: () => void;
  onEscolherEspecie: () => void;
  onMudar: (patch: Partial<Omit<ValoresDaCaptura, 'species'>>) => void;
  userId: string | undefined;
  /** Sugestões da IA, embaixo do campo de espécie. */
  sugestaoDeEspecie?: ReactNode;
  /** Estimativa de tamanho, embaixo do campo de medida. */
  sugestaoDeMedida?: ReactNode;
  /** Linha extra embaixo da foto — "Trocar foto" no registro, aviso no modo correção. */
  sobreAFoto?: ReactNode;
  /** A barra fixa do pé: o botão principal e o que mais houver. */
  acoes: ReactNode;
  /** Fim do formulário: excluir, por exemplo. */
  rodape?: ReactNode;
}

const ALTURA_DA_FOTO = 270;

export function FormularioDeCaptura({
  titulo,
  fotoUri,
  quando,
  species,
  lengthCm,
  weightG,
  placeLabel,
  released,
  onVoltar,
  onEscolherEspecie,
  onMudar,
  userId,
  sugestaoDeEspecie,
  sugestaoDeMedida,
  sobreAFoto,
  acoes,
  rodape,
}: Props) {
  const insets = useSafeAreaInsets();
  const paleta = useCores();
  const medida = Number(lengthCm.replace(',', '.'));
  const pesoEstimado =
    species && Number.isFinite(medida) && medida > 0 ? estimateWeightG(medida, species) : null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-fundo">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ height: ALTURA_DA_FOTO }} className="bg-elevado">
          {fotoUri ? <Image source={{ uri: fotoUri }} className="h-full w-full" resizeMode="cover" /> : null}

          {/*
            O degradê não é enfeite: sem ele o botão de voltar desaparece em foto clara e a foto
            termina num corte reto no meio da tela, como se tivesse sido cortada por engano.
          */}
          <View
            className="absolute inset-x-0 top-0 h-28"
            style={{ backgroundColor: 'rgba(7,20,23,0.45)' }}
          />
          <DegradeParaBaixo cor={paleta.fundo} />

          <View
            className="absolute inset-x-4 flex-row items-center gap-3"
            style={{ top: insets.top + 6 }}
          >
            <BotaoIcone nome="voltar" rotulo="Voltar" onPress={onVoltar} sobreFoto />
            <Text className="font-display text-[20px]" style={{ color: '#EEF2EA' }} numberOfLines={1}>
              {titulo}
            </Text>
          </View>

          {quando ? (
            <View className="absolute inset-x-5 bottom-1.5 flex-row items-center gap-2">
              <Icone nome="relogio" tamanho={14} cor="#C9D6D2" />
              <Text className="font-corpo-forte text-[13px]" style={{ color: '#C9D6D2' }}>
                {dataLonga(quando)}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="gap-4 px-5 pt-2.5">
          {sobreAFoto}

          <View className="gap-2">
            <Rotulo>Espécie</Rotulo>
            <Pressable
              onPress={onEscolherEspecie}
              accessibilityRole="button"
              className="h-[72px] flex-row items-center gap-3.5 rounded-botao px-3.5 active:opacity-70"
              style={{ backgroundColor: paleta.campo, borderWidth: 1.5, borderColor: paleta.borda }}
            >
              {species ? <MiniCarta species={species} /> : null}
              <View className="min-w-0 flex-1">
                <Text
                  className={species ? 'font-display text-[18px] text-texto' : 'font-corpo-forte text-[16px] text-suave'}
                  numberOfLines={1}
                >
                  {species ? species.commonName : 'Escolher espécie'}
                </Text>
                {species ? (
                  <Text className="font-cientifico text-[15px] text-suave" numberOfLines={1}>
                    {species.scientificName}
                  </Text>
                ) : (
                  <Text className="font-corpo text-[13px] text-apoio">84 espécies do Sul, com ilustração</Text>
                )}
              </View>
              <Text className="font-corpo-forte text-[14px] text-acao">{species ? 'Trocar' : 'Ver lista'}</Text>
            </Pressable>
            {sugestaoDeEspecie}
          </View>

          <CampoDeMedida
            rotulo={species ? measureLabel(species) : 'Comprimento'}
            valor={lengthCm}
            onChange={(v) => onMudar({ lengthCm: v })}
            dica={
              pesoEstimado !== null ? (
                <View className="flex-row items-center gap-1.5">
                  <Icone nome="balanca" tamanho={14} cor={paleta.suave} />
                  <Text className="font-corpo text-[13px] text-suave">
                    ≈ <Text className="font-corpo-forte text-texto">{weightLabel(null, pesoEstimado)?.replace('≈ ', '')}</Text>{' '}
                    pelo comprimento
                  </Text>
                </View>
              ) : species && !species.lengthWeight ? (
                <Text className="font-corpo text-[12.5px] leading-[18px] text-apoio">
                  Esta espécie não tem estimativa de peso — informe o peso real se quiser registrar.
                </Text>
              ) : undefined
            }
          />

          {sugestaoDeMedida}

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Campo
                rotulo="Peso real"
                opcional
                value={weightG}
                onChangeText={(v) => onMudar({ weightG: v })}
                keyboardType="decimal-pad"
                placeholder="0,0"
                sufixo="kg"
              />
            </View>
            <View className="flex-1 gap-2">
              <Rotulo>Destino</Rotulo>
              <Segmentado
                opcoes={[
                  { id: 'solto', rotulo: 'Solto' },
                  { id: 'levado', rotulo: 'Levado' },
                ]}
                valor={released ? 'solto' : 'levado'}
                onChange={(v) => onMudar({ released: v === 'solto' })}
              />
            </View>
          </View>

          <View className="gap-2">
            <Rotulo opcional>Local</Rotulo>
            <CampoLocal valor={placeLabel} onChange={(v) => onMudar({ placeLabel: v })} userId={userId} />
          </View>

          {rodape}
        </View>
      </ScrollView>

      <View
        className="absolute inset-x-0 bottom-0 px-5 pt-6"
        style={{ paddingBottom: insets.bottom + 14, backgroundColor: paleta.fundo }}
      >
        {acoes}
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * O degradê que entrega a foto ao fundo da tela.
 *
 * São seis faixas de opacidade crescente em vez de um `LinearGradient`: a diferença não se vê em
 * 96 px de altura, e é uma dependência nativa a menos para carregar por causa de um detalhe de
 * acabamento.
 */
function DegradeParaBaixo({ cor }: { cor: string }) {
  const faixas = [0.05, 0.15, 0.3, 0.5, 0.75, 1];
  return (
    <View className="absolute inset-x-0 bottom-0 h-24 flex-col">
      {faixas.map((o, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: cor, opacity: o }} />
      ))}
    </View>
  );
}

/** A espécie escolhida como mini-carta, com a moldura da raridade. Lembra que isto é um álbum. */
function MiniCarta({ species }: { species: Species }) {
  const paleta = useCores();
  const arte = getIlustracao(species.id);
  return (
    <View
      className="h-[46px] w-[62px] rounded-selo p-0.5"
      style={{ backgroundColor: coresDeRaridade(paleta)[species.rarity] }}
    >
      <View className="h-full overflow-hidden rounded-[6px] bg-elevado">
        {arte ? <Image source={arte} className="h-full w-full" resizeMode="contain" /> : null}
      </View>
    </View>
  );
}

/** Data por extenso, com hora: a hora importa para as insígnias e é o que o usuário confere. */
function dataLonga(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
