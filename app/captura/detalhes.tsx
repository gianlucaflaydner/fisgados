import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { getSpecies, type Species } from '@/catalog';
import { Desbloqueio } from '@/components/Desbloqueio';
import { FormularioDeCaptura } from '@/components/FormularioDeCaptura';
import { SugestaoDeMedida } from '@/components/SugestaoDeMedida';
import { SugestoesIA } from '@/components/SugestoesIA';
import { BotaoPrincipal, BotaoTexto } from '@/components/ui';
import { countAtPlace, saveCatch, sincronizarInsignias } from '@/db/queries';
import { nomeDaConquista, subiuDeGrau } from '@/domain/conquistas';
import { nomeDaConcessao } from '@/domain/insignias';
import { aceitouPrimeira, apresentar, estimativaDeMedida, registroDaSugestao } from '@/domain/identificacao';
import { checkMeasure } from '@/domain/weight';
import { fotoDaGaleria } from '@/media/photo';
import { useDraft } from '@/stores/draft';
import { useIdentificacao } from '@/stores/identificacao';
import { userIdAtual } from '@/stores/session';

/**
 * Registrar a captura — o fim do fluxo de 30 segundos do PRD.
 *
 * Os campos vivem em `FormularioDeCaptura`, compartilhado com a tela de correção. Aqui ficam só
 * as decisões do registro: GPS silencioso, trocar a foto, salvar, desbloqueio e conquista de
 * local.
 */
export default function Detalhes() {
  const router = useRouter();
  const draft = useDraft();
  const [salvando, setSalvando] = useState(false);
  const [trocandoFoto, setTrocandoFoto] = useState(false);

  // A cena de desbloqueio segura a navegação: sair antes de mostrá-la desperdiçaria o único
  // momento de recompensa do app.
  const [aberta, setAberta] = useState<{
    species: Species;
    trofeu: boolean;
    /** Conquista de local a anunciar depois que a cena de desbloqueio fechar. */
    conquista: string | null;
  } | null>(null);

  const species = draft.speciesId ? getSpecies(draft.speciesId) : undefined;
  const medida = Number(draft.lengthCm.replace(',', '.'));

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

  /*
   * A estimativa de tamanho da IA, filtrada pela espécie escolhida quando já há uma: o catálogo
   * sabe a faixa de cada peixe, e dourado de 8 cm é erro de leitura da foto, não captura.
   */
  const ia = useIdentificacao((s) => (s.uri === draft.photoUri ? s.resultado : null));
  const estimativa = useMemo(() => {
    if (!ia || ia.estado !== 'pronta') return { tipo: 'nenhuma' } as const;
    return estimativaDeMedida(ia.medida, species ?? undefined);
  }, [ia, species]);

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

    // RN02: o que a IA disse vai para uma coluna própria, ao lado da escolha — nunca no lugar dela.
    const estado = useIdentificacao.getState();
    const sugestao =
      estado.uri === draft.photoUri && estado.resultado.estado === 'pronta'
        ? registroDaSugestao(
            estado.resultado.modelo,
            estado.resultado.sugestoes,
            apresentar(estado.resultado.sugestoes, (id) => getSpecies(id)?.visuallySimilarTo ?? []).tipo,
            { estimativa, cmSalvo: medida },
          )
        : null;

    // Contado antes de salvar: é a diferença entre o antes e o depois que diz se esta captura
    // fechou um grau naquele lugar.
    const local = draft.placeLabel.trim();
    const noLocalAntes = local ? await countAtPlace(userIdAtual(), local) : 0;

    setSalvando(true);
    try {
      const r = await saveCatch({
        aiSuggestion: sugestao ? JSON.stringify(sugestao) : null,
        aiAccepted: aceitouPrimeira(sugestao, draft.speciesId),
        userId: userIdAtual(),
        speciesId: draft.speciesId,
        lengthCm: medida,
        weightG: pesoReal !== null && Number.isFinite(pesoReal) ? pesoReal * 1000 : null,
        photoLocal: draft.photoUri,
        lat: draft.lat,
        lng: draft.lng,
        placeLabel: local || null,
        released: draft.released,
        caughtAt: draft.caughtAt,
        offlineOrigin: false,
      });

      // Subiu de grau naquele lugar? É o reconhecimento de quem pesca sempre no mesmo canto —
      // justamente quem o álbum, que premia variedade, nunca premia.
      const degrau = local ? subiuDeGrau(noLocalAntes) : null;
      const conquistaDeLocal = degrau ? nomeDaConquista(degrau.titulo, local) : null;

      /*
       * As insígnias são avaliadas depois de a captura estar gravada, sobre o histórico inteiro
       * (RN17). Vem por último na fila de anúncios: a carta nova é a recompensa do app, e um
       * "Molhou o Anzol" aparecendo antes dela roubaria o momento.
       */
      const ganhas = await sincronizarInsignias(userIdAtual(), r.catchId);
      const conquista =
        conquistaDeLocal ?? (ganhas.length > 0 ? nomeDaConcessao(ganhas[0]!) : null);

      if (r.unlocked && species) {
        // A carta nova vem primeiro: é a cena de recompensa do app. A conquista do lugar espera
        // a cortina fechar, em vez de disputar a tela com ela.
        setAberta({ species, trofeu: r.trophy, conquista });
        return;
      }
      if (conquista) {
        Alert.alert(conquistaDeLocal ? 'Conquista no seu ponto' : 'Insígnia nova', conquista, [
          { text: 'Boa!', onPress: concluir },
        ]);
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
    useIdentificacao.getState().limpar();
    router.dismissAll();
    router.replace('/');
  }

  if (aberta) {
    return (
      <Desbloqueio
        species={aberta.species}
        trofeu={aberta.trofeu}
        onFechar={() => {
          if (aberta.conquista) {
            Alert.alert('Conquista no seu ponto', aberta.conquista, [{ text: 'Boa!', onPress: concluir }]);
            return;
          }
          concluir();
        }}
        onVerCarta={() => {
          const id = aberta.species.id;
          useDraft.getState().reset();
          useIdentificacao.getState().limpar();
          router.dismissAll();
          router.replace({ pathname: '/album/[especie]', params: { especie: id } });
        }}
      />
    );
  }

  return (
    <FormularioDeCaptura
      titulo="Registrar captura"
      fotoUri={draft.photoUri}
      quando={draft.caughtAt}
      species={species}
      lengthCm={draft.lengthCm}
      weightG={draft.weightG}
      placeLabel={draft.placeLabel}
      released={draft.released}
      userId={userIdAtual()}
      onVoltar={trocarFoto}
      onEscolherEspecie={() => router.push('/captura/especie')}
      onMudar={(patch) => draft.set(patch)}
      sobreAFoto={
        <View className="flex-row items-center justify-between">
          <Text className="font-corpo text-[13px] text-apoio">
            {draft.origemFoto === 'galeria' ? 'Foto da galeria' : 'Foto de agora'}
          </Text>
          <BotaoTexto titulo={trocandoFoto ? 'Abrindo a galeria...' : 'Trocar foto'} onPress={trocarFoto} />
        </View>
      }
      sugestaoDeEspecie={
        <SugestoesIA
          photoUri={draft.photoUri}
          escolhida={draft.speciesId}
          onEscolher={(id) => draft.set({ speciesId: id })}
          onAbrirLista={() => router.push('/captura/especie')}
        />
      }
      sugestaoDeMedida={
        <SugestaoDeMedida
          estimativa={estimativa}
          valorAtual={draft.lengthCm}
          onUsar={(cm) => draft.set({ lengthCm: String(cm) })}
        />
      }
      acoes={
        <BotaoPrincipal
          titulo="Salvar captura"
          icone="camera"
          carregando={salvando}
          onPress={() => void salvar()}
        />
      }
    />
  );
}
