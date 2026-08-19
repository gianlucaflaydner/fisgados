module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // O Drizzle gera as migrations como .sql e as importa como string. Sem isto o Metro tenta
    // parsear o SQL como JavaScript e quebra no primeiro CREATE TABLE.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
