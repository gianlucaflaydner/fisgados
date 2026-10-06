/** @type {import('tailwindcss').Config} */

/**
 * As cores não moram aqui: moram em `src/global.css`, como variáveis, com um valor por tema. Este
 * arquivo só dá nome a elas. Assim `bg-fundo` continua sendo `bg-fundo` em toda tela e passa a
 * obedecer ao tema sem que nenhuma classe precise ser reescrita.
 *
 * `<alpha-value>` mantém os modificadores de opacidade funcionando (`border-borda/60`).
 *
 * As fontes vêm das três famílias do guia (`src/theme/cores.ts`): `font-display` para números e
 * nomes de espécie, `font-corpo` para o texto de trabalho, `font-cientifico` só para o nome
 * científico.
 */
const cor = (nome) => `rgb(var(--cor-${nome}) / <alpha-value>)`;

module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'class' porque o tema é escolha do usuário, com "seguir o sistema" como padrão — e não uma
  // imposição do sistema operacional. Quem opera a classe é o NativeWind, via colorScheme.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Álbum de águas profundas — ver src/theme/cores.ts.
        fundo: cor('fundo'),
        superficie: cor('superficie'),
        elevado: cor('elevado'),
        campo: cor('campo'),
        borda: cor('borda'),
        'borda-forte': cor('borda-forte'),
        texto: cor('texto'),
        suave: cor('suave'),
        apoio: cor('apoio'),
        // Ação, e só ela. Laranja de isca nos dois temas.
        destaque: {
          DEFAULT: cor('destaque'),
          texto: cor('destaque-texto'),
          baixo: cor('destaque-baixo'),
        },
        // A isca como texto — escurecida no tema claro, para se ler sobre papel.
        acao: cor('acao'),
        perigo: cor('perigo'),
        // Raridade — PRD seção 10. O que é fixo é o matiz; a claridade acompanha o tema.
        comum: cor('comum'),
        incomum: cor('incomum'),
        raro: cor('raro'),
        lendario: cor('lendario'),
        // Graus de insígnia — PRD 11.3.
        bronze: cor('bronze'),
        prata: cor('prata'),
        ouro: cor('ouro'),
        platina: cor('platina'),
        diamante: cor('diamante'),
      },
      fontFamily: {
        display: ['BricolageGrotesque_800ExtraBold'],
        'display-medio': ['BricolageGrotesque_700Bold'],
        corpo: ['InstrumentSans_400Regular'],
        'corpo-medio': ['InstrumentSans_500Medium'],
        'corpo-forte': ['InstrumentSans_600SemiBold'],
        'corpo-negrito': ['InstrumentSans_700Bold'],
        cientifico: ['InstrumentSerif_400Regular_Italic'],
      },
      borderRadius: {
        selo: '8px',
        campo: '14px',
        botao: '16px',
        carta: '18px',
        painel: '24px',
      },
    },
  },
  plugins: [],
};
