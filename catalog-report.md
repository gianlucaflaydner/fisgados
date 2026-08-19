# Relatório de build do catálogo

Gerado em 19/08/2026, 15:54:02 · FishBase v19.04 · catálogo v1

> Arquivo gerado por `npm run catalog:build`. Não editar à mão — a fonte é
> `scripts/catalog/species-source.mts`.

---

## 1. O que ainda precisa de você

O script confere nomenclatura e ordem de grandeza. **Não** confere se a espécie realmente
ocorre onde você pesca, se o nome popular é o que se fala no RS, nem se a faixa de tamanho
bate com a realidade. Isso é a validação 2 do PRD 9.1 e depende de conversa com pescador.

Leve a tabela da seção 4 para essa conversa. As duas perguntas que resolvem quase tudo:
*"falta algum peixe óbvio aqui?"* e *"esse nome é o que vocês falam?"*.

## 2. Erros

Nenhum. Estrutura e nomenclatura conferidas.

## 3. Alertas

- ! cachara: maxLengthCm curado (90 cm) acima do máximo mundial do FishBase (60.5 cm SL → 72 cm TL)
- ! trairao: estimativa no tamanho máximo (10,97 kg) supera o peso máximo registrado no FishBase (4,31 kg) — conferir unidade de a
- ! surubim-do-uruguai: nenhuma relação comprimento-peso em TL no FishBase (0 registro(s) descartado(s)) — não estima peso
- ! guaivira: nenhum estudo alcança 30 cm (o melhor vai até 18.3 cm) — a estimativa é extrapolação
- ! mucum: nenhuma relação comprimento-peso em TL no FishBase (2 registro(s) descartado(s)) — não estima peso
- ! maria-luiza: estimativa no tamanho máximo (232 g) supera o peso máximo registrado no FishBase (72 g) — conferir unidade de a
- ! raia-manteiga: nenhuma relação comprimento-peso em TL no FishBase (0 registro(s) descartado(s)) — não estima peso

## 4. Conferência de peso estimado

A pergunta a fazer para cada linha: **um exemplar desse tamanho pesa isso mesmo?**
É o teste que o SDD seção 5 pede. Um erro de unidade no coeficiente `a` aparece aqui como
um valor dez ou mil vezes fora — não como um valor sutilmente errado.

| Espécie | Médio | Peso estimado | Máximo | Peso estimado | Peso máx. FishBase |
|---|---|---|---|---|---|
| Tilápia | 28 cm | 478 g | 55 cm | 3,26 kg | 4,32 kg |
| Carpa-húngara | 45 cm | 1,54 kg | 90 cm | 12,22 kg | 40,09 kg |
| Carpa-capim | 55 cm | 1,82 kg | 110 cm | 13,23 kg | 45,00 kg |
| Carpa-cabeça-grande | 55 cm | 1,91 kg | 110 cm | 15,82 kg | 40,00 kg |
| Pacu | 32 cm | 606 g | 50 cm | 2,31 kg | — |
| Tambaqui | 45 cm | 2,34 kg | 90 cm | 18,82 kg | 40,00 kg |
| Tambacu | 45 cm | — | 90 cm | — | — |
| Bagre-africano | 45 cm | 655 g | 100 cm | 7,42 kg | 60,00 kg |
| Jundiá | 28 cm | 306 g | 47 cm | 1,48 kg | 4,02 kg |
| Traíra | 32 cm | 439 g | 60 cm | 3,06 kg | 3,80 kg |
| Pintado | 60 cm | 1,58 kg | 120 cm | 14,15 kg | 100,00 kg |
| Cachara | 55 cm | 1,19 kg | 90 cm | 5,63 kg | — |
| Pintachara | 58 cm | — | 100 cm | — | — |
| Dourado | 55 cm | 2,27 kg | 100 cm | 14,57 kg | 31,40 kg |
| Black bass | 30 cm | 377 g | 55 cm | 2,70 kg | 10,09 kg |
| Truta arco-íris | 30 cm | 222 g | 60 cm | 1,86 kg | 25,40 kg |
| Lambari | 10 cm | 15 g | 16 cm | 65 g | — |
| Cará | 16 cm | 77 g | 28 cm | 408 g | — |
| Mandi-amarelo | 25 cm | 155 g | 40 cm | 657 g | 2,35 kg |
| Piava | 30 cm | 357 g | 55 cm | 2,31 kg | 5,75 kg |
| Grumatã | 33 cm | 395 g | 60 cm | 2,29 kg | 7,20 kg |
| Cascudo | 28 cm | 213 g | 50 cm | 1,04 kg | 1,83 kg |
| Peixe-rei-de-lagoa | 25 cm | 447 g | 45 cm | 2,61 kg | — |
| Pescada-branca | 30 cm | 359 g | 55 cm | 2,34 kg | 4,50 kg |
| Trairão | 45 cm | 1,29 kg | 90 cm | 10,97 kg | 4,31 kg |
| Tabarana | 32 cm | 385 g | 55 cm | 1,99 kg | — |
| Surubim-do-Uruguai | 60 cm | — | 90 cm | — | 5,50 kg |
| Baiacu | 13 cm | 48 g | 18 cm | 132 g | — |
| Corvina | 32 cm | 369 g | 60 cm | 2,43 kg | — |
| Papa-terra | 25 cm | 118 g | 45 cm | 746 g | 1,07 kg |
| Bagre-branco | 38 cm | 634 g | 70 cm | 4,28 kg | — |
| Peixe-rei-marinho | 25 cm | 94 g | 45 cm | 568 g | — |
| Tainha | 40 cm | 713 g | 70 cm | 3,62 kg | 9,00 kg |
| Pescada-olhuda | 30 cm | 265 g | 55 cm | 1,43 kg | — |
| Marimbá | 24 cm | 273 g | 40 cm | 1,39 kg | 2,50 kg |
| Guaivira | 30 cm | 133 g | 50 cm | 583 g | 900 g |
| Peixe-espada | 75 cm | 259 g | 130 cm | 1,56 kg | — |
| Anchova | 40 cm | 600 g | 80 cm | 4,47 kg | 14,40 kg |
| Robalo-peva | 40 cm | 606 g | 70 cm | 3,61 kg | 5,00 kg |
| Robalo-flecha | 50 cm | 1,10 kg | 100 cm | 7,97 kg | 24,32 kg |
| Linguado | 36 cm | 505 g | 62 cm | 2,69 kg | — |
| Sororoca | 45 cm | 508 g | 80 cm | 2,54 kg | 6,71 kg |
| Miraguaia | 70 cm | 4,15 kg | 140 cm | 30,95 kg | 51,28 kg |
| Tilápia-vermelha | 28 cm | 478 g | 55 cm | 3,26 kg | 4,32 kg |
| Carpa-espelho | 45 cm | 1,54 kg | 90 cm | 12,22 kg | 40,09 kg |
| Carpa-colorida | 40 cm | 1,08 kg | 80 cm | 8,59 kg | 40,09 kg |
| Carpa-prateada | 50 cm | 1,51 kg | 95 cm | 10,97 kg | 50,00 kg |
| Pirapitinga | 40 cm | 1,32 kg | 75 cm | 9,33 kg | 25,00 kg |
| Bagre-americano | 45 cm | 860 g | 85 cm | 6,30 kg | 26,30 kg |
| Esturjão | 80 cm | 2,55 kg | 150 cm | 17,42 kg | 115,00 kg |
| Lambari-do-rabo-vermelho | 10 cm | 11 g | 16 cm | 44 g | 70 g |
| Lambari-cachorro | 18 cm | 64 g | 30 cm | 325 g | 330 g |
| Birú | 16 cm | 61 g | 25 cm | 241 g | 551 g |
| Cará-do-rabo-amarelo | 11 cm | 25 g | 16 cm | 77 g | — |
| Chanchito | 13 cm | 51 g | 20 cm | 195 g | — |
| Joaninha | 12 cm | 20 g | 20 cm | 100 g | — |
| Muçum | 45 cm | — | 90 cm | — | — |
| Tuvira | 35 cm | 143 g | 65 cm | 925 g | 1,24 kg |
| Tamboatá | 16 cm | 70 g | 25 cm | 254 g | — |
| Cascudo-viola | 28 cm | 629 g | 45 cm | 3,23 kg | — |
| Ximboré | 25 cm | 190 g | 38 cm | 655 g | 629 g |
| Kinguio | 18 cm | 102 g | 35 cm | 703 g | — |
| Castanha | 27 cm | 287 g | 38 cm | 800 g | — |
| Papa-terra-listrado | 25 cm | 139 g | 45 cm | 938 g | 1,38 kg |
| Maria-luiza | 20 cm | 67 g | 29 cm | 232 g | 72 g |
| Pescadinha-real | 28 cm | 192 g | 45 cm | 957 g | — |
| Bagre-amarelo | 25 cm | 144 g | 40 cm | 645 g | — |
| Parati | 28 cm | 201 g | 50 cm | 1,09 kg | — |
| Savelha | 25 cm | 187 g | 38 cm | 693 g | — |
| Cabrinha | 25 cm | 188 g | 40 cm | 862 g | — |
| Abrótea | 30 cm | 217 g | 50 cm | 1,11 kg | — |
| Tira-vira | 32 cm | 135 g | 50 cm | 513 g | — |
| Chicharro | 22 cm | 87 g | 35 cm | 438 g | 500 g |
| Peixe-galo | 28 cm | 262 g | 50 cm | 1,43 kg | 4,60 kg |
| Xerelete | 35 cm | 494 g | 60 cm | 2,31 kg | 5,05 kg |
| Pampo-do-sul | 25 cm | 117 g | 40 cm | 502 g | — |
| Congro | 60 cm | 255 g | 100 cm | 1,45 kg | — |
| Raia-emplastro | 40 cm | 429 g | 60 cm | 1,58 kg | — |
| Raia-manteiga | 50 cm | — | 90 cm | — | — |
| Raia-viola | 70 cm | 1,36 kg | 120 cm | 6,84 kg | — |
| Caçonete | 55 cm | 603 g | 85 cm | 2,27 kg | — |
| Cação-bico-doce | 55 cm | 635 g | 90 cm | 3,02 kg | — |
| Cação-bico-de-cristal | 80 cm | 2,24 kg | 150 cm | 11,97 kg | 44,67 kg |
| Cação-anjo | 70 cm | 3,43 kg | 120 cm | 14,77 kg | — |

## 5. Pendências de produção

- tilapia: 9 estudo(s) descartado(s) por destoarem do consenso
- carpa-hungara: 30 estudo(s) descartado(s) por destoarem do consenso
- carpa-capim: 1 estudo(s) descartado(s) por destoarem do consenso
- carpa-capim: insígnias no fallback — falta redação (PRD 11.6)
- carpa-cabeca-grande: 1 estudo(s) descartado(s) por destoarem do consenso
- carpa-cabeca-grande: insígnias no fallback — falta redação (PRD 11.6)
- pacu: peso máximo do FishBase (20,00 kg para 49 cm) é implausível — ignorado na conferência
- tambaqui: insígnias no fallback — falta redação (PRD 11.6)
- tambacu: híbrido, sem coeficiente próprio — peso real será obrigatório na prática
- tambacu: insígnias no fallback — falta redação (PRD 11.6)
- bagre-africano: 3 estudo(s) descartado(s) por destoarem do consenso
- jundia: 6 estudo(s) descartado(s) por destoarem do consenso
- traira: 3 estudo(s) descartado(s) por destoarem do consenso
- cachara: peso estimado por empréstimo de Pseudoplatystoma corruscans
- cachara: insígnias no fallback — falta redação (PRD 11.6)
- pintachara: híbrido, sem coeficiente próprio — peso real será obrigatório na prática
- pintachara: insígnias no fallback — falta redação (PRD 11.6)
- dourado: 1 estudo(s) descartado(s) por destoarem do consenso
- black-bass: 8 estudo(s) descartado(s) por destoarem do consenso
- truta-arco-iris: 1 estudo(s) descartado(s) por destoarem do consenso
- lambari: coeficiente buscado como "Astyanax altiparanae" — o FishBase v19.04 ainda não separou a espécie
- lambari: 1 estudo(s) descartado(s) por destoarem do consenso
- cara: 2 estudo(s) descartado(s) por destoarem do consenso
- piava: 1 estudo(s) descartado(s) por destoarem do consenso
- grumata: 2 estudo(s) descartado(s) por destoarem do consenso
- cascudo: 1 estudo(s) descartado(s) por destoarem do consenso
- peixe-rei-de-lagoa: 1 estudo(s) descartado(s) por destoarem do consenso
- peixe-rei-de-lagoa: insígnias no fallback — falta redação (PRD 11.6)
- pescada-branca: 1 estudo(s) descartado(s) por destoarem do consenso
- pescada-branca: insígnias no fallback — falta redação (PRD 11.6)
- trairao: peso estimado por empréstimo de Hoplias malabaricus
- trairao: 12 estudo(s) descartado(s) por destoarem do consenso
- tabarana: 1 estudo(s) descartado(s) por destoarem do consenso
- baiacu: 5 estudo(s) descartado(s) por destoarem do consenso
- corvina: 5 estudo(s) descartado(s) por destoarem do consenso
- corvina: peso máximo do FishBase (55 g para 69 cm) é implausível — ignorado na conferência
- papa-terra: 4 estudo(s) descartado(s) por destoarem do consenso
- bagre-branco: 3 estudo(s) descartado(s) por destoarem do consenso
- bagre-branco: insígnias no fallback — falta redação (PRD 11.6)
- tainha: 3 estudo(s) descartado(s) por destoarem do consenso
- pescada-olhuda: insígnias no fallback — falta redação (PRD 11.6)
- marimba: peso estimado por empréstimo de Diplodus sargus
- marimba: 4 estudo(s) descartado(s) por destoarem do consenso
- marimba: insígnias no fallback — falta redação (PRD 11.6)
- guaivira: insígnias no fallback — falta redação (PRD 11.6)
- peixe-espada: 5 estudo(s) descartado(s) por destoarem do consenso
- peixe-espada: peso máximo do FishBase (5,00 kg para 234 cm) é implausível — ignorado na conferência
- anchova: 5 estudo(s) descartado(s) por destoarem do consenso
- robalo-peva: 2 estudo(s) descartado(s) por destoarem do consenso
- robalo-peva: insígnias no fallback — falta redação (PRD 11.6)
- robalo-flecha: 4 estudo(s) descartado(s) por destoarem do consenso
- sororoca: insígnias no fallback — falta redação (PRD 11.6)
- miraguaia: coeficiente buscado como "Pogonias cromis" — o FishBase v19.04 ainda não separou a espécie
- miraguaia: 3 estudo(s) descartado(s) por destoarem do consenso
- tilapia-vermelha: 9 estudo(s) descartado(s) por destoarem do consenso
- carpa-espelho: 30 estudo(s) descartado(s) por destoarem do consenso
- carpa-colorida: 21 estudo(s) descartado(s) por destoarem do consenso
- pirapitinga: insígnias no fallback — falta redação (PRD 11.6)
- bagre-americano: insígnias no fallback — falta redação (PRD 11.6)
- lambari-rabo-vermelho: insígnias no fallback — falta redação (PRD 11.6)
- lambari-cachorro: 2 estudo(s) descartado(s) por destoarem do consenso
- biru: 1 estudo(s) descartado(s) por destoarem do consenso
- biru: insígnias no fallback — falta redação (PRD 11.6)
- cara-rabo-amarelo: peso estimado por empréstimo de Geophagus brasiliensis
- cara-rabo-amarelo: 1 estudo(s) descartado(s) por destoarem do consenso
- cara-rabo-amarelo: insígnias no fallback — falta redação (PRD 11.6)
- chanchito: 1 estudo(s) descartado(s) por destoarem do consenso
- chanchito: insígnias no fallback — falta redação (PRD 11.6)
- joaninha: insígnias no fallback — falta redação (PRD 11.6)
- tuvira: 1 estudo(s) descartado(s) por destoarem do consenso
- tuvira: insígnias no fallback — falta redação (PRD 11.6)
- tamboata: 1 estudo(s) descartado(s) por destoarem do consenso
- tamboata: insígnias no fallback — falta redação (PRD 11.6)
- cascudo-viola: 1 estudo(s) descartado(s) por destoarem do consenso
- cascudo-viola: insígnias no fallback — falta redação (PRD 11.6)
- ximbore: insígnias no fallback — falta redação (PRD 11.6)
- kinguio: 5 estudo(s) descartado(s) por destoarem do consenso
- castanha: insígnias no fallback — falta redação (PRD 11.6)
- papa-terra-listrado: insígnias no fallback — falta redação (PRD 11.6)
- maria-luiza: insígnias no fallback — falta redação (PRD 11.6)
- pescadinha-real: insígnias no fallback — falta redação (PRD 11.6)
- bagre-amarelo: 4 estudo(s) descartado(s) por destoarem do consenso
- bagre-amarelo: insígnias no fallback — falta redação (PRD 11.6)
- parati: 5 estudo(s) descartado(s) por destoarem do consenso
- parati: peso máximo do FishBase (680 g para 91 cm) é implausível — ignorado na conferência
- parati: insígnias no fallback — falta redação (PRD 11.6)
- savelha: insígnias no fallback — falta redação (PRD 11.6)
- cabrinha: 4 estudo(s) descartado(s) por destoarem do consenso
- cabrinha: peso máximo do FishBase (114 g para 45 cm) é implausível — ignorado na conferência
- abrotea: 2 estudo(s) descartado(s) por destoarem do consenso
- abrotea: insígnias no fallback — falta redação (PRD 11.6)
- tira-vira: insígnias no fallback — falta redação (PRD 11.6)
- chicharro: 3 estudo(s) descartado(s) por destoarem do consenso
- chicharro: insígnias no fallback — falta redação (PRD 11.6)
- peixe-galo: 5 estudo(s) descartado(s) por destoarem do consenso
- peixe-galo: insígnias no fallback — falta redação (PRD 11.6)
- xerelete: 1 estudo(s) descartado(s) por destoarem do consenso
- xerelete: insígnias no fallback — falta redação (PRD 11.6)
- pampo: peso estimado por empréstimo de Trachinotus ovatus
- pampo: 1 estudo(s) descartado(s) por destoarem do consenso
- congro: insígnias no fallback — falta redação (PRD 11.6)
- raia-emplastro: insígnias no fallback — falta redação (PRD 11.6)
- raia-manteiga: insígnias no fallback — falta redação (PRD 11.6)
- raia-viola: peso estimado por empréstimo de Pseudobatos productus
- raia-viola: 1 estudo(s) descartado(s) por destoarem do consenso
- caconete: insígnias no fallback — falta redação (PRD 11.6)
- cacao-bico-de-cristal: insígnias no fallback — falta redação (PRD 11.6)
- cacao-anjo: peso estimado por empréstimo de Squatina squatina

- silhuetas: 0/84 desenhadas (SDD seção 8 — comece pelas 16 do álbum de pesqueiros)

## 6. Procedência dos coeficientes

| Espécie | a | b | n | Estudo | Alternativas |
|---|---|---|---|---|---|
| Tilápia | 0.0366 | 2.844 | 1741 | Kaptai Lake, 1995-96 | 12 |
| Carpa-húngara | 0.0173 | 2.993 | 2158 | Flanders (Yser, Scheldt and Meuse drainage basin), 1992-2009 | 144 |
| Carpa-capim | 0.01899 | 2.8623 | 253 | Zhujiang River = Pearl River | 9 |
| Carpa-cabeça-grande | 0.00951 | 3.0475 | 126 | Zhujiang River = Pearl River. | 7 |
| Pacu | 0.0185 | 3 | 2 | Rio Tarija | 0 |
| Tambaqui | 0.0249 | 3.008 | 1993 | Amazonas State | 0 |
| Tambacu | — | — | — | *sem dado em TL* | — |
| Bagre-africano | 0.00617 | 3.04 | 918 | Lake Awassa | 8 |
| Jundiá | 0.0122142 | 3.04 | 98 | Pampa plains lakes, Buenos Aires / 2008-2012 | 11 |
| Traíra | 0.00980453 | 3.09 | 2840 | Parana River | 19 |
| Pintado | 0.00380793 | 3.16 | 347 | Itaipu Reservoir, Paraná, 1983-89 | 5 |
| Cachara | 0.00375978 | 3.16 | 347 | Itaipu Reservoir, Paraná, 1983-89 | 5 |
| Pintachara | — | — | — | *sem dado em TL* | — |
| Dourado | 0.00877752 | 3.11 | 1441 | Parana River | 2 |
| Black bass | 0.00601 | 3.248 | 3174 | Oklahoma | 61 |
| Truta arco-íris | 0.00663932 | 3.063 | 484 | Sacramento River, California | 7 |
| Lambari | 0.0106947 | 3.14 | 3380 | Iguacu River basin / 2004-2009 | 6 |
| Cará | 0.0198641 | 2.98 | 417 | Iguacu River basin / 2004-2009 | 9 |
| Mandi-amarelo | 0.00764526 | 3.08 | 1474 | Itaipu Reservoir, Paraná, 1983-89 | 10 |
| Piava | 0.0100792 | 3.08 | 3317 | Parana River | 5 |
| Grumatã | 0.0135678 | 2.94 | 13968 | Parana River | 15 |
| Cascudo | 0.023839 | 2.73 | 302 | Parana River | 3 |
| Peixe-rei-de-lagoa | 0.0286 | 3 | 2 | Uruguay River (middle reaches) | 0 |
| Pescada-branca | 0.00979 | 3.09 | 7200 | Itaipu Reservoir, Paraná, 1983-89 | 7 |
| Trairão | 0.0100357 | 3.09 | 2840 | Parana River | 10 |
| Tabarana | 0.0105808 | 3.03 | 92 | Taquari River, Paranapanema Basin / 2011-2013. | 0 |
| Surubim-do-Uruguai | — | — | — | *sem dado em TL* | — |
| Baiacu | 0.0177 | 3.086 | 306 | Espirito Santo (0°S - 25°S), 2003-2004 | 0 |
| Corvina | 0.01143 | 2.996 | 4082 | Rio Grande do Sul (28°-34°S) | 9 |
| Papa-terra | 0.00499 | 3.13 | 1118 | Parana´ state coast / 2004 - 2005 | 8 |
| Bagre-branco | 0.00733 | 3.125 | 116 | Rio Grande do Sul (28°-34°S) | 2 |
| Peixe-rei-marinho | 0.00481 | 3.068 | 53 | Rio Grande do Sul (28°-34°S) | 1 |
| Tainha | 0.01597 | 2.9022 | 967 | Southern region (Lagoa dos Patos estuary), Rio Grande do Sul | 9 |
| Pescada-olhuda | 0.02105 | 2.776 | 6598 | Rio Grande do Sul (28°-34°S) | 5 |
| Marimbá | 0.0111 | 3.181 | 1178 | Azores Archipelago / 1997-1999 | 17 |
| Guaivira | 0.0069 | 2.9 | 30 | Parana´ state coast / 2004 - 2005 | 0 |
| Peixe-espada | 0.0002 | 3.26 | 1307 | Peninsular west coast | 19 |
| Anchova | 0.0136 | 2.899 | 1771 | Rio Grande do Sul (28°-34°S) | 4 |
| Robalo-peva | 0.0047 | 3.19 | 39 | Guandu River / 2010-2011 | 0 |
| Robalo-flecha | 0.01518 | 2.86 | 715 | Southeast Zone (lagoons) | 2 |
| Linguado | 0.00822 | 3.077 | 439 | Rio Grande do Sul (28°-34°S) | 1 |
| Sororoca | 0.0119368 | 2.8 | 791 | Carribean coast | 4 |
| Miraguaia | 0.01858 | 2.899 | 256 | Rio Grande do Sul (28°-34°S) | 0 |
| Tilápia-vermelha | 0.0366 | 2.844 | 1741 | Kaptai Lake, 1995-96 | 12 |
| Carpa-espelho | 0.0173 | 2.993 | 2158 | Flanders (Yser, Scheldt and Meuse drainage basin), 1992-2009 | 144 |
| Carpa-colorida | 0.0173 | 2.993 | 2158 | Flanders (Yser, Scheldt and Meuse drainage basin), 1992-2009 | 153 |
| Carpa-prateada | 0.00838 | 3.093 | 416 | Heilongjiang River = Amur River | 8 |
| Pirapitinga | 0.0134028 | 3.116 | 51 | Madiera River, Amazon /  2008-2011 | 0 |
| Bagre-americano | 0.00571 | 3.132 | 988 | Georgia, rivers | 11 |
| Esturjão | 0.0039 | 3.0559 | 4003 | NW Black Sea | 2 |
| Lambari-do-rabo-vermelho | 0.0118875 | 2.96 | 3595 | Taquari River, Paranapanema Basin / 2011-2013. | 7 |
| Lambari-cachorro | 0.0063 | 3.19 | 140 | Delta State Park Jacui / 2008-2009 | 2 |
| Birú | 0.0112 | 3.1 | 889 | Delta State Park Jacui / 2008-2009 | 5 |
| Cará-do-rabo-amarelo | 0.0198641 | 2.98 | 417 | Iguacu River basin / 2004-2009 | 10 |
| Chanchito | 0.0186 | 3.09 | 18 | Delta State Park Jacui / 2008-2009 | 2 |
| Joaninha | 0.0085 | 3.13 | 43 | Delta State Park Jacui / 2008-2009 | 2 |
| Muçum | — | — | — | *sem dado em TL* | — |
| Tuvira | 0.0031 | 3.02 | 70 | Itaipu Reservoir, Paraná, 1983-89 | 3 |
| Tamboatá | 0.0231228 | 2.89 | 523 | Taquari River, Paranapanema Basin / 2011-2013. | 6 |
| Cascudo-viola | 0.0064 | 3.45 | 72 | Chasqueiro Stream, Arroio Grande | 0 |
| Ximboré | 0.0138031 | 2.96 | 460 | Taquari River, Paranapanema Basin / 2011-2013. | 1 |
| Kinguio | 0.0234 | 2.9 | 251236 | Alabama | 14 |
| Castanha | 0.0148 | 2.996 | 14741 | Rio Grande do Sul (28°-34°S) | 3 |
| Papa-terra-listrado | 0.00402 | 3.247 | 245 | Rio Grande do Sul (28°-34°S) | 0 |
| Maria-luiza | 0.00283 | 3.36 | 2884 | Parana´ state coast / 2004 - 2005 | 4 |
| Pescadinha-real | 0.00238 | 3.39 | 739 | Rio Grande and southern Brazil | 2 |
| Bagre-amarelo | 0.00498 | 3.191 | 423 | Paraná (0°S - 25°S), 2003-2004 | 6 |
| Parati | 0.012 | 2.919 | 1005 | Marica, Sacuarema, Araruama coastal lagoons, South western Brazil / 2011. | 10 |
| Savelha | 0.0081 | 3.122 | 874 | Rio Grande do Sul (28°-34°S) | 0 |
| Cabrinha | 0.0056 | 3.238 | 1076 | Rio Grande do Sul (28°-34°S) | 6 |
| Abrótea | 0.00398 | 3.206 | 252 | Rio Grande do Sul (28°-34°S) | 5 |
| Tira-vira | 0.00415 | 2.997 | 247 | Rio Grande do Sul (28°-34°S) | 2 |
| Chicharro | 0.00194 | 3.467 | 123 | Rio Grande do Sul (28°-34°S) | 5 |
| Peixe-galo | 0.0156 | 2.92 | — | São Paulo and Santa Catarina, 1997-98 | 0 |
| Xerelete | 0.0188923 | 2.861 | 380 | Central coast, 1993-2000 | 8 |
| Pampo-do-sul | 0.0055 | 3.096 | 82 | Algarve coast, Portugal / 1998-00 | 2 |
| Congro | 0.00022 | 3.41 | 366 | Rio Grande do Sul (28°-34°S) | 0 |
| Raia-emplastro | 0.003 | 3.218 | 112 | Punta del Diablo / 2006-2010. | 2 |
| Raia-manteiga | — | — | — | *sem dado em TL* | — |
| Raia-viola | 0.00396 | 3 | 1 | (não informada) | 0 |
| Caçonete | 0.003 | 3.047 | 616 | Punta del Diablo / 2006-2010. | 2 |
| Cação-bico-doce | 0.00193 | 3.17 | 8266 | southeastern Brazil / 1996-2003 | 2 |
| Cação-bico-de-cristal | 0.0188 | 2.6671 | 510 | (não informada) | 11 |
| Cação-anjo | 0.0346 | 2.708 | 8 | North Sea & West Coast, 1956-84 | 0 |
