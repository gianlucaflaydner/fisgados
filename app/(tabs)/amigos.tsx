import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotaoPrincipal, BotaoSecundario, BotaoTexto, Rotulo, TituloDaTela } from '@/components/ui';
import { TAMANHO_CODIGO } from '@/domain/convite';
import { useSession } from '@/stores/session';
import { aceitarConvite, listarAmigos, removerAmigo, type Amigo } from '@/sync/amigos';
import { useCores } from '@/theme';

/**
 * Amigos — F10.
 *
 * Entra no grupo quem recebeu o código de alguém de dentro. Não existe busca por nome, telefone
 * ou e-mail, e isso é decisão do PRD (7.4), não falta de tempo: num app que mostra onde e quando
 * cada um pesca, ser encontrável por estranho é o tipo de coisa que ninguém pediu.
 *
 * O código aparece grande e espaçado porque vai ser lido em voz alta, na beira do açude, para
 * alguém digitar no próprio celular.
 *
 * Sair da conta mora no fim desta tela. Era um "Sair" no cabeçalho de toda tela, que é onde se
 * aperta por engano; aqui fica junto do que é de conta — e com o aviso de que o histórico fica.
 */
export default function Amigos() {
  const insets = useSafeAreaInsets();
  const cores = useCores();
  const user = useSession((s) => s.user);
  const encerrar = useSession((s) => s.encerrar);

  const [amigos, setAmigos] = useState<Amigo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erroCodigo, setErroCodigo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!user?.id) return;
    setCarregando(true);
    const r = await listarAmigos(user.id);
    if (r.ok) {
      setAmigos(r.valor);
      setErroLista(null);
    } else {
      setErroLista(r.erro);
    }
    setCarregando(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  async function enviarConvite() {
    if (!user?.codigoConvite) return;
    await Share.share({
      message:
        `Entra no meu grupo do Fisgados! Abra o app, toque em Amigos e digite o código ` +
        `${user.codigoConvite}.`,
    });
  }

  async function entrar() {
    if (entrando) return;
    setEntrando(true);
    setErroCodigo(null);
    try {
      const r = await aceitarConvite(codigo);
      if (!r.ok) {
        setErroCodigo(r.erro);
        return;
      }
      setCodigo('');
      Alert.alert('Pronto', `Você e ${r.valor.nome} agora estão no mesmo grupo.`);
      await carregar();
    } finally {
      setEntrando(false);
    }
  }

  function confirmarRemocao(amigo: Amigo) {
    Alert.alert(
      `Sair do grupo de ${amigo.nome}?`,
      'Vocês deixam de ver as capturas um do outro, nos dois sentidos. Dá para voltar com um código novo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const r = await removerAmigo(amigo.id);
              if (!r.ok) Alert.alert('Não deu para remover', r.erro);
              await carregar();
            })();
          },
        },
      ],
    );
  }

  function confirmarSaida() {
    Alert.alert('Sair da conta?', 'Suas capturas continuam guardadas neste aparelho.', [
      { text: 'Ficar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void encerrar() },
    ]);
  }

  const cabecalho = (
    <View className="gap-4 px-5" style={{ paddingTop: insets.top + 12 }}>
      <TituloDaTela acima="Quem pesca com você">Amigos</TituloDaTela>

      <View className="gap-3 rounded-painel border border-borda bg-superficie p-5">
        <Rotulo>Seu código</Rotulo>
        {user?.codigoConvite ? (
          <>
            <Text
              selectable
              className="font-display text-[40px] leading-[42px] text-acao"
              style={{ letterSpacing: 6, fontVariant: ['tabular-nums'] }}
            >
              {user.codigoConvite}
            </Text>
            <Text className="font-corpo text-[14px] leading-5 text-suave">
              Quem digitar este código entra no seu grupo, e vocês passam a ver as capturas um do
              outro. A localização exata continua só no aparelho de cada um.
            </Text>
            <BotaoPrincipal titulo="Enviar convite" icone="compartilhar" onPress={() => void enviarConvite()} />
          </>
        ) : (
          <Text className="font-corpo text-[14px] leading-5 text-suave">
            Seu código aparece quando o app conseguir falar com o servidor.
          </Text>
        )}
      </View>

      <View className="gap-3 rounded-painel border border-borda bg-superficie p-5">
        <Rotulo>Recebeu um código?</Rotulo>
        <TextInput
          value={codigo}
          onChangeText={(v) => {
            setCodigo(v.toUpperCase());
            setErroCodigo(null);
          }}
          placeholder="ABC234"
          placeholderTextColor={cores.apoio}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={TAMANHO_CODIGO + 2}
          onSubmitEditing={() => void entrar()}
          returnKeyType="go"
          className="rounded-campo px-4 py-3 font-display text-[28px] text-texto"
          style={{ letterSpacing: 5, backgroundColor: cores.campo, borderWidth: 1.5, borderColor: cores.borda }}
        />
        {erroCodigo ? <Text className="font-corpo text-[13px] text-perigo">{erroCodigo}</Text> : null}
        {entrando ? (
          <ActivityIndicator color={cores.destaque} />
        ) : (
          <BotaoSecundario
            titulo="Entrar no grupo"
            largura="cheia"
            desabilitado={codigo.trim().length === 0}
            onPress={() => void entrar()}
          />
        )}
      </View>

      <View className="mt-1">
        <Rotulo>{`No seu grupo${amigos.length > 0 ? ` · ${amigos.length}` : ''}`}</Rotulo>
        {erroLista ? <Text className="mt-2 font-corpo text-[13px] text-perigo">{erroLista}</Text> : null}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-fundo">
      <FlatList
        data={amigos}
        keyExtractor={(a) => a.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        ListHeaderComponent={cabecalho}
        ListEmptyComponent={
          carregando ? (
            <ActivityIndicator className="mt-4" color={cores.destaque} />
          ) : erroLista ? null : (
            <Text className="mx-5 mt-2 font-corpo text-[14px] leading-5 text-suave">
              Ninguém ainda. Envie seu código para quem pesca com você.
            </Text>
          )
        }
        ListFooterComponent={
          <View className="mx-5 mt-8 items-start gap-1 border-t border-borda pt-5">
            <BotaoTexto titulo="Sair da conta" onPress={confirmarSaida} />
            <Text className="font-corpo text-[12.5px] leading-[18px] text-apoio">
              O histórico fica neste aparelho. Entrar de novo traz tudo de volta.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mx-5 mt-2 flex-row items-center gap-3 rounded-carta border border-borda bg-superficie px-4 py-3">
            <View
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: cores.elevado, borderWidth: 2, borderColor: cores.bordaForte }}
            >
              <Text className="font-display text-[14px] text-texto">{iniciais(item.nome)}</Text>
            </View>
            <Text className="flex-1 font-display-medio text-[17px] text-texto" numberOfLines={1}>
              {item.nome}
            </Text>
            <Pressable onPress={() => confirmarRemocao(item)} hitSlop={10} className="py-1 active:opacity-60">
              <Text className="font-corpo-forte text-[13px] text-suave">Remover</Text>
            </Pressable>
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
}

/** Duas letras para o avatar: a primeira de cada palavra, ou as duas primeiras do nome único. */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0]!.slice(0, 2).toUpperCase();
  return (partes[0]![0]! + partes[partes.length - 1]![0]!).toUpperCase();
}
