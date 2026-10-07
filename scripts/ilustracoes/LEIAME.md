# Fisgados — ilustrações das 84 espécies

- `assets/ilustracoes/<id>.png`: 1024×640, fundo transparente. Use no app.
- `assets/ilustracoes-svg/<id>.svg`: vetor original (512×320), para web ou para editar.
- `ilustracoes.ts`: mapa `id -> require(...)`, no mesmo formato de `src/catalog/fotos.ts`. Coloque em `src/catalog/`.
- `gerador/`: o script que desenha tudo. Para ajustar uma espécie, mude `params.py` e rode:
  `pip install cairosvg && python gerador/run.py all` (ou `python gerador/run.py traira,pacu`).

Estilo: perfil lateral com a cabeça à esquerda (raias e cação-anjo vistos de cima). Contorno #0B1A1E de 3 px,
corpo em degradê dorso → flanco → ventre, escamas sutis, brilho no dorso. Peixe centralizado num quadro 16:10.

Carta bloqueada: use o mesmo PNG com `tintColor` preto e opacidade ~0,4 — vira a silhueta exata da espécie.

As ilustrações são desenhos originais. As fotos de `assets/especies` (com os créditos do CREDITOS.md) e o conhecimento
de campo de cada espécie serviram de referência para forma, nadadeiras e padrão de cores.
