import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { getSpecies, type Species } from '@/catalog';
import { Desbloqueio } from '@/components/Desbloqueio';
import { FormularioDeCaptura } from '@/components/FormularioDeCaptura';
import { BotaoPrincipal } from '@/components/ui';
import { deleteCatch, getCatch, updateCatch } from '@/db/queries';
import { checkMeasure } from '@/domain/weight';
import { useEdicao } from '@/stores/edicao';
import { userIdAtual, useSession } from '@/stores/session';

/**
 * Corrigir ou apagar uma captura registrada — PRD 7.2.
 *
 * Registrar acontece com o peixe se debatendo na mão, de pé, com pressa. Errar a medida ou a
 * espécie é o caso normal, não a exceção: um 420 no lugar de 42 não pode ficar no histórico para
 * sempre, nem a carta errada abrir sem volta.
 *
 * Os campos são literalmente os mesmos do registro — `FormularioDeCaptura`, o mesmo componente.
 * Quem corrige está relendo a tela que preencheu.
 *
 * Foto e data não se corrigem aqui: a foto é o documento da captura e a data vem dela. Foto errada
 * é outra captura, e o aviso em cima do formulário diz isso.
 */
export default function EditarCaptura() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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

      sair();
    } finally {
      setSalvando(false);
    }
  }

  function sair() {
    useEdicao.getState().reset();
    router.back();
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
              sair();
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
        <Text className="text-center font-corpo text-[16px] text-suave">Captura não encontrada.</Text>
      </View>
    );
  }

  if (aberta) {
    return (
      <Desbloqueio
        species={aberta}
        onFechar={sair}
        onVerCarta={() => {
          const especie = aberta.id;
          useEdicao.getState().reset();
          router.replace({ pathname: '/album/[especie]', params: { especie } });
        }}
      />
    );
  }

  return (
    <FormularioDeCaptura
      titulo="Corrigir captura"
      fotoUri={foto}
      quando={caughtAt ? new Date(caughtAt) : null}
      species={species}
      lengthCm={edicao.lengthCm}
      weightG={edicao.weightG}
      placeLabel={edicao.placeLabel}
      released={edicao.released}
      userId={user?.id}
      onVoltar={sair}
      onEscolherEspecie={() => router.push({ pathname: '/captura/especie', params: { alvo: 'edicao' } })}
      onMudar={(patch) => edicao.set(patch)}
      sobreAFoto={
        <Text className="font-corpo text-[13px] leading-[18px] text-apoio">
          Foto e data ficam como estão. Se a foto estiver errada, registre outra captura.
        </Text>
      }
      acoes={<BotaoPrincipal titulo="Salvar alterações" carregando={salvando} onPress={() => void salvar()} />}
      rodape={
        <Pressable onPress={excluir} className="mt-2 self-start py-2 active:opacity-60">
          <Text className="font-corpo-forte text-[15px] text-perigo">Excluir captura</Text>
        </Pressable>
      }
    />
  );
}
