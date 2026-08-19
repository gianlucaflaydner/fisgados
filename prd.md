# Product Requirements Document (PRD)
## Fisgados — Álbum de capturas para pescadores do Sul

**Versão:** 1.2 · agosto/2026

> **1.1** acrescentou o sistema de insígnias (seção 11).
> **1.2** reverteu o princípio 5 — o álbum passa a ser também um guia da ictiofauna do Sul —
> e com ele o catálogo foi de 50 para 91 cartas, ganhando variedades e eixo de medida por carta.
**Status:** definição de MVP
**Autor:** (você)

> *Fisgados* é um nome de trabalho. Alternativas consideradas: Pescadex, Álbum de Pesca,
> Anzol. A decisão de nome não bloqueia o desenvolvimento.

---

## 1. Visão do produto

Um aplicativo mobile onde o pescador registra cada peixe que captura — com foto, espécie,
comprimento e local — e vai **desbloqueando espécies em um álbum ilustrado**, no formato de
uma coleção. Entre amigos, as capturas alimentam rankings por espécie, por tamanho e por
quantidade de espécies desbloqueadas.

A identificação da espécie é assistida por IA: o pescador fotografa, o app sugere os candidatos
mais prováveis dentro do catálogo regional, e o pescador confirma.

Sobre o álbum roda um segundo eixo de progressão: as **insígnias** (seção 11). O álbum premia
*variedade*; as insígnias premiam *volume, tamanho e constância* — inclusive de quem só pesca
tilápia no mesmo açude há dez anos.

**Proposta de valor:** transformar pescarias esporádicas em uma coleção contínua, que dá motivo
para voltar ao app mesmo nas semanas em que não se pesca.

---

## 2. O problema que o produto resolve

Pescaria tem frequência baixa — o pescador amador sai entre 10 e 20 vezes por ano. Isso derruba
qualquer aplicativo que dependa de uso recorrente, e é a principal razão pela qual nenhum app de
pesca brasileiro conseguiu tração relevante.

Três problemas concretos que o produto ataca:

1. **O registro se perde.** As fotos ficam espalhadas na galeria e no WhatsApp, sem espécie, sem
   medida, sem data. Um ano depois ninguém lembra onde pegou o quê.
2. **Não há motivo para voltar entre pescarias.** Um álbum incompleto cria esse motivo: ver o que
   falta, planejar onde conseguir, acompanhar o grupo.
3. **A disputa entre amigos acontece na base da palavra.** "O meu era maior" não tem árbitro.
   Um registro com foto, data e medida resolve — e é justamente a parte divertida.

**O que o produto NÃO tenta resolver:** encontrar pontos de pesca, previsão de mordida,
reserva de pesqueiro, venda de equipamento, legislação e defeso. Tudo isso é escopo de outros
produtos e está explicitamente fora (seção 7.4).

---

## 3. Princípios de produto

Estes princípios decidem discussões futuras. Quando houver dúvida sobre uma funcionalidade,
volte aqui.

1. **A integridade do álbum vale mais que a conveniência.** Um desbloqueio errado corrompe a
   coleção inteira. Sempre prefira pedir confirmação a adivinhar.
2. **A IA sugere, o humano decide.** A IA nunca é a autoridade final sobre a espécie.
3. **Funciona sem sinal.** Pescaria acontece onde não há rede. Registrar uma captura offline é
   requisito, não melhoria.
4. **O grupo é a unidade social, não o mundo.** Rankings são entre amigos. Não existe ranking
   global no MVP e provavelmente nunca existirá.
5. **O álbum é também um guia da ictiofauna do Sul.** Ele lista o que se pesca na região, não
   apenas o que dá para colecionar em pouco tempo. Quem abre o app tem que sair sabendo que
   existe um peixe-anjo enterrado na areia da praia que ele frequenta.

   *Esta decisão substitui a formulação original ("um álbum completável vale mais que um álbum
   completo", 50 cartas). O que sustenta a progressão passa a ser completar **um álbum** e as
   linhas de insígnia, não a coleção inteira. O limite continua sendo real: entra o que um
   pescador amador do Sul de fato captura, e nada além disso — um peixe que ninguém pega é uma
   carta que ninguém desbloqueia, e ensinar errado é pior que não ensinar.*
6. **Registrar uma captura leva menos de 30 segundos.** Com o peixe na mão, molhado, com pressa.

---

## 4. Público-alvo

**v1 (agora):** o autor e seu grupo de amigos. Pescadores amadores do Rio Grande do Sul, com
saídas em pesqueiros, açudes, rios e litoral. Entre 5 e 20 usuários.

**v2 (se houver interesse):** grupos de amigos pescadores do Sul do Brasil, atraídos por
indicação direta de quem já usa.

Fora do público: pescador profissional, pescador de expedição na Amazônia/Pantanal, competidor
de circuito oficial.

---

## 5. Personas

**Rafael, 24, o colecionador.** Pesca em pesqueiro uma vez por mês e em açude quando dá.
Gosta de estatística e de completar coisas. É quem vai abrir o app na terça-feira à noite só para
olhar o álbum. É o usuário que sustenta o produto.

**Diego, 31, o competitivo.** Só liga para o ranking. Registra a captura na hora para mandar o
card no grupo do WhatsApp. É o motor de distribuição.

**Marcos, 47, o casual.** Pesca duas ou três vezes por ano, com a família. Vai registrar a
tilápia e o cará e sumir por seis meses. Precisa que o registro seja rápido e que o app não
cobre nada dele. É o teste de simplicidade.

---

## 6. Fluxos principais

### 6.1 Registrar uma captura (fluxo central)

1. Usuário abre o app e toca no botão único e permanente **"Registrar captura"**.
2. Câmera abre direto (sem tela intermediária). Foto tirada ou escolhida da galeria.
3. O app envia a foto para identificação e, **em paralelo**, já mostra o formulário — o usuário
   não espera a IA para começar a preencher.
4. Retorna a sugestão: até 3 espécies candidatas, ordenadas, com o nível de confiança.
   - Usuário toca na correta → espécie definida.
   - Nenhuma serve → abre o seletor manual do catálogo, com busca por nome popular.
   - Sem internet → vai direto ao seletor manual, e a identificação por IA fica pendente
     para quando sincronizar (o usuário pode ignorar a sugestão depois).
5. Usuário informa a **medida em cm** (obrigatória) — comprimento total para quase tudo, largura
   do disco para arraia, com o rótulo do campo vindo da carta. O peso estimado aparece
   automaticamente, quando a espécie tem coeficiente. Campo de peso real é opcional.
6. Local é capturado por GPS em segundo plano. O usuário escolhe o rótulo do pesqueiro/rio, ou
   deixa em branco.
7. Salva. Se a espécie for nova no álbum, aparece a **animação de desbloqueio**.

**Meta:** passos 1 a 7 em menos de 30 segundos, com uma mão.

### 6.2 Consultar o álbum

Grade de cartas por álbum regional. Espécie não capturada aparece como silhueta cinza com o nome
popular visível; capturada aparece colorida, com a foto do usuário, a data da primeira captura e
o recorde pessoal. Tocar na carta abre a ficha da espécie.

### 6.3 Amigos e ranking

Usuário gera um código de convite (link curto). O amigo abre o link, instala e é vinculado.
A partir daí ambos veem: ranking de maior exemplar por espécie, ranking de total de espécies
desbloqueadas e ranking de capturas no mês.

### 6.4 Compartilhar

Após uma captura ou um desbloqueio, botão de compartilhar gera uma **imagem** (card) com a foto,
espécie, medida, data e a marca do app. O destino natural é o grupo do WhatsApp.

---

## 7. Funcionalidades

### 7.1 Must have (MVP)

| # | Funcionalidade | Observação |
|---|---|---|
| F01 | Registro de captura com foto | Câmera e galeria |
| F02 | Identificação assistida por IA | Top-3 candidatos, restrito ao catálogo regional |
| F03 | Seleção manual de espécie | Busca por nome popular; sempre disponível |
| F04 | Medida obrigatória, peso estimado | Fórmula por espécie; eixo de medida vem da carta (RN04) |
| F05 | Peso real opcional | Sobrescreve o estimado na exibição |
| F06 | Geolocalização automática | Silenciosa, com opção de desligar |
| F07 | Álbum com silhuetas e desbloqueio | Três álbuns regionais |
| F08 | Ficha da espécie | Nome científico, tamanho médio, curiosidade, habitat |
| F09 | Funcionamento offline completo | Fila local + sincronização |
| F10 | Amigos por link de convite | Sem busca por nome ou telefone |
| F11 | Rankings do grupo | Por espécie, por total desbloqueado, por mês |
| F12 | Card compartilhável em imagem | Captura e desbloqueio |
| F13 | Histórico pessoal de capturas | Lista com filtro por espécie e por data |
| F14 | Autenticação | Login simples, um dispositivo por conta no MVP |
| F15 | Metadados para insígnias | Timestamp completo da captura e flag de registro offline (seção 11.14) |

### 7.2 Should have (v1.1)

- **Sistema de insígnias** completo — cinco graus, seis famílias (seção 11)
- Edição e exclusão de captura registrada
- Estatísticas pessoais (espécie mais capturada, melhor mês, maior exemplar geral)
- Marcação de "pescado e solto"

### 7.3 Could have (futuro)

- Álbuns de outras regiões, desbloqueados por geolocalização ao viajar
- Registro de captura por outro membro do grupo como testemunha
- Exportação do álbum como página web compartilhável
- Modo "expedição": agrupar capturas de uma mesma pescaria

### 7.4 Won't have (decisão explícita)

- Ranking nacional ou entre desconhecidos
- Feed social, curtidas e comentários
- Mapa público de pontos de pesca
- Marketplace, loja ou afiliados
- Reserva de pesqueiro
- Previsão de mordida ou tábua de marés

---

## 8. Regras de negócio

**RN01 — Desbloqueio.** Uma espécie é desbloqueada na primeira captura confirmada pelo usuário.
O desbloqueio é permanente e não é revertido se a captura for excluída — apenas o recorde é
recalculado.

**RN02 — Autoridade sobre a espécie.** A espécie registrada é sempre a escolhida pelo usuário.
A sugestão da IA é armazenada separadamente, para medir acurácia, mas nunca sobrescreve a escolha.

**RN03 — Confiança mínima.** Se a maior confiança retornada pela IA for inferior a 40%, o app não
exibe sugestão e abre o seletor manual diretamente. Sugestão ruim é pior que nenhuma sugestão.

**RN04 — Medida.** Obrigatória, em centímetros, entre 5 e 250. Fora dessa faixa, o app pede
confirmação antes de salvar.

O **eixo** da medida vem da carta, não é fixo. Quase todas as espécies usam comprimento total, do
focinho à ponta da cauda. As arraias verdadeiras usam **largura do disco** — ninguém mede uma
arraia até a ponta do rabo, e pedir isso produziria um número que o próprio pescador não
conseguiria repetir. A tela de registro troca o rótulo do campo conforme a carta, e a ficha da
espécie mostra onde medir.

**RN05 — Peso estimado.** Calculado por `P = a × C^b`, com os coeficientes da espécie. Sempre
exibido com o rótulo "estimado". Se o usuário informar peso real, este passa a ser o valor
oficial para ranking, e o estimado deixa de ser exibido.

**RN06 — Ranking.** Ordena por peso quando houver peso real em todos os registros comparados;
caso contrário, ordena por comprimento. Comprimento é o critério padrão, por ser sempre medido.

**RN07 — Empate.** Vence o registro mais antigo.

**RN08 — Escopo do ranking.** Contempla apenas o usuário e seus amigos confirmados. Não há
agregação nacional nem exibição de dados de terceiros.

**RN09 — Privacidade de localização.** A coordenada exata nunca é exibida para amigos. Apenas o
rótulo do local (ex.: "Pesqueiro Recanto", "Rio Paranhana") é compartilhado, e apenas se o
usuário preencher. Coordenada bruta permanece privada e é usada só para estatística pessoal.

**RN10 — Fotos.** Pertencem ao usuário. São visíveis para os amigos vinculados e para mais
ninguém. Não há perfil público.

**RN11 — Álbum ativo.** O usuário pode alternar entre os três álbuns regionais livremente. Não há
bloqueio por localização no MVP.

**RN12 — Espécie fora do catálogo.** Se o usuário capturar algo que não está no catálogo, pode
registrar como "Não identificado", com foto e medida. O registro conta no histórico, mas não
desbloqueia carta nem entra em ranking por espécie.

> As regras RN13 a RN21, específicas de insígnias, estão na seção 11.11.

---

## 9. O catálogo — álbuns do Sul

Três álbuns, **91 cartas** e 84 espécies distintas. Cada carta tem nome popular (o que o
pescador de fato fala), apelidos regionais, nome científico, raridade, faixa de tamanho, eixo de
medida e coeficientes de estimativa de peso.

> **A lista canônica é `src/catalog/species.json`**, gerada por `npm run catalog:build` a partir da
> curadoria em `scripts/catalog/species-source.mts`. Este documento não repete as 93 linhas — uma
> segunda cópia só serviria para divergir da primeira. A auditoria de cada build fica em
> `catalog-report.md`.

| Álbum | Cartas | O que cobre |
|---|---|---|
| Pesqueiros do Sul | 23 | o que se estoca em pesque-pague: tilápias, as seis carpas, redondos, bagres, surubins, truta |
| Rios e açudes do Sul | 30 | ictiofauna nativa da bacia do Uruguai e das lagoas, mais os invasores estabelecidos |
| Costa e lagoas do Sul | 38 | praia, molhe, estuário e Lagoa dos Patos, incluindo raias e cações |

Sete espécies aparecem em dois álbuns (traíra, tilápia, jundiá, carpa-húngara, bagre-africano,
dourado e black bass), por isso 91 cartas para 84 espécies.

**Distribuição de raridade:** 31 comuns, 32 incomuns, 18 raras, 3 lendárias.

### 9.1 Três decisões de modelagem que a curadoria obrigou

**Variedade é carta, não espécie.** Carpa-espelho (a "carpa israel"), carpa-colorida (koi) e
tilápia-vermelha são a mesma espécie da carpa-húngara e da tilápia. São cartas próprias porque o
pescador as reconhece como peixes diferentes — e o álbum é sobre reconhecimento, não taxonomia.
Cada uma tem silhueta e linha de insígnia próprias (ver RN15).

**Nem todo peixe se mede pelo comprimento.** Arraia se mede pela largura do disco: ninguém mede
do focinho à ponta do rabo, e exigir isso produziria número que ninguém consegue repetir. Cada
carta declara seu eixo de medida, e a tela de registro troca o rótulo do campo (ver RN04).

**Estimar mal é pior que não estimar.** Cinco cartas ficam sem peso estimado por falta de estudo
confiável: os dois híbridos de pesqueiro, o surubim-do-Uruguai, o muçum e a raia-manteiga. Nesses
casos o app pede o peso real e não exibe estimativa. Outras sete usam coeficiente emprestado de
uma espécie congênere, e a ficha diz isso.

### 9.2 Ressalva importante sobre o catálogo

O catálogo foi montado a partir de conhecimento geral de ictiofauna do Sul e das espécies
usualmente estocadas em pesqueiros da região. **Antes de virar dado de produção, ele precisa de
duas validações:**

1. **Nomenclatura científica** conferida no FishBase ou no Catálogo de Peixes do Brasil —
   vários gêneros sofreram revisão taxonômica recente (o caso de *Megaleporinus*, antes
   *Leporinus*, é o mais evidente aqui). ✅ *Feita: o build confere as 84 espécies contra o
   FishBase a cada execução, e trata os casos em que o snapshot ainda não incorporou uma
   revisão (miraguaia, lambari).*
2. **Validação de campo** com dois ou três pescadores experientes da sua região e com um dono de
   pesqueiro. Cinco minutos de conversa vão dizer se falta alguma espécie óbvia e se algum nome
   popular usado aqui não é o que se fala no RS. ⬜ *Pendente, e mais importante agora que o
   álbum tem valor de guia (princípio 5): carta errada não é só carta que ninguém desbloqueia,
   é informação errada sobre a fauna da região.*

Duas candidatas foram **deliberadamente deixadas de fora** por falta de confirmação de que
ocorrem no RS: a arraia-do-uruguai (*Potamotrygon brachyura*, cuja distribuição registrada é o
médio e baixo rio Uruguai) e a truta-marrom (*Salmo trutta*). Entram se um pescador da região
confirmar — na dúvida, um álbum que ensina não pode chutar.

Nomes populares variam muito entre estados. O catálogo deve aceitar **apelidos alternativos** por
espécie (grumatã/curimba/curimbatá, anchova/enchova, papa-terra/betara), tanto para a busca
quanto para exibir o termo local correto.

---

## 10. Sistema de raridade e progressão

| Raridade | Cor | Peso na pontuação |
|---|---|---|
| Comum | Cinza-esverdeado | 1 |
| Incomum | Azul | 3 |
| Raro | Roxo | 8 |
| Lendário | Dourado | 20 |

A pontuação de coleção do usuário é a soma dos pesos das espécies desbloqueadas. Serve para o
ranking de "colecionador" do grupo, e evita que quem só pesca tilápia lidere por volume.

**Progresso por álbum:** cada álbum mostra `capturadas / total` e uma barra. Completar um álbum
gera uma conquista visual permanente no perfil — formalizada como insígnia na seção 11.6.

A raridade governa o *álbum*. As insígnias (seção 11) governam o *esforço*: quantas vezes, de que
tamanho e com que constância. São eixos deliberadamente separados — um pescador de tilápia nunca
vai liderar o ranking de coleção, mas pode ser o dono absoluto do ranking de insígnias.

---

## 11. Sistema de insígnias

### 11.1 Por que existe

O álbum resolve a retenção de quem coleciona. Não resolve a de quem pesca sempre o mesmo peixe no
mesmo lugar — e esse é o comportamento real da maioria. Depois de desbloquear tilápia, carpa,
traíra e jundiá nas três primeiras saídas, o Marcos não tem mais nada a conquistar até viajar.

As insígnias criam um segundo eixo, que **nunca termina**: volume, repetição por espécie, tamanho
e constância. Elas dão mérito visível a quem pesca muito, e não só a quem pesca variado.

Três efeitos esperados:

1. **Motivo de retorno para o não-colecionador.** "Faltam 6 traíras para o Ouro" é um objetivo que
   sobrevive ao álbum completo.
2. **Motivo para registrar a captura banal.** Hoje o incentivo de registrar a décima tilápia é
   zero. Com insígnia por espécie, cada tilápia conta para alguma coisa. Isso ataca a métrica-chave
   da seção 12 diretamente.
3. **Munição para o grupo do WhatsApp.** "É TILAAAAPIA — Ouro" é um card que o Diego manda.

### 11.2 Anatomia

Toda insígnia pertence a uma **linha** e tem um **grau**.

- **Linha:** o eixo colecionável (ex.: a linha da traíra, a linha de volume total, a linha de
  troféus). Uma linha tem cinco graus.
- **Grau:** bronze, prata, ouro, platina ou diamante. Cada grau tem **nome próprio e arte
  própria** — não é a mesma arte pintada de outra cor.

O usuário sobe de grau dentro da linha. Só o grau mais alto conquistado fica visível; os
anteriores viram histórico da linha (RN17).

Exceção: as **insígnias de história** (seção 11.10) não têm graus. São eventos únicos.

### 11.3 Os cinco graus

| Grau | Cor-base | Acabamento | Pontos | O que representa |
|---|---|---|---|---|
| Bronze | `#A15C2F` cobre fosco | Metal batido, borda simples | 1 | "Já aconteceu comigo" |
| Prata | `#B9C3CC` prata escovada | Metal polido, borda dupla | 3 | "Não foi sorte" |
| Ouro | `#E0A82E` ouro velho | Relevo alto, louros | 8 | "Isso é comigo mesmo" |
| Platina | `#CFE4E8` branco-azulado | Moldura recortada, brilho frio | 20 | "Poucos chegam aqui" |
| Diamante | `#8AB6FF` holográfico | Facetado, brilho animado | 50 | "Anos de linha na água" |

Os pontos de insígnia alimentam um ranking próprio do grupo, separado do ranking de coleção da
seção 10 (RN19). A escala 1/3/8/20/50 espelha propositalmente a escala de raridade — a mesma
sensação de peso, num eixo diferente.

### 11.4 As seis famílias

| Família | Eixo | Nº de linhas | Onde |
|---|---|---|---|
| A — Fisgadas | Volume total de capturas | 1 | 11.5 |
| B — Espécie | Quantidade de uma mesma espécie | 84 (uma por carta distinta, ver RN15) | 11.6 |
| C — Coleção | Espécies desbloqueadas e álbuns | 4 | 11.7 |
| D — Troféus | Exemplares grandes | 2 | 11.8 |
| E — Constância | Pescarias e meses ativos | 2 | 11.9 |
| F — História | Eventos únicos, sem grau | ~13 avulsas | 11.10 |

### 11.5 Família A — Fisgadas (volume total)

Linha única, conta toda captura registrada, inclusive "Não identificado".

| Grau | Capturas | Nome |
|---|---|---|
| Bronze | 10 | **Molhou o Anzol** |
| Prata | 50 | **Vara Boa** |
| Ouro | 150 | **Braço de Ferro** |
| Platina | 400 | **Calo na Mão** |
| Diamante | 1000 | **Mil Fisgadas** |

Calibragem: com 15 pescarias por ano e 8 peixes por pescaria, o Ouro chega em ~15 meses e o
Diamante é uma insígnia de oito anos. É para ser assim — precisa existir algo inalcançável no topo.

### 11.6 Família B — Por espécie

Uma linha por espécie do catálogo. **Os limiares variam por raridade**, senão o Diamante de
surubim seria impossível e o de tilápia seria trivial:

| Raridade | Bronze | Prata | Ouro | Platina | Diamante |
|---|---|---|---|---|---|
| Comum | 5 | 15 | 40 | 100 | 250 |
| Incomum | 3 | 10 | 25 | 60 | 150 |
| Raro | 1 | 3 | 8 | 20 | 50 |
| Lendário | — | — | 1 | 3 | 6 |

Espécie lendária não tem bronze nem prata: a primeira captura já entrega o **Ouro** direto. Uma
miraguaia não é um marco de bronze.

#### Nomes por espécie

Cada linha tem cinco nomes escritos à mão. O padrão de tom, do bronze ao diamante, é:
piada de iniciante → reconhecimento → título → grandiosidade → mito.

**Álbum 1 — Pesqueiros**

| Espécie | Bronze | Prata | Ouro | Platina | Diamante |
|---|---|---|---|---|---|
| Tilápia | Oi, Tilápia | De Novo? | **É TILAAAAPIA** | Praga do Açude | Tilapocalipse |
| Traíra | Mordida Seca | Cuidado com o Dedo | **Pescador de Traíra** | Dona do Barranco | Traíra Não Perdoa |
| Carpa-húngara | Bolinha de Massa | Puxou Feio | Carpeiro | Tanque Húngaro | Imperador do Fundo |
| Jundiá | Escorregou | Ferrão no Dedo | Jundiazeiro | Bigode do Açude | Barba Longa |
| Bagre-africano | Que Isso? | Melequento | Bagreiro | Bigode de Aço | Sem Escama, Sem Medo |
| Pacu | Roubou a Massa | Nadadeira Larga | Pacuzeiro | Costela do Tanque | Chapa de Prata |
| Truta arco-íris | Água Gelada | Fisgou na Serra | Truteiro | Arco-Íris Completo | Cristal de Urubici |
| Pintado | Manchado | Peso no Fundo | Pintadeiro | Bigode Grande | Gigante de Couro |
| Dourado | Brilho na Água | Pulou! | Caçador de Dourado | Tigre do Rio | Ouro do Uruguai |
| Black bass | Atacou a Isca | Pulo do Bass | Basseiro | Boca Grande | Lenda do Lago |

**Álbum 2 — Rios e açudes**

| Espécie | Bronze | Prata | Ouro | Platina | Diamante |
|---|---|---|---|---|---|
| Lambari | Isca Viva | Roubou a Massa | **Zé do Lambari** | Cardume Inteiro | Fritada Histórica |
| Cará | Peixinho Bonito | Teimoso | Careiro | Rei da Beirada | Azul de Açude |
| Cascudo | Raspa-Vidro | Couraça | Cascudeiro | Armadura Completa | Fóssil Vivo |
| Piava | Mordida Rápida | Boca Dura | Piaveiro | Faixa Dourada | Correnteza Vencida |
| Grumatã | Curimba ou Grumatã? | Fisgado de Raspão | Grumatazeiro | Cardume de Inverno | Senhor da Subida |
| Mandi-amarelo | Amarelinho | Espinho na Mão | Mandizeiro | Bigode Amarelo | Ouro do Fundo |
| Trairão | Isso Não é Traíra | Levou a Isca | Trairãozeiro | Boca de Balde | Monstro do Remanso |
| Tabarana | Parece Dourado | Prata Viva | Tabaraneiro | Flecha do Raso | Fantasma da Corredeira |
| Surubim-do-Uruguai | — | — | **Existe Mesmo** | Guardião do Uruguai | Mito do Rio |

**Álbum 3 — Costa e lagoas**

| Espécie | Bronze | Prata | Ouro | Platina | Diamante |
|---|---|---|---|---|---|
| Corvina | Roncou | Coro da Praia | Corvineiro | Ronco de Cardume | Rainha da Arrebentação |
| Tainha | Lá Vem Ela | Safra Aberta | Tainheiro | **Deu Tainha!** | Dono da Safra |
| Papa-terra | Comeu no Fundo | Areia na Linha | Betareiro | Sentinela da Praia | Ouro da Beira |
| Peixe-rei-marinho | Riscado de Prata | Cardume Ligeiro | Peixe-Reizeiro | Prata Corrida | Realeza da Lagoa |
| Baiacu | Inchou | De Novo Não | Baiacuzeiro | Praga do Anzol | Bola de Espinho |
| Anchova | Cortou a Linha | Dente Afiado | Anchoveiro | Tesoura do Mar | Fúria Azul |
| Peixe-espada | Fita Prateada | Dente por Dente | Espadeiro | Lâmina Viva | Prata da Noite |
| Robalo-flecha | Sombra no Mangue | Quase Levou | Robaleiro | Flecha Prateada | Fantasma do Costão |
| Linguado | Achatado | Camuflado | Linguadeiro | Olho no Fundo | Tapete do Canal |
| Miraguaia | — | — | **Bateu o Tambor** | Peso Morto | Lenda da Barra |

#### Regra de fallback

Espécie sem nomes curados usa o padrão abaixo, que funciona com qualquer nome e não depende de
gênero gramatical. Nenhuma espécie fica sem insígnia por falta de redação:

`Fisgou {X}` · `Repeteco de {X}` · `Pescador de {X}` · `Mestre de {X}` · `Lenda de {X}`

A curadoria dos nomes restantes é trabalho da Fase 0, junto com o catálogo.

### 11.7 Família C — Coleção e álbuns

Quatro linhas: uma geral e uma por álbum. Contam **espécies desbloqueadas**, não capturas.

**Linha geral — 84 espécies**

| Grau | Espécies | Nome |
|---|---|---|
| Bronze | 15 | Álbum Aberto |
| Prata | 30 | Caderneta Cheia |
| Ouro | 50 | Colecionador |
| Platina | 70 | Curador do Sul |
| Diamante | 84 | **Álbum Fechado** |

O diamante desta linha é o objetivo mais distante do produto, e é para ser assim: desde que o
álbum virou também um guia da fauna do Sul (princípio 5), fechá-lo deixou de ser a meta esperada
e passou a ser a façanha. Quem quer um alvo alcançável tem as linhas por álbum, abaixo.

**Linhas por álbum** (limiares: 25% / 50% / 75% / 90% / 100% do álbum)

| Álbum | Bronze | Prata | Ouro | Platina | Diamante |
|---|---|---|---|---|---|
| Pesqueiros do Sul | Diária Paga | Cliente da Casa | Sócio do Pesqueiro | Dono do Tanque | Pesqueiro Limpo |
| Rios e açudes | Pé na Água | Barranqueiro | Rio Abaixo | Senhor do Açude | Da Nascente à Foz |
| Costa e lagoas | Pé na Areia | Arrebentação | Praiano | Mestre da Maré | Costa Inteira |

### 11.8 Família D — Troféus

Duas linhas, ambas sobre tamanho.

**Linha "Exemplar de troféu"** — conta capturas que atingem o critério de troféu (RN18).

| Grau | Troféus | Nome |
|---|---|---|
| Bronze | 1 | Esse Foi Bom |
| Prata | 3 | Rendeu Foto |
| Ouro | 8 | Caçador de Troféus |
| Platina | 15 | Recordista |
| Diamante | 30 | Monstro do Sul |

**Linha "Metro"** — conta capturas acima de marcos absolutos de comprimento, independentemente da
espécie. É a insígnia que todo pescador entende sem ler regra nenhuma.

| Grau | Comprimento | Nome |
|---|---|---|
| Bronze | 40 cm | Passou de Palmo |
| Prata | 60 cm | Peixe de Verdade |
| Ouro | 80 cm | Quase um Metro |
| Platina | 100 cm | **Bateu o Metro** |
| Diamante | 120 cm | Não Coube na Foto |

### 11.9 Família E — Constância

**Linha "Pescarias"** — dias distintos com ao menos uma captura registrada.

| Grau | Pescarias | Nome |
|---|---|---|
| Bronze | 5 | Sábado de Manhã |
| Prata | 15 | Todo Fim de Semana |
| Ouro | 30 | Pescador de Carteirinha |
| Platina | 60 | Vida de Pescador |
| Diamante | 120 | Nasceu no Barco |

**Linha "Sequência"** — meses **consecutivos** com ao menos uma captura. É a linha que mais
puxa retenção, e a única que pode ser perdida antes de ser conquistada.

| Grau | Meses seguidos | Nome |
|---|---|---|
| Bronze | 2 | Voltei |
| Prata | 4 | Mês a Mês |
| Ouro | 8 | Sem Falta |
| Platina | 12 | Ano Inteiro |
| Diamante | 24 | Dois Anos de Linha na Água |

Quebrar a sequência zera o contador, **nunca o grau já conquistado** (RN13).

### 11.10 Família F — Insígnias de história

Eventos únicos, sem grau. Visual próprio: esmalte colorido sobre metal escuro, formato de
distintivo (não de medalha), para se distinguirem à primeira vista das linhas com grau.
Valem 5 pontos cada.

| Nome | Condição |
|---|---|
| **Cinco em Um Dia** | 5 espécies diferentes na mesma data |
| **Grand Slam do Barranco** | Traíra, jundiá e cará no mesmo dia |
| **Tá Comendo!** | 3 capturas em menos de 30 minutos |
| **Sul Inteiro** | Ao menos uma espécie desbloqueada em cada um dos três álbuns |
| **Madrugueiro** | Captura registrada entre 00h e 05h |
| **Sol a Pino** | Captura registrada entre 12h e 14h — o horário em que ninguém acredita |
| **Sem Sinal** | 10 capturas registradas offline |
| **Pioneiro** | Primeiro do grupo a desbloquear uma espécie (requer sincronização) |
| **Isso Aí é o Quê?** | 5 registros como "Não identificado" |
| **De Volta Pra Água** | 25 capturas marcadas como soltas (depende de "pescado e solto", v1.1) |
| **Virada do Ano** | Captura registrada em 31/12 ou 01/01 |
| **Trocou de Álbum** | Capturas em dois álbuns diferentes no mesmo dia |
| **Dobradinha** | Duas espécies do mesmo gênero no mesmo dia (ex.: pintado e cachara) |

Nenhuma delas depende de dado externo — sem clima, sem maré, sem API de terceiros. Todas saem do
que já está no registro da captura.

### 11.11 Regras de negócio

**RN13 — Permanência.** A insígnia é concedida ao atingir o limiar e é **permanente**. Excluir uma
captura recalcula o contador, mas não retira grau já conquistado — coerente com RN01. Um contador
pode voltar a ficar abaixo do limiar; a insígnia não volta.

**RN14 — Elegibilidade.** Só capturas com espécie confirmada pelo usuário contam para as famílias
B, C e D. Registros "Não identificado" contam apenas para a família A (volume), para a família E
(constância) e para a insígnia "Isso Aí é o Quê?".

**RN15 — Uma linha por espécie, não por álbum — mas uma por variedade.** Espécies que aparecem em
mais de um álbum (traíra, tilápia, jundiá, carpa-húngara, bagre-africano, dourado, black bass) têm
**uma única linha de insígnia**, com contador somado: são a mesma carta em duas prateleiras.

A exceção são as **variedades** (carpa-espelho, carpa-colorida, tilápia-vermelha), que têm linha
própria mesmo compartilhando o nome científico com a forma nominal. O critério aqui não é
taxonômico e sim de reconhecimento: pescar uma koi é um evento diferente de pescar uma carpa
comum, e é isso que a insígnia registra.

**RN16 — Cálculo local.** As insígnias são avaliadas no dispositivo no momento do salvamento e
funcionam offline. O servidor revalida na sincronização e é a única autoridade para insígnias que
dependem do grupo ("Pioneiro").

**RN17 — Retroatividade obrigatória.** Toda insígnia é derivável do histórico de capturas. Ao
lançar a funcionalidade — ou uma linha nova — o app recalcula sobre todas as capturas existentes e
concede o grau devido. **Nenhum usuário perde progresso por ter pescado antes de a insígnia
existir.** É por isso que o sistema pode entrar na v1.1 sem prejuízo (seção 11.14).

**RN18 — Exibição por linha.** Só o maior grau conquistado da linha aparece na vitrine e no perfil.
Os graus anteriores ficam visíveis dentro da linha, como histórico com data.

**RN19 — Definição de troféu.** Uma captura é troféu quando o comprimento for **≥ 80% do limite
superior da faixa de tamanho da espécie** no catálogo. Espécie sem faixa validada não gera troféu —
prefere-se nenhuma insígnia a uma insígnia barata (princípio 1).

**RN20 — Pontos e ranking.** Bronze 1, prata 3, ouro 8, platina 20, diamante 50, história 5. Ao
subir de grau, o usuário passa a valer o novo grau — os pontos **não** se acumulam dentro da mesma
linha. O ranking de insígnias é separado do ranking de coleção da seção 10 e vale só dentro do
grupo (RN08).

**RN21 — Sem antifraude no MVP.** Não há validação contra registro inflado ou medida exagerada. O
grupo tem entre 5 e 20 pessoas que se conhecem, e a reputação entre elas é uma trava mais eficiente
que qualquer heurística. Se o produto sair do círculo de amigos, esta regra precisa ser revista.

### 11.12 Diretrizes de design visual

Cada insígnia é composta por **moldura (grau) + emblema (linha)**. A moldura vem da tabela de
graus da seção 11.3 e é reutilizável; o emblema é arte própria da linha. Isso mantém 5 molduras +
N emblemas em vez de 5×N artes completas, sem cair no "mesma arte, outra cor" — porque a moldura
muda de formato, e não só de cor, a cada grau.

- **Formato.** Bronze e prata: círculo. Ouro: círculo com louros. Platina: escudo recortado.
  Diamante: hexágono facetado. A silhueta é reconhecível a 32px, na lista.
- **Emblema.** Para a família B, a mesma silhueta da carta da espécie no álbum — reaproveita a
  Fase 0 e amarra visualmente insígnia e álbum. Para as outras famílias, um símbolo próprio
  (anzol, vara, régua, calendário, mapa).
- **Estados.** Bloqueada aparece em silhueta escura com o limiar visível ("40 traíras"), igual à
  carta não desbloqueada do álbum. Consistência com a linguagem que o usuário já aprendeu.
- **Diamante.** Único grau com movimento: brilho holográfico sutil que percorre a faceta. Reservar
  animação só para o topo é o que dá peso ao topo.
- **Animação de conquista.** Reaproveita a animação de desbloqueio de espécie (F07), com a moldura
  do grau. Se captura e insígnia acontecerem juntas, a espécie vem primeiro e a insígnia enfileira.
- **Acessibilidade.** O grau nunca é comunicado só por cor — o formato e o rótulo textual carregam
  a informação.

### 11.13 Exibição no app

- **Perfil:** vitrine de 3 insígnias fixadas, escolhidas pelo usuário, mais o total de pontos.
- **Tela Insígnias:** agrupada por família, cada linha mostrando o grau atual e uma barra
  `atual / próximo limiar`. A barra é o gancho — "faltam 6" é mais motivador que "40 no ouro".
- **Ficha da espécie (F08):** a linha de insígnia daquela espécie aparece dentro da ficha, com o
  contador pessoal. É onde o pescador de tilápia descobre que existe algo a perseguir.
- **Card compartilhável (F12):** insígnia conquistada é um tipo de card, com o nome do grau em
  destaque e a foto da captura que fechou o limiar.
- **Ranking do grupo (F11):** entra como quarta aba — pontos de insígnia.

### 11.14 O que precisa existir desde a Fase 1

Por RN17 as insígnias são retroativas, então elas não precisam ser construídas cedo. Mas três
dados precisam ser gravados desde a primeira captura, senão o histórico fica cego:

1. **Timestamp completo** da captura (data + hora + fuso), não só a data. Sem isso, "Madrugueiro",
   "Sol a Pino" e "Tá Comendo!" ficam impossíveis de calcular retroativamente.
2. **Flag de origem offline** no registro. Sem isso, "Sem Sinal" só vale para o futuro.
3. **Faixa de tamanho por espécie** no catálogo da Fase 0, com limite superior confiável. É o que
   RN19 usa. Já está previsto na seção 9, mas agora tem uma dependência dura.

Nada além disso. É o custo total que as insígnias impõem ao MVP: três campos.

### 11.15 Calibragem

Todos os limiares deste documento são **estimativa**, feita sobre a premissa de 10 a 20 pescarias
por ano com 5 a 10 capturas cada. Depois de três meses de dados reais do grupo, revisar:

- Se ninguém passou do bronze na família B, os limiares de comum estão altos demais.
- Se todos chegaram ao ouro no primeiro mês, estão baixos demais e a insígnia perdeu valor.
- A regra de ajuste: **limiar pode subir para insígnias ainda não concedidas, nunca para as já
  conquistadas** (RN13). Quem tem, tem.

---

## 12. Métricas

Como o v1 é para uso pessoal, as métricas servem para decidir se vale continuar, não para
reportar a ninguém.

**Métrica-chave:** capturas registradas por usuário ativo por pescaria. Se as pessoas pescam e
não registram, o produto falhou no atrito.

**Secundárias:**
- Taxa de acerto da IA na primeira sugestão (aceita sem abrir o seletor manual)
- Aberturas do app em dias sem captura registrada — mede se a coleção realmente cria retorno
- Espécies desbloqueadas por usuário após 3 meses
- Cards compartilhados por captura
- **Insígnias conquistadas por usuário após 3 meses** — se a mediana for 3 ou menos, os limiares
  estão altos demais (seção 11.15)
- **Capturas registradas de espécies já desbloqueadas** — mede diretamente se a insígnia por
  espécie resolveu o problema de registrar a décima tilápia

**Critério de decisão aos 3 meses:** se o grupo registrou capturas em pelo menos 70% das
pescarias que aconteceram, o produto tem valor. Se não, o problema é atrito de registro e nada
mais importa até resolver isso.

---

## 13. Requisitos não funcionais

- **Offline-first.** Registro completo sem rede, incluindo escolha manual de espécie e cálculo de
  peso. Só a identificação por IA e a sincronização exigem conexão.
- **Desempenho.** Abertura em menos de 2s. Álbum renderiza sem travar com 91 cartas. A avaliação
  de insígnias no salvamento não pode adicionar latência perceptível ao fluxo de 30 segundos:
  contadores incrementais persistidos, recálculo completo só na migração retroativa (RN17).
- **Foto.** Comprimida no dispositivo antes do upload (lado maior de 1600px, JPEG qualidade 80).
  Original permanece na galeria do usuário.
- **Consumo de dados.** Uma captura sincronizada não deve passar de 400 KB.
- **Bateria e GPS.** Localização obtida sob demanda, nunca em background contínuo.
- **Idioma.** Português do Brasil apenas.
- **Plataformas.** Android como prioridade (a maioria do grupo). iOS na mesma base de código.
- **LGPD.** Foto, localização e dados de conta são do usuário; exclusão de conta remove tudo.

---

## 14. Roadmap

**Fase 0 — Catálogo (antes de qualquer código de produto).**
Montar e validar o JSON das espécies, com nomes, apelidos, raridade, faixa de tamanho, eixo de
medida e coeficientes de peso — 91 cartas, 84 espécies. Produzir as silhuetas. É o maior trabalho
do projeto e o que ninguém consegue terceirizar. **Inclui os nomes das linhas de insígnia por espécie** (seção 11.6) — é
redação, sai junto com o catálogo e custa pouco quando feito no mesmo passe.

**Fase 1 — Registro local.** App que registra captura com foto, espécie manual, comprimento e
peso estimado, tudo salvo no dispositivo. Sem backend, sem IA, sem amigos. Já é usável numa
pescaria de verdade. Gravar desde aqui os três campos da seção 11.14.

**Fase 2 — Álbum.** Silhuetas, desbloqueio, ficha da espécie, progresso.

**Fase 3 — Nuvem e amigos.** Autenticação, sincronização, convite por link, rankings.

**Fase 4 — IA.** Identificação assistida, com o seletor manual permanecendo como caminho
principal alternativo.

**Fase 5 — Card compartilhável e insígnias.** Motor de avaliação, recálculo retroativo sobre todo
o histórico (RN17), tela de insígnias, vitrine no perfil e ranking de pontos. Entregar as famílias
A, C, D e E primeiro — são 9 linhas e cobrem todo mundo. A família B (84 linhas, 420 nomes e
emblemas) entra logo em seguida, por álbum, começando por Pesqueiros. A família F por último.

A ordem é deliberada: a IA vem por último porque é a parte mais visível e a menos essencial.
Se o app não for bom sem ela, não será bom com ela.

---

## 15. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| IA confunde espécies parecidas (piava × grumatã, pintado × cachara) | Alto — corrompe o álbum | Confirmação humana obrigatória; restringir os candidatos ao catálogo regional |
| Atrito no registro faz as pessoas não usarem na hora | Alto — mata o produto | Meta de 30s; câmera direto; medida em um campo só |
| Curadoria do catálogo consome mais tempo que o previsto | Médio | Começar por um álbum só (Pesqueiros), lançar, expandir |
| Grupo perde interesse depois de completar as espécies comuns | Médio | Raridade, insígnias (seção 11), álbuns novos ao viajar |
| Limiares de insígnia mal calibrados — ninguém sobe de grau, ou todos chegam ao ouro no primeiro mês | Médio — a mecânica vira ruído | Revisão aos 3 meses com dados reais; limiar pode subir só para insígnias ainda não concedidas (seção 11.15) |
| Volume de arte da família B (84 linhas × 5 graus) trava a entrega | Médio | Moldura por grau reutilizável + silhueta já produzida na Fase 0; entrega por álbum, e regra de fallback de nomes (seção 11.6) impede bloqueio por redação |
| Insígnia por volume incentiva registro inflado | Baixo no grupo de amigos, alto se escalar | Sem antifraude no MVP por decisão explícita (RN21); revisar antes de qualquer abertura além do círculo conhecido |
| Custo de IA se o app crescer | Baixo | Free tier cobre o grupo com folga; identificação é opt-in |
| Direito de imagem das fotos de referência | Médio | Usar silhuetas/ilustrações próprias, nunca fotos de terceiros |
