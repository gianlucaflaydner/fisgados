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
 */
export default function Amigos() {
  const insets = useSafeAreaInsets();
  const cores = useCores();
  const user = useSession((s) => s.user);

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

  const cabecalho = (
    <View className="px-5 pt-4">
      <View className="rounded-2xl border border-borda bg-superficie p-5">
        <Text className="text-xs font-semibold uppercase tracking-wide text-suave">Seu código</Text>
        {user?.codigoConvite ? (
          <>
            <Text
              selectable
              className="mt-2 text-4xl font-extrabold text-cobalto"
              style={{ letterSpacing: 6, fontVariant: ['tabular-nums'] }}
            >
              {user.codigoConvite}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-suave">
              Quem digitar este código entra no seu grupo, e vocês passam a ver as capturas um do
              outro. A localização exata continua só no aparelho de cada um.
            </Text>
            <Pressable
              onPress={() => void enviarConvite()}
              className="mt-4 items-center rounded-2xl bg-destaque py-3 active:opacity-80"
            >
              <Text className="text-base font-bold text-destaque-texto">Enviar convite</Text>
            </Pressable>
          </>
        ) : (
          <Text className="mt-2 text-sm leading-5 text-suave">
            Seu código aparece quando o app conseguir falar com o servidor.
          </Text>
        )}
      </View>

      <View className="mt-4 rounded-2xl border border-borda bg-superficie p-5">
        <Text className="text-xs font-semibold uppercase tracking-wide text-suave">
          Recebeu um código?
        </Text>
        <TextInput
          value={codigo}
          onChangeText={(v) => {
            setCodigo(v.toUpperCase());
            setErroCodigo(null);
          }}
          placeholder="ABC234"
          placeholderTextColor={cores.suave}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={TAMANHO_CODIGO + 2}
          onSubmitEditing={() => void entrar()}
          returnKeyType="go"
          className="mt-3 rounded-2xl border border-borda bg-fundo px-4 py-3 text-2xl font-bold text-texto"
          style={{ letterSpacing: 4 }}
        />
        {erroCodigo ? <Text className="mt-2 text-sm text-perigo">{erroCodigo}</Text> : null}
        <Pressable
          onPress={() => void entrar()}
          disabled={entrando || codigo.trim().length === 0}
          className="mt-3 items-center rounded-2xl border border-cobalto py-3 active:opacity-70"
        >
          {entrando ? (
            <ActivityIndicator color={cores.cobalto} />
          ) : (
            <Text className="text-base font-semibold text-cobalto">Entrar no grupo</Text>
          )}
        </Pressable>
      </View>

      <Text className="mb-1 mt-6 text-xs font-semibold uppercase tracking-wide text-suave">
        No seu grupo{amigos.length > 0 ? ` · ${amigos.length}` : ''}
      </Text>
      {erroLista ? <Text className="text-sm text-perigo">{erroLista}</Text> : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-fundo"
    >
      <FlatList
        data={amigos}
        keyExtractor={(a) => a.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={cabecalho}
        ListEmptyComponent={
          carregando ? (
            <ActivityIndicator className="mt-4" color={cores.cobalto} />
          ) : erroLista ? null : (
            <Text className="mx-5 mt-2 text-sm leading-5 text-suave">
              Ninguém ainda. Envie seu código para quem pesca com você.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <View className="mx-5 mt-2 flex-row items-center justify-between rounded-2xl border border-borda bg-superficie px-4 py-3">
            <Text className="text-base font-semibold text-texto">{item.nome}</Text>
            <Pressable onPress={() => confirmarRemocao(item)} hitSlop={8} className="active:opacity-60">
              <Text className="text-sm text-suave">Remover</Text>
            </Pressable>
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
}
