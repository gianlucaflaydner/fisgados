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

/** 60 px: o maior alvo da tela, e a medida que o vão do meio da barra reserva. */
const TAMANHO_DO_BOTAO = 60;

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
     * Três camadas irmãs, e o botão de registrar **fora** da barra.
     *
     * No Android a `elevation` desenha a sombra e também decide a ordem de pintura — ordem que
     * ignora a ordem do JSX. Enquanto o botão foi filho da barra, ele herdava o contexto de
     * desenho dela e aparecia por baixo da sua sombra, com um véu escuro sobre o laranja.
     * Tirá-lo de dentro e dar a ele a maior elevação da pilha é o que resolve de vez: agora não
     * existe camada acima dele para projetar sombra nenhuma.
     *
     * O `box-none` deixa o toque atravessar o espaço vazio em volta da barra e chegar à tela.
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
          elevation: 6,
        }}
      />

      {/*
        Camada 2: os quatro itens. Elevação maior que a do fundo, senão eles somem atrás dele —
        o mesmo mecanismo, ao contrário. O vão do meio é o lugar reservado ao botão, que não é
        filho desta linha.
      */}
      <View
        className="flex-row items-end justify-between px-3.5 pb-2.5 pt-2.5"
        style={{ elevation: 10, zIndex: 1 }}
      >
        {ABAS.slice(0, 2).map((a, i) => (
          <ItemDaAba key={a.rota} {...a} ativa={estado === i} onPress={() => router.navigate(a.rota)} />
        ))}

        <View style={{ width: TAMANHO_DO_BOTAO }} />

        {ABAS.slice(2).map((a, i) => (
          <ItemDaAba key={a.rota} {...a} ativa={estado === i + 2} onPress={() => router.navigate(a.rota)} />
        ))}
      </View>

      {/* Camada 3: o botão de registrar, por cima de todo o resto. */}
      <Pressable
        onPress={registrar}
        accessibilityRole="button"
        accessibilityLabel="Registrar captura"
        className="absolute items-center justify-center rounded-[20px] active:opacity-85"
        style={{
          height: TAMANHO_DO_BOTAO,
          width: TAMANHO_DO_BOTAO,
          // Centralizado na barra e subindo metade da própria altura para fora dela.
          left: '50%',
          marginLeft: -TAMANHO_DO_BOTAO / 2,
          top: -TAMANHO_DO_BOTAO / 2,
          backgroundColor: cores.destaque,
          borderBottomWidth: 5,
          borderBottomColor: cores.destaqueBaixo,
          elevation: 24,
          zIndex: 3,
        }}
      >
        <Icone nome="mais" tamanho={28} cor={cores.destaqueTexto} traco={2.6} />
      </Pressable>
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
