import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Silhueta } from '@/components/Icone';
import { BotaoPrincipal, Campo } from '@/components/ui';
import { entrar } from '@/auth';
import { useSession } from '@/stores/session';
import { useCores } from '@/theme';

/**
 * Porta de entrada do app — F14.
 *
 * Três cartas em leque no topo, a do meio dourada e com "Nº ??": é a promessa do app numa imagem,
 * antes de qualquer texto. Quem abre isto pela primeira vez entende em dois segundos que o
 * assunto é coleção, não cadastro.
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-fundo">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-6 px-6" style={{ paddingTop: insets.top + 16 }}>
          <LequeDeCartas />

          <View className="gap-1.5">
            <Text className="font-display text-[46px] leading-[46px] tracking-[-0.035em] text-texto">
              Fisgados
            </Text>
            <Text className="font-corpo text-[16px] leading-[23px] text-suave">
              Seu álbum de figurinhas que se completa pescando.
            </Text>
          </View>

          <View className="gap-3.5">
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
              value={senha}
              onChangeText={setSenha}
              placeholder="Sua senha"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              onSubmitEditing={enviar}
              returnKeyType="go"
            />

            {erro ? <Text className="font-corpo text-[13.5px] leading-5 text-perigo">{erro}</Text> : null}

            <BotaoPrincipal titulo="Entrar" carregando={enviando} onPress={enviar} />
          </View>

          <Pressable onPress={() => router.push('/criar-conta')} className="items-center py-1 active:opacity-70">
            <Text className="font-corpo text-[15px] text-suave">
              Primeira vez? <Text className="font-corpo-negrito text-acao">Criar conta</Text>
            </Text>
          </Pressable>

          <View
            className="mt-2 flex-row gap-2.5 rounded-campo p-3.5"
            style={{ backgroundColor: cores.superficie, borderWidth: 1, borderColor: cores.borda }}
          >
            <Text className="flex-1 font-corpo text-[12.5px] leading-[19px] text-apoio">
              As capturas ficam no aparelho e sobem quando há sinal. A coordenada exata do seu ponto
              de pesca nunca sai daqui.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * O leque de três cartas — a vitrine da tela de entrada.
 *
 * Duas vazias atrás, inclinadas para fora, e a dourada na frente com "Nº ??". A inclinação é o que
 * faz parecerem cartas na mão em vez de três retângulos empilhados.
 */
function LequeDeCartas() {
  const cores = useCores();

  const vazia = (rotacao: string, deslocamento: number) => (
    <View
      key={rotacao}
      className="absolute h-[156px] w-[116px] rounded-campo p-1"
      style={{
        backgroundColor: cores.borda,
        left: '50%',
        top: 18,
        marginLeft: deslocamento,
        transform: [{ rotate: rotacao }],
      }}
    >
      <View
        className="h-full items-center justify-center rounded-[10px]"
        style={{ backgroundColor: cores.superficie, borderWidth: 1, borderColor: cores.bordaForte }}
      >
        <Silhueta largura={56} cor={cores.bordaForte} />
      </View>
    </View>
  );

  return (
    <View className="h-[200px]">
      {vazia('-13deg', -138)}
      {vazia('13deg', 22)}

      <View
        className="absolute w-[136px] rounded-botao p-1"
        style={{ backgroundColor: cores.lendario, left: '50%', top: 0, marginLeft: -68 }}
      >
        <View className="overflow-hidden rounded-[12px]" style={{ backgroundColor: cores.superficie }}>
          <View className="h-[132px] items-center justify-center" style={{ backgroundColor: cores.elevado }}>
            <Silhueta largura={84} cor={cores.lendario} />
            <View
              className="absolute left-2 top-2 rounded-md px-1.5 py-0.5"
              style={{ backgroundColor: cores.fundo }}
            >
              <Text className="font-display text-[11px]" style={{ color: cores.lendario }}>
                Nº ??
              </Text>
            </View>
          </View>
          <Text className="px-2.5 pb-2.5 pt-2 font-display text-[14px]" style={{ color: cores.lendario }}>
            Qual será a próxima?
          </Text>
        </View>
      </View>
    </View>
  );
}
