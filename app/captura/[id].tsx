import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { deleteCatch, getCatch, updateCatch } from '@/db/queries';
import { checkMeasure, estimateWeightG, measureLabel, weightLabel } from '@/domain/weight';
import { useEdicao } from '@/stores/edicao';
import { userIdAtual, useSession } from '@/stores/session';
import { useCores } from '@/theme';

/**
 * Corrigir ou apagar uma captura registrada — PRD 7.2.
 *
 * Registrar acontece com o peixe se debatendo na mão, de pé, com pressa. Errar a medida ou a
 * espécie é o caso normal, não a exceção, e até agora não havia como consertar: um 420 no lugar
 * de 42 ficava no histórico para sempre e a carta errada abria sem volta.
 *
 * Os campos são os mesmos de `captura/detalhes`, na mesma ordem, de propósito — quem corrige está
 * relendo a tela que preencheu. As duas telas precisam andar juntas: campo novo lá entra aqui.
 */
export default function EditarCaptura() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cores = useCores();
  const user = useSession((s) => s.user);
  const edicao = useEdicao();

  const [foto, setFoto] = useState<string | null>(null);
  const [caughtAt, setCaughtAt] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aberta, setAberta] = useState<Species | null>(null);

  // Carrega uma vez. Voltar do seletor de espécie não pode reler o banco por cima do que a
  // pessoa acabou de escolher.
  useEffect(() => {
    if (!user?.id || !id) return;
    let vivo = true;
    (async () => {
      const row = await getCatch(user.id, id);
      if (!vivo) return;
      if (row) {
        useEdicao.getState().carregar({
          id: row.id,
          speciesId: row.speciesId,
          lengthCm: String(row.lengthCm).replace('.', ','),
          weightG: row.weightG === null ? '' : String(row.weightG / 1000).replace('.', ','),
          placeLabel: row.placeLabel ?? '',
          released: row.released,
        });
        setFoto(row.photoLocal);
        setCaughtAt(row.caughtAt);
      }
      setCarregando(false);
    })();
    return () => {
      vivo = false;
    };
  }, [user?.id, id]);

  const species = edicao.speciesId ? getSpecies(edicao.speciesId) : undefined;
  const medida = Number(edicao.lengthCm.replace(',', '.'));
  const pesoReal = edicao.weightG.trim().length > 0 ? Number(edicao.weightG.replace(',', '.')) : null;

  const pesoEstimado = useMemo(() => {
    if (!species || !Number.isFinite(medida) || medida <= 0) return null;
    return estimateWeightG(medida, species);
  }, [species, medida]);

  async function salvar() {
    if (salvando || !edicao.id) return;

    const check = checkMeasure(medida, species ?? null);
    if (!check.ok) {
      if (check.kind === 'fora-do-limite') {
        Alert.alert('Medida inválida', check.message);
        return;
      }
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
      const r = await updateCatch(userIdAtual(), edicao.id, {
        speciesId: edicao.speciesId,
        lengthCm: medida,
        weightG: pesoReal !== null && Number.isFinite(pesoReal) ? pesoReal * 1000 : null,
        placeLabel: edicao.placeLabel.trim() || null,
        released: edicao.released,
      });

      if (r.unlocked && species) {
        setAberta(species);
        return;
      }

      useEdicao.getState().reset();
      router.back();
    } finally {
      setSalvando(false);
    }
  }

  function excluir() {
    if (!edicao.id) return;
    Alert.alert(
      'Excluir esta captura?',
      'Ela sai do histórico. As cartas que você já desbloqueou continuam abertas — desbloqueio não volta atrás.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await deleteCatch(userIdAtual(), edicao.id!);
              useEdicao.getState().reset();
              router.back();
            })();
          },
        },
      ],
    );
  }

  if (carregando) {
    return <View className="flex-1 bg-fundo" />;
  }

  if (!edicao.id) {
    return (
      <View className="flex-1 items-center justify-center bg-fundo px-8">
        <Text className="text-center text-base text-suave">Captura não encontrada.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-fundo"
    >
      {aberta ? (
        <Desbloqueio
          species={aberta}
          onFechar={() => {
            useEdicao.getState().reset();
            router.back();
          }}
          onVerCarta={() => {
            const id = aberta.id;
            useEdicao.getState().reset();
            router.replace({ pathname: '/album/[especie]', params: { especie: id } });
          }}
        />
      ) : null}
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}>
        {foto ? (
          <Image source={{ uri: foto }} className="h-56 w-full bg-elevado" resizeMode="cover" />
        ) : null}

        <View className="px-5 pt-4">
          {caughtAt ? (
            <Text className="text-xs text-suave">{dataLonga(new Date(caughtAt))}</Text>
          ) : null}
          <Text className="mt-1 text-xs text-suave">
            A foto e a data não mudam aqui — registre outra captura se a foto estiver errada.
          </Text>
        </View>

        <View className="px-5 pt-1">
          <Campo rotulo="Espécie">
            <Pressable
              onPress={() => router.push({ pathname: '/captura/especie', params: { alvo: 'edicao' } })}
              className="rounded-2xl border border-borda bg-superficie px-4 py-3 active:opacity-70"
            >
              <Text className={species ? 'text-base text-texto' : 'text-base text-suave'}>
                {species ? species.commonName : 'Não identificado'}
              </Text>
              {species ? (
                <Text className="mt-0.5 text-xs italic text-suave">{species.scientificName}</Text>
              ) : null}
            </Pressable>
          </Campo>

          <Campo rotulo={`${species ? measureLabel(species) : 'Comprimento'} (cm)`}>
            <TextInput
              value={edicao.lengthCm}
              onChangeText={(v) => edicao.set({ lengthCm: v })}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={cores.suave}
              className="rounded-2xl border border-borda bg-superficie px-4 py-3 text-2xl font-semibold text-texto"
            />
            {pesoEstimado !== null ? (
              <Text className="mt-2 text-sm text-suave">{weightLabel(null, pesoEstimado)}</Text>
            ) : null}
          </Campo>

          <Campo rotulo="Peso real (kg) — opcional">
            <TextInput
              value={edicao.weightG}
              onChangeText={(v) => edicao.set({ weightG: v })}
              keyboardType="decimal-pad"
              placeholder="0,0"
              placeholderTextColor={cores.suave}
              className="rounded-2xl border border-borda bg-superficie px-4 py-3 text-base text-texto"
            />
          </Campo>

          <Campo rotulo="Local — opcional">
            <TextInput
              value={edicao.placeLabel}
              onChangeText={(v) => edicao.set({ placeLabel: v })}
              placeholder="Pesqueiro Recanto, Rio Paranhana..."
              placeholderTextColor={cores.suave}
              className="rounded-2xl border border-borda bg-superficie px-4 py-3 text-base text-texto"
            />
          </Campo>

          <View className="mt-5 flex-row items-center justify-between rounded-2xl border border-borda bg-superficie px-4 py-3">
            <Text className="text-base text-texto">Pescado e solto</Text>
            <Switch
              value={edicao.released}
              onValueChange={(v) => edicao.set({ released: v })}
              trackColor={{ true: cores.destaque, false: cores.borda }}
              thumbColor={cores.superficie}
            />
          </View>

          <Pressable onPress={excluir} className="mt-8 items-center py-3 active:opacity-70">
            <Text className="text-sm font-semibold text-perigo">Excluir captura</Text>
          </Pressable>
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
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

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
