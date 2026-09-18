import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getSpecies, type Species } from '@/catalog';
import { Desbloqueio } from '@/components/Desbloqueio';
import { saveCatch } from '@/db/queries';
import { checkMeasure, estimateWeightG, measureLabel, weightLabel } from '@/domain/weight';
import { fotoDaGaleria } from '@/media/photo';
import { useDraft } from '@/stores/draft';
import { userIdAtual } from '@/stores/session';
import { useCores } from '@/theme';

export default function Detalhes() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const draft = useDraft();
  const cores = useCores();
  const [salvando, setSalvando] = useState(false);
  const [trocandoFoto, setTrocandoFoto] = useState(false);

  /**
   * Trocar a foto sem perder o resto do formulário.
   *
   * Foto da galeria reabre a galeria direto, e a escolhida segue para o enquadramento — foto nova
   * precisa ser enquadrada de novo, senão a carta sai cortada no centro. Foto da câmera volta para
   * a câmera. Nos dois casos espécie, medida, peso e local ficam no rascunho, intactos.
   */
  async function trocarFoto() {
    if (salvando || trocandoFoto) return;
    if (draft.origemFoto !== 'galeria') {
      router.replace('/captura/camera');
      return;
    }

    setTrocandoFoto(true);
    try {
      const foto = await fotoDaGaleria();
      if (!foto) return;
      draft.set({
        fotoBruta: { uri: foto.uri, largura: foto.largura, altura: foto.altura },
        origemFoto: 'galeria',
        caughtAt: foto.capturadaEm ?? new Date(),
      });
      router.replace('/captura/enquadrar');
    } catch {
      Alert.alert('Não deu para abrir a galeria', 'Tente de novo.');
    } finally {
      setTrocandoFoto(false);
    }
  }
  // A cena de desbloqueio segura a navegação: sair antes de mostrá-la desperdiçaria o único
  // momento de recompensa do app.
  const [aberta, setAberta] = useState<{ species: Species; trofeu: boolean } | null>(null);

  const species = draft.speciesId ? getSpecies(draft.speciesId) : undefined;
  const medida = Number(draft.lengthCm.replace(',', '.'));

  /*
   * GPS em segundo plano, sob demanda e silencioso (F06 e requisito de bateria).
   * Se o usuário negar, o registro segue sem local — localização nunca bloqueia o fluxo.
   *
   * Só vale para foto tirada agora. Numa foto da galeria, "onde o celular está" é a sala de
   * casa, não o açude: gravar isso seria inventar um dado com cara de medido.
   */
  useEffect(() => {
    if (draft.origemFoto !== 'camera') return;
    let vivo = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getLastKnownPositionAsync();
      const usar = pos ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      if (vivo && usar) {
        useDraft.getState().set({ lat: usar.coords.latitude, lng: usar.coords.longitude });
      }
    })().catch(() => {
      // Sem GPS o registro continua. Não há mensagem de erro de propósito.
    });
    return () => {
      vivo = false;
    };
  }, [draft.origemFoto]);

  const pesoEstimado = useMemo(() => {
    if (!species || !Number.isFinite(medida) || medida <= 0) return null;
    return estimateWeightG(medida, species);
  }, [species, medida]);

  const pesoReal = draft.weightG.trim().length > 0 ? Number(draft.weightG.replace(',', '.')) : null;

  async function salvar() {
    if (salvando) return;
    if (!draft.photoUri) {
      Alert.alert('Falta a foto', 'Volte e fotografe a captura.');
      return;
    }

    const check = checkMeasure(medida, species ?? null);
    if (!check.ok) {
      if (check.kind === 'fora-do-limite') {
        Alert.alert('Medida inválida', check.message);
        return;
      }
      // RN04: fora da faixa da espécie pode ser o peixe da vida do sujeito. Avisa e deixa salvar.
      const confirmou = await new Promise<boolean>((resolve) => {
        Alert.alert('Conferir medida', check.message, [
          { text: 'Corrigir', style: 'cancel', onPress: () => resolve(false) },
          { text: 'É isso mesmo', onPress: () => resolve(true) },
        ]);
      });
      if (!confirmou) return;
    }

    setSalvando(true);
    try {
      const r = await saveCatch({
        userId: userIdAtual(),
        speciesId: draft.speciesId,
        lengthCm: medida,
        weightG: pesoReal !== null && Number.isFinite(pesoReal) ? pesoReal * 1000 : null,
        photoLocal: draft.photoUri,
        lat: draft.lat,
        lng: draft.lng,
        placeLabel: draft.placeLabel.trim() || null,
        released: draft.released,
        caughtAt: draft.caughtAt,
        offlineOrigin: false,
        });

      if (r.unlocked && species) {
        setAberta({ species, trofeu: r.trophy });
        return;
      }
      if (r.trophy && species) {
        Alert.alert('Exemplar de troféu', `Esse ${species.commonName} está entre os grandes.`);
      }

      concluir();
    } finally {
      setSalvando(false);
    }
  }

  /** Fecha o rascunho e volta para a home. Único caminho de saída depois de salvar. */
  function concluir() {
    useDraft.getState().reset();
    router.dismissAll();
    router.replace('/');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-fundo"
    >
      {aberta ? (
        <Desbloqueio
          species={aberta.species}
          trofeu={aberta.trofeu}
          onFechar={concluir}
          onVerCarta={() => {
            const id = aberta.species.id;
            useDraft.getState().reset();
            router.dismissAll();
            router.replace({ pathname: '/album/[especie]', params: { especie: id } });
          }}
        />
      ) : null}
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/*
          A prévia respeita o 3:4 do enquadramento. Uma faixa "cover" de largura cheia recortaria
          de novo o que a pessoa acabou de enquadrar — e o peixe sairia pela metade outra vez.
        */}
        {draft.photoUri ? (
          <View className="items-center pt-4">
            <Image
              source={{ uri: draft.photoUri }}
              style={{ aspectRatio: 3 / 4, height: 240 }}
              className="rounded-2xl bg-elevado"
              resizeMode="cover"
            />
            <Pressable
              onPress={trocarFoto}
              disabled={salvando || trocandoFoto}
              hitSlop={8}
              accessibilityRole="button"
              className="mt-3 rounded-full border border-borda px-4 py-1.5 active:opacity-60"
            >
              <Text className="text-sm font-semibold text-cobalto">
                {trocandoFoto ? 'Abrindo a galeria...' : 'Trocar foto'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View className="px-5 pt-4">
          <Text className="text-xs text-suave">
            {dataLonga(draft.caughtAt)}
            {draft.origemFoto === 'galeria' ? ' · foto da galeria' : ''}
          </Text>
        </View>

        <View className="px-5 pt-1">
          <Campo rotulo="Espécie">
            <Pressable
              onPress={() => router.push('/captura/especie')}
              className="rounded-2xl border border-borda bg-superficie px-4 py-3 active:opacity-70"
            >
              <Text className={species ? 'text-base text-texto' : 'text-base text-suave'}>
                {species ? species.commonName : draft.speciesId === null && draft.lengthCm ? 'Não identificado' : 'Escolher espécie'}
              </Text>
              {species ? (
                <Text className="mt-0.5 text-xs italic text-suave">{species.scientificName}</Text>
              ) : null}
            </Pressable>
          </Campo>

          <Campo rotulo={`${species ? measureLabel(species) : 'Comprimento'} (cm)`}>
            <TextInput
              value={draft.lengthCm}
              onChangeText={(v) => draft.set({ lengthCm: v })}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={cores.suave}
              className="rounded-2xl border border-borda bg-superficie px-4 py-3 text-2xl font-semibold text-texto"
            />
            {pesoEstimado !== null ? (
              <Text className="mt-2 text-sm text-suave">{weightLabel(null, pesoEstimado)}</Text>
            ) : species && !species.lengthWeight ? (
              <Text className="mt-2 text-sm text-suave">
                Sem estimativa de peso para esta espécie — informe o peso real se quiser registrar.
              </Text>
            ) : null}
          </Campo>

          <Campo rotulo="Peso real (kg) — opcional">
            <TextInput
              value={draft.weightG}
              onChangeText={(v) => draft.set({ weightG: v })}
              keyboardType="decimal-pad"
              placeholder="0,0"
              placeholderTextColor={cores.suave}
              className="rounded-2xl border border-borda bg-superficie px-4 py-3 text-base text-texto"
            />
          </Campo>

          <Campo rotulo="Local — opcional">
            <TextInput
              value={draft.placeLabel}
              onChangeText={(v) => draft.set({ placeLabel: v })}
              placeholder="Pesqueiro Recanto, Rio Paranhana..."
              placeholderTextColor={cores.suave}
              className="rounded-2xl border border-borda bg-superficie px-4 py-3 text-base text-texto"
            />
            <Text className="mt-2 text-xs text-suave">
              A coordenada exata fica só no seu aparelho. Amigos veem apenas este rótulo.
            </Text>
          </Campo>

          <View className="mt-5 flex-row items-center justify-between rounded-2xl border border-borda bg-superficie px-4 py-3">
            <Text className="text-base text-texto">Pescado e solto</Text>
            <Switch
              value={draft.released}
              onValueChange={(v) => draft.set({ released: v })}
              trackColor={{ true: cores.destaque, false: cores.borda }}
              thumbColor={cores.superficie}
            />
          </View>
        </View>
      </ScrollView>

      <View
        className="absolute inset-x-0 bottom-0 border-t border-borda bg-fundo px-5 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Pressable
          onPress={salvar}
          disabled={salvando}
          className="items-center rounded-2xl bg-destaque py-4 active:opacity-80"
        >
          <Text className="text-base font-bold text-destaque-texto">
            {salvando ? 'Salvando...' : 'Salvar captura'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <View className="mt-5">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-suave">{rotulo}</Text>
      {children}
    </View>
  );
}
