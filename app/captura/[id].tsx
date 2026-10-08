import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { getSpecies, type Species } from '@/catalog';
import { Desbloqueio } from '@/components/Desbloqueio';
import { FormularioDeCaptura } from '@/components/FormularioDeCaptura';
import { CartaParaCompartilhar, LADO_DO_CARD } from '@/components/CartaParaCompartilhar';
import { BotaoPrincipal, BotaoSecundario } from '@/components/ui';
import { deleteCatch, getCatch, updateCatch } from '@/db/queries';
import type { CatchRow } from '@/db/schema';
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

  const [row, setRow] = useState<CatchRow | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [compartilhando, setCompartilhando] = useState(false);
  const [aberta, setAberta] = useState<Species | null>(null);
  const cartaRef = useRef<View>(null);

  /**
   * Gera a imagem e entrega ao sistema — F12.
   *
   * O arquivo vai para o cache do app, não para a galeria: quem compartilha quer mandar no grupo,
   * não acumular imagem no carretel. O sistema operacional decide o resto, e quem recebe vê a
   * carta na Água Funda, que é a identidade do app em qualquer conversa.
   */
  async function compartilhar() {
    if (compartilhando || !cartaRef.current) return;
    setCompartilhando(true);
    try {
      const uri = await captureRef(cartaRef, {
        format: 'jpg',
        quality: 0.92,
        width: LADO_DO_CARD,
        height: LADO_DO_CARD,
      });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sem compartilhamento', 'Este aparelho não oferece a tela de compartilhar.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: 'Compartilhar captura' });
    } catch {
      Alert.alert('Não deu para gerar a imagem', 'Tente de novo.');
    } finally {
      setCompartilhando(false);
    }
  }

  // Carrega uma vez. Voltar do seletor de espécie não pode reler o banco por cima do que a
  // pessoa acabou de escolher.
  useEffect(() => {
    if (!user?.id || !id) return;
    let vivo = true;
    (async () => {
      const atual = await getCatch(user.id, id);
      if (!vivo) return;
      if (atual) {
        useEdicao.getState().carregar({
          id: atual.id,
          speciesId: atual.speciesId,
          lengthCm: String(atual.lengthCm).replace('.', ','),
          weightG: atual.weightG === null ? '' : String(atual.weightG / 1000).replace('.', ','),
          placeLabel: atual.placeLabel ?? '',
          released: atual.released,
        });
        setRow(atual);
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
      fotoUri={row?.photoLocal ?? null}
      quando={row ? new Date(row.caughtAt) : null}
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
        <View className="mt-2 gap-1">
          <BotaoSecundario
            titulo={compartilhando ? 'Gerando a imagem...' : 'Compartilhar captura'}
            icone="compartilhar"
            largura="cheia"
            desabilitado={compartilhando || !row}
            onPress={() => void compartilhar()}
          />
          <Text className="px-1 font-corpo text-[12px] leading-[17px] text-apoio">
            Vira uma imagem com a foto, a espécie e a medida. O ponto de pesca exato não vai junto.
          </Text>

          <Pressable onPress={excluir} className="mt-4 self-start py-2 active:opacity-60">
            <Text className="font-corpo-forte text-[15px] text-perigo">Excluir captura</Text>
          </Pressable>

          {/*
            A carta de compartilhar é desenhada fora da tela, em tamanho real (1080×1080), porque o
            `view-shot` fotografa o que está montado — não dá para gerar a imagem a partir de uma
            versão reduzida sem perder resolução. `pointerEvents="none"` e a posição negativa a
            mantêm invisível e inofensiva.
          */}
          {row ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: -9999, top: 0, opacity: 0 }}>
              <CartaParaCompartilhar ref={cartaRef} row={row} nome={user?.nome ?? 'Fisgados'} />
            </View>
          ) : null}
        </View>
      }
    />
  );
}
