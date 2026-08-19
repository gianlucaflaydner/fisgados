/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Água parada de açude ao amanhecer. O app é escuro porque se pesca no escuro.
        fundo: '#0B1F1A',
        superficie: '#122E27',
        elevado: '#183A31',
        borda: '#1E453B',
        texto: '#E8F0ED',
        suave: '#8FA8A0',
        // Ação. Escolhida para não colidir com nenhuma cor de raridade.
        destaque: '#35D6A4',
        perigo: '#E06A5A',
        // Raridade — PRD seção 10.
        comum: '#7C9A8E',
        incomum: '#4A9DE0',
        raro: '#A472E8',
        lendario: '#E0A82E',
        // Graus de insígnia — PRD 11.3. Usados a partir da Etapa 5.
        bronze: '#A15C2F',
        prata: '#B9C3CC',
        ouro: '#E0A82E',
        platina: '#CFE4E8',
        diamante: '#8AB6FF',
      },
    },
  },
  plugins: [],
};
