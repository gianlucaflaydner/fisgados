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
 * A barra é uma ilha flutuante, com margem lateral e cantos de 24. O botão de registrar fica no
 * meio dela, em laranja e maior que os outros itens: é a ação mais repetida do app, e no meio é
 * onde o polegar chega primeiro.
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

/** O botão de registrar: mais largo e mais alto que os outros itens, porque é a ação da tela. */
const TAMANHO_DO_BOTAO = 64;
const ALTURA_DO_BOTAO = 48;

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
     * A barra inteira numa peça só, **sem sombra em lugar nenhum**.
     *
     * O guia desenhava o botão de registrar subindo para fora da barra, flutuando sobre ela. Na
     * tela isso só funcionava com sombra, e a sombra teimava em aparecer por cima do laranja —
     * três arranjos diferentes de camada e elevação não resolveram. Um véu escuro sobre a ação
     * principal do app é defeito pior do que um botão alinhado com os outros.
     *
     * Então o botão voltou para a fila, no meio dos quatro ícones, onde sempre esteve no fluxo do
     * dedo: continua sendo o maior alvo e a única cor de ação da tela, e agora não há camada
     * nenhuma acima dele. Quem separa a barra do fundo é a borda.
     */
    <View
      className="absolute inset-x-3 flex-row items-center justify-between rounded-painel border border-borda px-3 py-2"
      style={{ bottom: insets.bottom + 10, backgroundColor: cores.campo }}
    >
      {ABAS.slice(0, 2).map((a, i) => (
        <ItemDaAba key={a.rota} {...a} ativa={estado === i} onPress={() => router.navigate(a.rota)} />
      ))}

      <Pressable
        onPress={registrar}
        accessibilityRole="button"
        accessibilityLabel="Registrar captura"
        className="items-center justify-center rounded-[18px] active:opacity-85"
        style={{
          height: ALTURA_DO_BOTAO,
          width: TAMANHO_DO_BOTAO,
          backgroundColor: cores.destaque,
          // O degrau do guia: é borda, não sombra — fica embaixo do botão e não vaza para cima.
          borderBottomWidth: 4,
          borderBottomColor: cores.destaqueBaixo,
        }}
      >
        <Icone nome="mais" tamanho={28} cor={cores.destaqueTexto} traco={2.6} />
      </Pressable>

      {ABAS.slice(2).map((a, i) => (
        <ItemDaAba key={a.rota} {...a} ativa={estado === i + 2} onPress={() => router.navigate(a.rota)} />
      ))}
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
