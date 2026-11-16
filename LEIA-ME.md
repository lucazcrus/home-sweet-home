# Casa · Estúdio 3D

A aplicação abre com a fachada refinada pelas fotografias. Arraste para orbitar, use o scroll para aproximar e alterne dia/noite para avaliar os acabamentos e a iluminação. **Mostrar editor** revela a árvore de objetos e os móveis. **3D** abre a maquete sem cobertura; **Entrar** volta à exploração interna.

O detalhamento da fachada fica em `src/facade.ts`: pedra em relevo, ripas individuais, ferragens, esquadria alta, rufos, pergolado, arandelas, balizadores e paisagismo. Alturas e jardim são estimativas por fotografia registradas em `LEVANTAMENTO.md`.


## Ambientes e referências de decoração

- **Isolar ambiente** mostra somente o cômodo escolhido; **Casa inteira** restaura o conjunto. O recorte vale para superfícies, móveis, sombras e oclusão, sem reconstruir a geometria. **Entrar** leva à posição interna do ambiente selecionado.
- O teto e as paredes completas aparecem automaticamente quando a câmera está dentro da casa, inclusive ao aproximar pela órbita. Na visita interna, o teto fica sempre ativo; os vazios do pátio e do jardim permanecem descobertos.
- Escritório: marcenaria verde sálvia, porta oculta frisada para o lavabo, estantes em carvalho com livros/LED, bancada dupla em L, monitores, cadeiras e tapete circular. Selecione **Escritório → Abrir porta oculta** para ver a passagem e o lavabo; o mesmo controle fecha a porta e restaura o isolamento.
- Master: cama estofada, cabeceira de madeira iluminada, criados com palhinha, abajures, penteadeira, espelho oval, ripas claras e porta branca de correr.
- Sala/jantar: sofá claro em L, poltronas terracota, mesas em carvalho, aparador, estantes com livros/plantas, buffet e pendente de fibra natural.
- Fachada: pedra clara irregular em relevo, pano de vidro transparente sem divisões internas, vegetação pendente, Tiggo 5x Turbo 2022 preto e Volvo EX30 azul, além de luzes no paisagismo. Os carros são modelos procedurais próprios, aproximados pelas fotografias.
- Jardim de inverno entre escritório e hóspedes: porta de correr envidraçada com perfil preto e puxador, canteiro elevado com bordas de madeira, seixos vermelhos, árvore, forração e parede pétrea. O vão de 1,30 × 1,65 m é uma estimativa por fotografia.

As quatro imagens de `Imagens Geradas` orientam a composição em geometria 3D. `src/reference-scenes.ts` contém marcenaria, paisagismo e detalhes fixos; `src/reference-furniture.ts` contém as peças soltas; `src/rooms.ts` define os ambientes e câmeras. Os objetos têm proporções aproximadas para estudo de decoração.

## Fluidez e renderização

A cena e o contexto WebGL permanecem ativos durante a sessão. Trocar de vista, alternar coberturas e paredes, editar móveis pelo inspetor ou mudar o Dia/Noite não recria o visualizador. Peças estáticas são agrupadas por material, preservando triângulos, normais, cores e UVs; móveis são atualizados individualmente.

- Sombras de contato calculadas em meia resolução e reutilizadas enquanto câmera/geometria não mudam.
- Resolução ajustada ao tamanho do viewport e ao custo observado durante o movimento. Ao parar, retorna a resolução de apresentação, com SMAA e sombras de contato; durante a navegação usa FXAA.
- Reflexão planar da piscina atualizada até 12 vezes/s durante movimento e 8 vezes/s em repouso, mantendo as ondulações animadas. O exterior frontal não atualiza a água ocultada pela casa.
- Irradiância difusa das luminárias fixas quentes pré-calculada em duas texturas 3D. Os móveis consultam o campo pela posição atual; as luzes principais com sombras e os refletores subaquáticos continuam em tempo real.
- Renderização sob demanda nos enquadramentos estáticos; água visível animada a até 30 quadros/s em repouso; navegação usa o ciclo do monitor. Aba oculta pausa o ciclo.
- Sem transmissão física adicional no vidro frontal: transparência e reflexão do ambiente preservadas, evitando uma renderização extra da casa inteira.

Medições locais em 13/11/2026, no Arc:

| Amostra | FPS médio | p95 do quadro | Chamadas de desenho/quadro |
|---|---:|---:|---:|
| Fachada anterior, renderização contínua | ~1,4–1,6 | ~747 ms | ~4.150–4.230 |
| Fachada otimizada, órbita | 60,0 | 17,4 ms | 144 |
| Piscina noturna otimizada, órbita | 60,0 | 17,5 ms | 57 |

As amostras otimizadas usam órbita automática de 8 s, descartando o primeiro segundo. A resolução é adaptativa; os números são do computador e dos enquadramentos medidos. Essas medições precedem a nova decoração. A atualização incremental dos móveis também foi validada por teste automatizado da implementação real.

Na revisão com decoração, a casa inteira em 3D à noite foi medida no navegador integrado: **60,0 FPS**, p95 **17,1 ms**, **249 chamadas/quadro**, aproximadamente **320 mil triângulos/quadro**. Sala, escritório, suíte, fachada, jardim de inverno, troca de ambientes e ausência de movimento do móvel ao arrastar foram conferidos no navegador. Quatorze testes passaram, junto à validação do modelo e ao build.

Para repetir a medição, abra `http://localhost:5173/?perf=1` e clique em **Medir órbita**. O painel técnico aparece somente com esse parâmetro. `npm test` confere agrupamento, cores, visibilidade, cache de oclusão, Dia/Noite, iluminação pré-calculada e atualização incremental; `npm run check:model` confere a arquitetura.

## Piscina e Dia/Noite

- Clique em **Piscina** para entrar no pátio interno a céu aberto. O modo mantém as coberturas das alas vizinhas; o céu continua visível pelo vazio real da planta.
- O controle **Dia / Noite** fica no cabeçalho. A luz muda gradualmente em todas as vistas, preservando o enquadramento e sem remontar o modelo. No modo noturno, arandelas, spots, balizadores e refletores da piscina iluminam materiais e ambientes.
- A piscina segue a cota **2,80 × 3,00 m**, no pátio de **5,40 × 5,72 m**. Banco submerso, ducha com pedra, borda, esquadrias, canteiros e água com reflexão/ondulação usam as fotos reais como referência.
- Pisos, terreno e coberturas possuem recortes. A área da piscina é um vazio na construção, inclusive ao explorar os interiores.
- `src/patio.ts` reúne o detalhamento externo; `src/day-night.ts` controla a iluminação; `src/architecture.json` guarda as dimensões comuns ao gerador e à cena.
- `npm run check:model` confere as cotas e evita que pisos ou coberturas voltem a fechar o pátio/piscina.

## Cena mobiliada e iluminação

- Mobiliário 3D gerado com componentes arredondados: estofados, camas, mesas, cadeiras, escritório, tapetes e plantas. A composição inicial é uma proposta de decoração editável.
- Materiais locais com texturas de madeira, piso, tecido e cerâmica; ambiente de reflexão, sombras e oclusão ambiente.
- Alternância entre luz do dia e iluminação noturna; luminária pendente sobre a mesa de jantar.
- **Entrar** posiciona a câmera dentro da casa e exibe o teto. Use **W A S D** ou as setas para deslocar e arraste para mudar o olhar. O deslocamento é livre, sem colisão com paredes.
- **Explorar em tela cheia** recolhe os painéis do editor. **Paredes baixas** facilita explorar os cômodos na vista geral.
- As alturas usam o centro de cada objeto conforme o gerador. A cena é persistente durante edição e navegação; o canvas, os controles e os recursos da GPU são descartados somente ao encerrar o visualizador.
- O estado salvo preserva os móveis adicionados. A primeira migração para a decoração de referência substitui os móveis iniciais conhecidos, mantendo peças personalizadas; as próximas cargas preservam a decoração salva, inclusive peças removidas. A exportação JSON inclui a decoração; o Collada gerado pelo script contém a arquitetura simplificada.

A geometria da casa ainda contém estimativas descritas no levantamento. Os móveis são peças procedurais para estudo de composição, sem correspondência garantida com produtos comerciais.

Editor web para visualizar o estudo 3D da casa e explorar a decoração. O modelo usa metros; as cotas da planta e os acabamentos vistos nas fotos foram separados das medidas estimadas no [levantamento](./LEVANTAMENTO.md).

## Executar localmente

```bash
npm install
npm run dev
```

Abra o endereço local informado pelo Vite. Para gerar os arquivos de publicação:

```bash
npm run build
```

## Publicar na Vercel

Neste repositório, a aplicação está na raiz. Importe `lucazcrus/home-sweet-home` na Vercel e mantenha a raiz (`./`) como **Root Directory**. A configuração usa Vite, Node.js 24.x, `npm run build` e `dist` como diretório de saída.

## O que já funciona

- Navegação orbit, zoom e modos 3D, planta e fachada.
- Exibir ou ocultar paredes, cobertura e terreno.
- Biblioteca de móveis; seleção por clique, rotação, duplicação, remoção e edição de coordenadas/dimensões no inspetor. Arrastar controla apenas a câmera.
- Salvar no navegador e importar/exportar o estado do projeto em JSON.
- `gerar-modelo.mjs` atualiza `casa-modelo.json`, a cópia usada pelo app em `public/` e o arquivo Collada.
- A versão 2 acrescenta acabamentos internos de referência, detalhamento da cozinha e uma ilha de 1,40 × 2,50 m baseada na cota da planta.

As alterações salvas ficam no armazenamento local do navegador em que o projeto foi aberto. Exporte o JSON para levar o projeto a outro navegador ou computador. O novo modelo usa uma chave local própria para não reaproveitar automaticamente o blockout antigo; a versão anterior permanece no navegador.

## Próximas melhorias naturais

- Traçar o perímetro e conferir a orientação, paredes e vãos cômodo por cômodo.
- Conferir presencialmente profundidade da piscina, alturas e dimensões do jardim de inverno.
- Refinar os modelos procedurais e os materiais após validar medidas e circulações.
- Adicionar desfazer/refazer, cotas e exportação de cena em formato 3D.

## Correções pelas anotações e cozinha — 13/11/2026

- A sala/jantar ganhou a parede de fundo que faltava. Buffet e prateleiras de livros foram reposicionados nessa parede, perpendicular ao sofá; a mesa e o pendente foram afastados para manter a passagem. Essa parede permanece completa na maquete para sustentar visualmente a marcenaria.
- A janela externa do escritório foi removida. Escritório e hóspedes agora têm janelas opostas voltadas ao jardim de inverno. A bancada do escritório foi girada para o lado do jardim; o tampo usa 2,15 m de comprimento e 0,70 m de profundidade do esboço.
- O pano de vidro do corredor para a piscina foi substituído por parede branca com arandelas. A esquadria de acesso ao jardim de inverno permanece envidraçada.
- O deck de réguas de madeira foi acrescentado na faixa entre piscina, parede do corredor e acesso da suíte, conforme a nova orientação e a foto. Essa mudança substitui a decisão anterior de omitir o deck.
- `src/kitchen.ts` detalha os armários em madeira e claros, nichos espelhados, azulejos, cuba com abertura real no tampo, torneira gourmet, cooktop de cinco bocas, coifa com vidro curvo, forno, micro-ondas, geladeira, churrasqueira a gás e iluminação. A face da ilha tem pedra em relevo; gavetas, puxadores, perfis e tomadas são geometria.
- O forro tem uma aproximação suave da luz rebatida durante o dia; à noite, prevalecem as luminárias. A cozinha é isolável pelo mesmo dropdown. Elementos altos da fachada ficam ocultos ao isolar os interiores, evitando fragmentos de outros volumes na maquete.
- A migração para `designVersion: 2` move apenas os móveis iniciais que ainda estão em suas posições originais. Peças personalizadas e móveis reposicionados são preservados.

A bancada e o detalhamento usam as fotografias e o esboço como referências. Medidas dos eletrodomésticos, espessuras, alturas e módulos sem cotas permanecem aproximadas.

Conferência desta revisão: **14 testes**, validação dos **181 objetos** da base arquitetônica e build de produção concluídos. Órbita noturna da casa inteira por 8 s, com cozinha detalhada: **60,0 FPS**, p95 **17,0 ms**, **274 chamadas/quadro** e aproximadamente **391 mil triângulos/quadro**, no navegador integrado desta máquina.

## Escritório, porta oculta e carros — 14/11/2026

O escritório ganhou largura e profundidade, com vão interno máximo de **2,92 × 2,95 m**, preservando o recuo do jardim de inverno. As paredes compartilhadas, o piso e o recorte de isolamento foram ajustados. A estante verde foi alargada e incorpora uma folha frisada de 75 cm, sem puxador aparente, no acesso ao lavabo. A folha gira em um pivô independente; abrir não reconstrói o cenário. O lavabo tem vaso sanitário, bancada suspensa, cuba, torneira, espelho e luz; a antiga interpretação como banheiro com chuveiro foi removida. As medidas ocultas e a posição exata da marcenaria continuam sujeitas a conferência.

`src/cars.ts` substitui os SUVs genéricos por carrocerias curvas, paralamas recortados, pneus com flanco arredondado, rodas específicas, vidros inclinados, espelhos, juntas, maçanetas, lanternas e emblemas. O Tiggo segue a foto do **Turbo 2022**, com grade horizontal, cromados, barras de teto e rodas de raios duplos. O EX30 usa azul metálico, frente fechada, LEDs segmentados, maçanetas embutidas e rodas aerodinâmicas. São aproximações visuais leves, não digitalizações ou arquivos oficiais das montadoras. Peças estáticas continuam agrupadas por material.

As dimensões externas de referência usadas no código são 4,338 × 1,830 × 1,645 m no Tiggo e 4,233 × 1,838 × 1,550 m no EX30 (comprimento × largura sem retrovisores × altura). Fontes: [ficha Tiggo 5x T](https://www.novacaoachery.com.br/tiggo5x/TIGGO5XT.pdf) e [especificações Volvo EX30](https://www.volvocars.com/br/cars/ex30-electric/specifications/). A forma e os acabamentos seguem as fotografias enviadas pelo proprietário.

Validação: **18 testes** cobrindo também dimensões/malhas dos carros, passagem livre e pivô da porta; **182 objetos** na base arquitetônica, com validação do modelo e build de produção.

Órbita noturna da casa inteira, já com os novos carros e escritório, em 14/11/2026: **60,0 FPS**, p95 **17,1 ms**, CPU **2,3 ms**, **285 chamadas/quadro** e aproximadamente **491 mil triângulos/quadro**. Amostra de 8 s no navegador integrado desta máquina, descartando o primeiro segundo; resolução adaptativa ativa. O resultado depende do equipamento e do tamanho da janela.

## Revisão das 13 anotações — 15/11/2026

- A ala lateral agora tem **escritório → jardim de inverno → hóspedes**, sem quarto adicional. O jardim ocupa toda a faixa intermediária (envelope aproximado de 3,05 × 3,23 m), com vazio contínuo no piso, no forro e na cobertura. As janelas do escritório e de hóspedes foram centralizadas nas paredes opostas; a cama tem a cabeceira voltada para o jardim. O recuo lateral antigo foi eliminado.
- O lavabo junto à cozinha passou a ter uma única abertura, pelo quarto de hóspedes; a face da circulação é fechada. **Lavabo dos hóspedes** aparece no seletor. A porta oculta do escritório continua atendendo o lavabo posterior dele.
- As seis cadeiras do jantar foram giradas para a mesa e aproximadas sob o tampo, com folga dos pés. Mesa em L, cadeiras e monitores do escritório foram reposicionados; o encontro das duas partes do tampo não tem faces coplanares sobrepostas.
- A ilha mantém o tampo de 1,40 × 2,50 m e ganhou **vão real de 56 cm** no lado das três banquetas de madeira com estofado verde musgo. A antiga face pétrea fechada foi retirada. Geladeira, torre e módulos do retorno estão em intervalos separados.
- A revisão de encaixes também ajusta sofá/aparador, mesa de centro, poltronas, pufe da suíte, criados, quadros, espelho, buffet e marcenaria junto às paredes. O rack e o nicho do retorno têm aberturas reais. Os móveis partem da superfície do piso, em vez de ficar suspensos acima dela.
- Tiggo e EX30 têm aberturas reais na carroceria para os vidros, com bancos e painel visíveis, transições de ombro arredondadas, guarnições e lentes dos faróis. Continuam sendo aproximações próprias pelas fotos, sem arquivo oficial do fabricante.

`modelVersion: 8` atualiza a arquitetura; `designVersion: 3` corrige somente os móveis padrão que ainda estavam nas posições anteriores. Peças personalizadas, posições editadas e remoções salvas são preservadas.

**27 testes** verificam também os encaixes da geometria renderizada entre cadeiras/mesa, móveis entre si, móveis e marcenaria contra paredes, eletrodomésticos/retorno, banquetas/ilha, contato dos pés com o piso e as passagens dos lavabos. `npm run check:layout` executa somente essa revisão de encaixes; `npm test` executa a suíte inteira. Contatos de montagem dentro de um mesmo móvel não são tratados como colisões indevidas.

Órbita final da casa completa à noite: **59,9 FPS**, p95 **17,6 ms**, CPU **3,4 ms**, **328 chamadas/quadro** e aproximadamente **538 mil triângulos/quadro**. Amostra de 8 s no navegador integrado desta máquina, com resolução adaptativa e descarte do primeiro segundo. A medição inclui os interiores dos carros, jardim ampliado, banquetas e pés dos móveis corrigidos.
