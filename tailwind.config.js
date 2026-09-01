/** @type {import('tailwindcss').Config} */

/**
 * As cores não moram mais aqui: moram em `src/global.css`, como variáveis, com um valor por tema.
 * Este arquivo só dá nome a elas. Assim `bg-fundo` continua sendo `bg-fundo` em toda tela e passa
 * a obedecer ao tema sem que nenhuma classe precise ser reescrita.
 *
 * `<alpha-value>` mantém os modificadores de opacidade funcionando (`border-borda/60`).
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
        // Papel de dia, água funda de madrugada — ver src/theme/cores.ts.
        fundo: cor('fundo'),
        superficie: cor('superficie'),
        elevado: cor('elevado'),
        borda: cor('borda'),
        texto: cor('texto'),
        suave: cor('suave'),
        // Identidade: marca, contador, links. Nunca é botão.
        cobalto: cor('cobalto'),
        // Ação, e só ela. Laranja de boia nos dois temas.
        destaque: {
          DEFAULT: cor('destaque'),
          texto: cor('destaque-texto'),
        },
        perigo: cor('perigo'),
        // Raridade — PRD seção 10. O que é fixo é o matiz; a claridade acompanha o tema.
        comum: cor('comum'),
        incomum: cor('incomum'),
        raro: cor('raro'),
        lendario: cor('lendario'),
        // Graus de insígnia — PRD 11.3. Usados a partir da Etapa 5.
        bronze: cor('bronze'),
        prata: cor('prata'),
        ouro: cor('ouro'),
        platina: cor('platina'),
        diamante: cor('diamante'),
      },
    },
  },
  plugins: [],
};
