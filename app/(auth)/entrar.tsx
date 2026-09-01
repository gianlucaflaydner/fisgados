import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CampoTexto } from '@/components/CampoTexto';
import { entrar } from '@/auth';
import { useSession } from '@/stores/session';
import { useCores } from '@/theme';

/**
 * Porta de entrada do app — F14.
 *
 * Não há navegação manual depois do login: quem decide qual árvore de telas existe é o guard do
 * `_layout`, que observa a sessão. Assim não dá para ficar "logado mas na tela de login", nem o
 * contrário.
 */
export default function Entrar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const definir = useSession((s) => s.definir);
  const cores = useCores();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      const r = await entrar({ email, senha });
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      definir(r.user);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-fundo"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6">
          <Text className="text-4xl font-bold text-cobalto">Fisgados</Text>
          <Text className="mt-2 text-base leading-6 text-suave">
            Seu álbum de capturas. Entre para ver o que já pescou.
          </Text>

          <CampoTexto
            rotulo="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="voce@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            inputMode="email"
          />

          <CampoTexto
            rotulo="Senha"
            value={senha}
            onChangeText={setSenha}
            placeholder="Sua senha"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            onSubmitEditing={enviar}
            returnKeyType="go"
          />

          {erro ? <Text className="mt-3 text-sm text-perigo">{erro}</Text> : null}

          <Pressable
            onPress={enviar}
            disabled={enviando}
            className="mt-6 items-center rounded-2xl bg-destaque py-4 active:opacity-80"
          >
            {enviando ? (
              <ActivityIndicator color={cores.destaqueTexto} />
            ) : (
              <Text className="text-base font-bold text-destaque-texto">Entrar</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.push('/criar-conta')}
            className="mt-4 items-center py-2 active:opacity-70"
          >
            <Text className="text-sm text-suave">
              Primeira vez? <Text className="font-semibold text-cobalto">Criar conta</Text>
            </Text>
          </Pressable>

          <Text className="mt-8 text-center text-xs leading-5 text-suave">
            A conta e o histórico ficam neste aparelho. Nada é enviado para a internet nesta
            versão.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
