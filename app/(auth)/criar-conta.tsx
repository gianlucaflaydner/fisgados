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
import { registrar, SENHA_MIN } from '@/auth';
import { useSession } from '@/stores/session';
import { useCores } from '@/theme';

/**
 * Cadastro — F14.
 *
 * Três campos e acabou. Cada campo a mais aqui é uma pessoa a menos registrando o primeiro peixe,
 * e nada além de nome, e-mail e senha é necessário para o app funcionar.
 */
export default function CriarConta() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const definir = useSession((s) => s.definir);
  const cores = useCores();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      const r = await registrar({ nome, email, senha });
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      // Cadastrou, está dentro. O guard do `_layout` troca a árvore de telas sozinho.
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
          <Text className="text-3xl font-bold text-texto">Criar conta</Text>
          <Text className="mt-2 text-base leading-6 text-suave">
            É rápido. Depois disso o app já abre direto no seu álbum.
          </Text>

          <CampoTexto
            rotulo="Como quer ser chamado"
            value={nome}
            onChangeText={setNome}
            placeholder="Seu nome ou apelido"
            autoCapitalize="words"
            autoComplete="name"
          />

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
            rotulo={`Senha — mínimo ${SENHA_MIN} caracteres`}
            value={senha}
            onChangeText={setSenha}
            placeholder="Escolha uma senha"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
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
              <Text className="text-base font-bold text-destaque-texto">Criar conta e entrar</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            className="mt-4 items-center py-2 active:opacity-70"
          >
            <Text className="text-sm text-suave">
              Já tem conta? <Text className="font-semibold text-cobalto">Entrar</Text>
            </Text>
          </Pressable>

          <Text className="mt-8 text-center text-xs leading-5 text-suave">
            Você precisa de internet só agora, para criar a conta. Depois o app abre e registra
            capturas sem sinal. Um aparelho atende uma conta: entrar com outra apaga o histórico
            local da anterior.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
