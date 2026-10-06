import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { listPlaces } from '@/db/queries';
import { conquistaDoLocal } from '@/domain/conquistas';
import { sugerirLocais, type Local } from '@/domain/locais';
import { useCores } from '@/theme';

interface Props {
  valor: string;
  onChange: (v: string) => void;
  userId: string | undefined;
}

/**
 * O campo de local, com os lugares que já apareceram no histórico.
 *
 * Continua sendo texto livre — pesqueiro novo aparece toda temporada, e lista fechada
 * envelheceria em um mês. O que mudou é que os lugares de antes ficam a um toque: quem pesca no
 * mesmo açude há dez anos não precisa escrever o nome dele de novo, nem escrever igual.
 *
 * As sugestões aparecem em fila horizontal, acima do teclado, e cada uma mostra quantas capturas
 * já saíram de lá. Esse número não é enfeite: é o progresso da conquista daquele lugar, e vê-lo
 * no momento do registro é o que faz a conquista existir para quem ainda não abriu a tela dela.
 */
export function CampoLocal({ valor, onChange, userId }: Props) {
  const cores = useCores();
  const [locais, setLocais] = useState<Local[]>([]);

  useEffect(() => {
    if (!userId) return;
    let vivo = true;
    void listPlaces(userId).then((l) => {
      if (vivo) setLocais(l);
    });
    return () => {
      vivo = false;
    };
  }, [userId]);

  const sugestoes = sugerirLocais(locais, valor);

  return (
    <>
      <TextInput
        value={valor}
        onChangeText={onChange}
        placeholder="Pesqueiro Recanto, Rio Paranhana..."
        placeholderTextColor={cores.suave}
        className="rounded-2xl border border-borda bg-superficie px-4 py-3 text-base text-texto"
      />

      {sugestoes.length > 0 ? (
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingVertical: 8, paddingRight: 8 }}
        >
          {sugestoes.map((l) => {
            const c = conquistaDoLocal(l);
            return (
              <Pressable
                key={l.chave}
                onPress={() => onChange(l.nome)}
                className="flex-row items-center rounded-full border border-borda px-3 py-1.5 active:opacity-60"
              >
                <Text className="text-sm font-semibold text-cobalto">{l.nome}</Text>
                <Text className="ml-1.5 text-xs text-suave" style={{ fontVariant: ['tabular-nums'] }}>
                  {l.capturas}
                </Text>
                {c.atual ? <Text className="ml-1 text-xs text-suave">· {c.atual.titulo}</Text> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <Text className="mt-1 text-xs text-suave">
        A coordenada exata fica só no seu aparelho. Amigos veem apenas este rótulo.
      </Text>
    </>
  );
}
