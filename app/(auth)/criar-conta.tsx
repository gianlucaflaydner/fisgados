import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone } from '@/components/Icone';
import { BotaoPrincipal, Campo } from '@/components/ui';
import { registrar, SENHA_MIN } from '@/auth';
import { useSession } from '@/stores/session';
import { useCores } from '@/theme';

/**
 * Cadastro — F14.
 *
 * Três campos e acabou. Cada campo a mais aqui é uma pessoa a menos registrando o primeiro peixe,
 * e nada além de nome, e-mail e senha é necessário para o app funcionar.
 *
 * O aviso do fim é o único em tom de alerta no app inteiro: um aparelho atende uma conta, e entrar
 * com outra apaga o histórico local. É irreversível, então está escrito antes, não depois.
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-fundo">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-5 px-6" style={{ paddingTop: insets.top + 12 }}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            className="h-11 flex-row items-center gap-1 self-start rounded-campo border border-borda-forte bg-elevado pl-2 pr-3.5 active:opacity-70"
          >
            <Icone nome="voltar" tamanho={22} cor={cores.texto} traco={2.2} />
            <Text className="font-corpo-forte text-[15px] text-texto">Entrar</Text>
          </Pressable>

          <View className="flex-row items-center gap-3.5">
            <View className="flex-row">
              <View
                className="h-[52px] w-[38px] rounded-selo"
                style={{
                  backgroundColor: cores.superficie,
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  borderColor: cores.bordaForte,
                  transform: [{ rotate: '-8deg' }],
                }}
              />
              <View
                className="-ml-3 h-[52px] w-[38px] rounded-selo"
                style={{
                  backgroundColor: cores.superficie,
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  borderColor: cores.bordaForte,
                  transform: [{ rotate: '2deg' }],
                }}
              />
              <View
                className="-ml-3 h-[52px] w-[38px] items-center justify-center rounded-selo"
                style={{ backgroundColor: cores.destaque, transform: [{ rotate: '10deg' }] }}
              >
                <Icone nome="mais" tamanho={20} cor={cores.destaqueTexto} traco={2.6} />
              </View>
            </View>
            <Text className="flex-1 font-corpo text-[14px] leading-[20px] text-suave">
              84 espécies do Sul{'\n'}esperando no seu álbum
            </Text>
          </View>

          <View className="gap-1.5">
            <Text className="font-display text-[36px] leading-[38px] tracking-[-0.03em] text-texto">
              Criar conta
            </Text>
            <Text className="font-corpo text-[16px] leading-[23px] text-suave">
              É rápido. Depois disso o app já abre direto no seu álbum.
            </Text>
          </View>

          <View className="gap-3.5">
            <Campo
              rotulo="Como quer ser chamado"
              value={nome}
              onChangeText={setNome}
              placeholder="Seu nome ou apelido"
              autoCapitalize="words"
              autoComplete="name"
            />

            <Campo
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

            <Campo
              rotulo="Senha"
              dica={`Mínimo de ${SENHA_MIN} caracteres`}
              value={senha}
              onChangeText={setSenha}
              placeholder="Escolha uma senha"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              onSubmitEditing={enviar}
              returnKeyType="go"
            />

            {erro ? <Text className="font-corpo text-[13.5px] leading-5 text-perigo">{erro}</Text> : null}

            <BotaoPrincipal titulo="Criar conta e entrar" carregando={enviando} onPress={enviar} />
          </View>

          <View
            className="mt-1 flex-row gap-2.5 rounded-campo p-3.5"
            style={{ backgroundColor: `${cores.lendario}14`, borderWidth: 1, borderColor: `${cores.lendario}47` }}
          >
            <Text className="flex-1 font-corpo text-[12.5px] leading-[19px] text-suave">
              Internet só agora, para criar a conta. Um aparelho atende uma conta: entrar com outra
              apaga o histórico local da anterior.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
