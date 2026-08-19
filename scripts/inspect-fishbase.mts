/**
 * Utilitário de exploração: mostra as colunas de cada tabela do FishBase e uma amostra de
 * linhas para uma espécie conhecida. Serve para conferir nomes de coluna antes de confiar
 * neles no build-catalog, e para auditar um coeficiente estranho depois.
 *
 *   npm run catalog:inspect                            # colunas de todas as tabelas
 *   npm run catalog:inspect -- Salminus brasiliensis   # + amostra da espécie
 */

import { loadTable, num, str, tableColumns, tableRowCount, type Row } from './lib/fishbase.mts';

async function main() {
  const [genus, species] = process.argv.slice(2);

  for (const table of ['species', 'poplw', 'popchar', 'synonyms'] as const) {
    const cols = await tableColumns(table);
    const rows = await tableRowCount(table);
    console.log(`\n=== ${table} — ${rows.toLocaleString('pt-BR')} linhas, ${cols.length} colunas`);
    console.log(cols.join(', '));
  }

  if (!genus || !species) return;

  console.log(`\n\n=== ${genus} ${species}\n`);

  const speciesRows = await loadTable('species');
  const match = speciesRows.filter(
    (r) =>
      str(r.Genus).toLowerCase() === genus.toLowerCase() &&
      str(r.Species).toLowerCase() === species.toLowerCase(),
  );

  if (match.length === 0) {
    console.log('não encontrado em species — pode ser sinônimo, ver synonyms');
    return;
  }

  const s = match[0] as Row;
  console.log('SpecCode:', s.SpecCode, '| FBname:', s.FBname);
  console.log('Length:', s.Length, '| LTypeMaxM:', s.LTypeMaxM, '| CommonLength:', s.CommonLength);
  console.log('Weight (g):', s.Weight);

  const lw = (await loadTable('poplw')).filter((r) => r.SpecCode === s.SpecCode);
  console.log(`\npoplw — ${lw.length} registros:`);
  for (const r of lw.slice(0, 25)) {
    console.log(
      `  a=${String(r.a).padEnd(12)} b=${String(r.b).padEnd(8)} tipo=${str(r.Type).padEnd(4)}` +
        ` n=${String(num(r.Number) ?? '-').padEnd(7)} ${str(r.Locality).slice(0, 45)}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
