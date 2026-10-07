import { Tabs, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone, type NomeDoIcone } from '@/components/Icone';
import { useDraft } from '@/stores/draft';
import { useCores } from '@/theme';

/**
 * As quatro abas e o botão de registrar — o desenho da barra inferior do guia.
 *
 * Por que abas, e não os atalhos que havia na home: álbum, ranking e amigos eram pílulas pequenas
 * no topo da primeira tela, e ninguém chegava neles sem passar pela home. Com a barra, as quatro
 * seções ficam a um toque de qualquer lugar, sempre no mesmo canto — o que importa num app usado
 * de pé, com uma mão.
 *
 * A barra é uma ilha flutuante, com margem lateral e cantos de 24. O botão de registrar sobe 30 px
 * acima dela: é a ação mais repetida do app e precisa ser o maior alvo da tela, não um item igual
 * aos outros no meio da fila.
 */
export default function AbasLayout() {
  return (
    <Tabs
      tabBar={(props) => <Barra estado={props.state.index} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="album" options={{ title: 'Álbum' }} />
      <Tabs.Screen name="ranking" options={{ title: 'Ranking' }} />
      <Tabs.Screen name="amigos" options={{ title: 'Amigos' }} />
    </Tabs>
  );
}

const ABAS: { rota: '/' | '/album' | '/ranking' | '/amigos'; rotulo: string; icone: NomeDoIcone }[] = [
  { rota: '/', rotulo: 'Início', icone: 'inicio' },
  { rota: '/album', rotulo: 'Álbum', icone: 'album' },
  { rota: '/ranking', rotulo: 'Ranking', icone: 'ranking' },
  { rota: '/amigos', rotulo: 'Amigos', icone: 'amigos' },
];

function Barra({ estado }: { estado: number }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cores = useCores();
  const resetDraft = useDraft((s) => s.reset);

  function registrar() {
    resetDraft();
    router.push('/captura/camera');
  }

  return (
    /*
     * A sombra mora numa camada própria, atrás de tudo, e não no mesmo `View` que segura os itens.
     *
     * No Android a sombra vem da `elevation`, que também decide a ordem de desenho: com a sombra
     * na barra, o botão de registrar — que é filho dela e sobe 30 px para fora — era pintado
     * **embaixo** da sombra da própria barra, e aparecia um véu escuro sobre o laranja. Separando
     * as camadas, a sombra fica onde deve: atrás da barra e atrás do botão.
     */
    <View
      className="absolute inset-x-3"
      style={{ bottom: insets.bottom + 10 }}
      pointerEvents="box-none"
    >
      {/* Camada 1: o fundo da barra e a sombra dela, atrás de tudo. */}
      <View
        className="absolute inset-0 rounded-painel border border-borda"
        style={{
          backgroundColor: cores.campo,
          // A sombra só aparece de verdade no tema claro; no escuro quem separa a barra do fundo é
          // a borda. Manter as duas evita uma barra que flutua num tema e cola no outro.
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      />

      {/*
        Camada 2: os ícones e o botão. A `elevation` precisa ser maior que a da camada da sombra —
        no Android ela define a ordem de desenho, e não a ordem no JSX: com a mesma elevação da
        camada de baixo, os ícones ficariam atrás do fundo da barra.
      */}
      <View
        className="flex-row items-end justify-between px-3.5 pb-2.5 pt-2.5"
        style={{ elevation: 12, zIndex: 1 }}
      >
        {ABAS.slice(0, 2).map((a, i) => (
          <ItemDaAba key={a.rota} {...a} ativa={estado === i} onPress={() => router.navigate(a.rota)} />
        ))}

        <Pressable
          onPress={registrar}
          accessibilityRole="button"
          accessibilityLabel="Registrar captura"
          className="h-[60px] w-[60px] items-center justify-center rounded-[20px] active:opacity-85"
          style={{
            marginTop: -30,
            backgroundColor: cores.destaque,
            borderBottomWidth: 5,
            borderBottomColor: cores.destaqueBaixo,
          }}
        >
          <Icone nome="mais" tamanho={28} cor={cores.destaqueTexto} traco={2.6} />
        </Pressable>

        {ABAS.slice(2).map((a, i) => (
          <ItemDaAba key={a.rota} {...a} ativa={estado === i + 2} onPress={() => router.navigate(a.rota)} />
        ))}
      </View>
    </View>
  );
}

function ItemDaAba({
  rotulo,
  icone,
  ativa,
  onPress,
}: {
  rotulo: string;
  icone: NomeDoIcone;
  ativa: boolean;
  onPress: () => void;
}) {
  const cores = useCores();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: ativa }}
      // 56 de largura e a área toda clicável: o alvo passa dos 44 px mesmo com o rótulo pequeno.
      className="w-14 items-center gap-1 py-1 active:opacity-60"
    >
      <Icone nome={icone} tamanho={24} cor={ativa ? cores.texto : cores.apoio} />
      <Text
        className={ativa ? 'font-corpo-negrito text-[11px]' : 'font-corpo-forte text-[11px]'}
        style={{ color: ativa ? cores.texto : cores.apoio }}
      >
        {rotulo}
      </Text>
    </Pressable>
  );
}
