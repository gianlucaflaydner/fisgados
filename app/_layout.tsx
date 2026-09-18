import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../src/global.css';
import { db } from '@/db';
import migrations from '@/db/migrations/migrations';
import { useCores, useTemaAtivo } from '@/theme';
import { useSession } from '@/stores/session';
import { useSync } from '@/stores/sync';
import { useTema, type Preferencia } from '@/stores/tema';

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  const user = useSession((s) => s.user);
  const sessao = useSession((s) => s.estado);
  const restaurarSessao = useSession((s) => s.restaurar);
  const restaurarTema = useTema((s) => s.restaurar);
  const tema = useTemaAtivo();
  const cores = useCores();
  const dispararSync = useSync((s) => s.disparar);

  // Só depois das migrations: as tabelas de preferências podem não existir ainda no aparelho de
  // quem atualiza o app, e ler antes da hora derrubaria o boot.
  useEffect(() => {
    if (!success) return;
    void restaurarTema();
    void restaurarSessao();
  }, [success, restaurarTema, restaurarSessao]);

  /*
   * A fila é esvaziada ao entrar e sempre que o app volta do segundo plano — que é justamente
   * quando o sinal costuma voltar, saindo do carro ou chegando em casa depois da pescaria.
   *
   * Não há detector de conectividade de propósito: o aparelho diz que tem wi-fi e o wi-fi do
   * pesqueiro não tem internet. Tentar e falhar é mais barato e mais honesto que perguntar, e o
   * backoff cuida de não insistir à toa.
   */
  useEffect(() => {
    if (!user) return;
    void dispararSync();

    const inscricao = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void dispararSync();
    });
    return () => inscricao.remove();
  }, [user, dispararSync]);

  // Migration é pré-condição, não detalhe: abrir o app com schema errado é como se perde dado.
  if (error) {
    return <Aviso titulo="Erro ao preparar o banco" detalhe={error.message} />;
  }

  /*
   * Um único estado de espera para banco e sessão. Desenhar o login e trocar para a home meio
   * segundo depois, porque a sessão chegou atrasada, é pior do que esperar calado.
   */
  if (!success || sessao === 'carregando') {
    return (
      <View className="flex-1 items-center justify-center bg-fundo">
        <ActivityIndicator color={cores.destaque} />
      </View>
    );
  }

  /*
   * Falha ao ler a sessão não derruba ninguém para o login. Quem estava logado continua logado —
   * o que houve foi o banco não responder, e mandar a pessoa digitar a senha de novo por causa
   * disso é perder o login por um problema que não era dela.
   */
  if (sessao === 'erro') {
    return <Aviso titulo="Não deu para ler sua sessão" detalhe="Ninguém foi desconectado." acao />;
  }

  return (
    // O gesture-handler v2 exige esta raiz para os gestos do enquadramento. O expo-router não a põe.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={tema === 'escuro' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: cores.fundo },
            headerTintColor: cores.texto,
            headerTitleStyle: { fontWeight: '600' },
            contentStyle: { backgroundColor: cores.fundo },
          }}
        >
          {/*
           * O login não é uma tela que se empurra na pilha: é a única árvore que existe enquanto
           * não há sessão. Com o guard, nenhuma rota do app fica alcançável por link, por "voltar"
           * ou por engano — e sair da conta desmonta tudo de uma vez.
           */}
          <Stack.Protected guard={user !== null}>
            <Stack.Screen
              name="index"
              options={{
                title: 'Fisgados',
                headerLeft: () => <BotaoTema />,
                headerRight: () => <BotaoSair />,
              }}
            />
            <Stack.Screen name="album/index" options={{ title: 'Álbum' }} />
            <Stack.Screen name="album/[especie]" options={{ title: 'Ficha da espécie' }} />
            <Stack.Screen name="captura/camera" options={{ title: 'Foto da captura' }} />
            <Stack.Screen
              name="captura/enquadrar"
              // Sem gesto de voltar pela borda: ele disputa com o arrasto da foto e, como a câmera
              // foi substituída por esta tela, levaria para a home jogando o rascunho fora. A
              // tela tem os próprios botões de voltar e de trocar a foto.
              options={{ title: 'Enquadrar', headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen name="captura/detalhes" options={{ title: 'Registrar captura' }} />
            <Stack.Screen name="captura/[id]" options={{ title: 'Corrigir captura' }} />
            <Stack.Screen
              name="captura/especie"
              options={{ title: 'Qual espécie?', presentation: 'modal' }}
            />
            <Stack.Screen name="creditos" options={{ title: 'Créditos das fotos' }} />
            <Stack.Screen name="amigos" options={{ title: 'Amigos' }} />
            <Stack.Screen name="ranking" options={{ title: 'Ranking do grupo' }} />
          </Stack.Protected>

          <Stack.Protected guard={user === null}>
            <Stack.Screen name="(auth)/entrar" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)/criar-conta" options={{ title: 'Criar conta' }} />
          </Stack.Protected>
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Tela cheia para os dois momentos em que o app não pode seguir: banco quebrado, sessão ilegível. */
function Aviso({ titulo, detalhe, acao }: { titulo: string; detalhe: string; acao?: boolean }) {
  const restaurar = useSession((s) => s.restaurar);
  return (
    <View className="flex-1 items-center justify-center bg-fundo px-8">
      <Text className="mb-2 text-lg font-semibold text-perigo">{titulo}</Text>
      <Text className="text-center text-sm text-suave">{detalhe}</Text>
      {acao ? (
        <Pressable
          onPress={() => void restaurar()}
          className="mt-6 rounded-2xl bg-destaque px-6 py-3 active:opacity-80"
        >
          <Text className="font-bold text-destaque-texto">Tentar de novo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const ROTULO: Record<Preferencia, string> = {
  sistema: 'Seguir o sistema',
  claro: 'Claro',
  escuro: 'Escuro',
};

/**
 * Troca de tema.
 *
 * Um menu de três opções em vez de um botão que alterna: com "seguir o sistema" no meio, alternar
 * em ciclo esconderia o estado atual — e é justamente o estado atual que a pessoa quer conferir
 * quando abre isso.
 */
function BotaoTema() {
  const preferencia = useTema((s) => s.preferencia);
  const definir = useTema((s) => s.definir);

  function abrir() {
    Alert.alert('Tema', `Agora: ${ROTULO[preferencia].toLowerCase()}`, [
      { text: ROTULO.sistema, onPress: () => void definir('sistema') },
      { text: ROTULO.claro, onPress: () => void definir('claro') },
      { text: ROTULO.escuro, onPress: () => void definir('escuro') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  return (
    <Pressable onPress={abrir} hitSlop={8} className="px-1 active:opacity-60">
      <Text className="text-sm font-semibold text-suave">Tema</Text>
    </Pressable>
  );
}

/**
 * Sair pede confirmação porque, sem nuvem, "sair" parece perder tudo.
 * O aviso existe para dizer o contrário: o histórico fica, é só voltar a entrar.
 */
function BotaoSair() {
  const encerrar = useSession((s) => s.encerrar);

  function confirmar() {
    Alert.alert('Sair da conta?', 'Suas capturas continuam guardadas neste aparelho.', [
      { text: 'Ficar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void encerrar() },
    ]);
  }

  return (
    <Pressable onPress={confirmar} hitSlop={8} className="px-1 active:opacity-60">
      <Text className="text-sm font-semibold text-suave">Sair</Text>
    </Pressable>
  );
}
