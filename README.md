# Fonsekai Archive — portfólio de Gustavo Fonseca

Site estático (HTML, CSS e JavaScript puros, sem dependências) publicado no GitHub Pages.

## Estrutura

```
templates/index.html      modelo da página (layout); os textos vêm dos JSON
data/site.json            textos, contatos, serviços, "Sobre", SEO e anos de experiência
data/projetos.json        projetos e vídeos (atualizado pela sincronização com o Behance)
assets/css/style.css      estilos (cores no topo do arquivo)
assets/js/main.js         vinheta, player e filtros
assets/img/, assets/video logo, foto, favicon, imagem de compartilhamento e vinheta
404.html                  página de "não encontrado"
scripts/build_site.py     monta o site final em _site/ (roda na publicação)
scripts/sync_behance.py   lê o feed do Behance e atualiza data/projetos.json
scripts/coletar-videos.js coleta no navegador a lista de vídeos de cada projeto
.github/workflows/        publicação no GitHub Pages e sincronização com o Behance
```

Para mudar **qualquer texto do site**, edite `data/site.json` — não é preciso mexer no HTML.
Na publicação, `scripts/build_site.py` coloca os textos, o destaque e a grade de trabalhos direto
no HTML (bom para o Google e para as prévias de link) e gera também `sitemap.xml` e `robots.txt`.

### O que fica em `data/site.json`

| Campo | Onde aparece |
| --- | --- |
| `url`, `nome`, `marca`, `profissao`, `cidade` | rodapé, "Sobre", título da aba, dados para o Google |
| `anos_experiencia` | selo da foto (`5+`) e onde houver `{anos}` nos textos |
| `seo` | título da aba, descrição no Google e nas prévias de link |
| `abertura` | etiqueta, título (a última linha fica violeta) e texto da primeira seção |
| `destaque.titulo` | título da seção "Em destaque" |
| `servicos` | cards de "O que eu entrego" e a linha "Como funciona" |
| `sobre` | texto, foto e ferramentas extras (as dos projetos entram sozinhas) |
| `contato` | título, e-mail, WhatsApp e Instagram (campo vazio = botão some) |
| `reel` | botão "Ver reel" na abertura (`null` = escondido) |
| `behance` | usuário usado pela sincronização |

## Como publicar (uma vez)

1. Crie um repositório **público** no GitHub. Para o endereço ficar `https://<usuario>.github.io`,
   o nome do repositório deve ser exatamente `<usuario>.github.io`.
2. Envie estes arquivos para a branch `main`.
3. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. A cada `push` na `main`, o site é publicado sozinho em cerca de 1 minuto (aba **Actions**).

> Se usar outro nome de repositório, o site fica em `https://<usuario>.github.io/<repositorio>/`.
> Tudo funciona, exceto o botão "Voltar ao início" da página 404, que aponta para a raiz do domínio.

### Domínio próprio (opcional)

Em **Settings → Pages → Custom domain**, informe o domínio (ex.: `gustavofonseca.com.br`) e
configure no registro do domínio os apontamentos indicados pelo GitHub.

## Sincronização automática com o Behance

O workflow **Sincronizar com o Behance** roda todo dia às 06:17 (Brasília) e pode ser disparado
à mão em **Actions → Sincronizar com o Behance → Run workflow**. Ele lê o feed RSS público do
perfil (`https://www.behance.net/feeds/user?username=gustavofonseca37`) e:

- **Projeto novo no Behance** → entra no site com título, capa, descrição e uma categoria
  sugerida. Como o feed não traz os vídeos, o card abre a página do projeto no Behance até que
  os vídeos sejam adicionados em `videos` (veja abaixo).
- **Projeto que já está no site** → atualiza link, capa e data. Título, categoria, descrição,
  ferramentas, vídeos e `oculto` editados à mão **nunca são sobrescritos**.
- **Projeto apagado no Behance** → sai do site.

Quando algo muda, o workflow faz o commit em `data/projetos.json` e publica o site sozinho.
Para testar sem gravar nada: `python3 scripts/sync_behance.py --dry-run`.

> O Behance bloqueia leitura automática das páginas de projeto, por isso a sincronização usa só
> o feed RSS, que é público e feito para isso.

### Atualizar a lista e a ordem dos vídeos

O feed do Behance não informa os vídeos de cada projeto, e as páginas dos projetos bloqueiam
leitura automática. Por isso a lista de vídeos é coletada no navegador e aplicada pelo workflow:

1. No computador, abra `https://www.behance.net/gustavofonseca37` no navegador.
2. Abra o console (F12 → Console), cole o conteúdo de `scripts/coletar-videos.js` e aperte Enter.
   Ele lê todos os projetos e copia a lista de vídeos para a área de transferência.
3. No GitHub: **Actions → Sincronizar com o Behance → Run workflow**, cole no campo **videos** e
   clique em **Run workflow**.

O site passa a ter exatamente os vídeos de cada projeto, na mesma ordem do Behance (vídeos novos
entram, removidos saem). A duração dos vídeos do Behance é preenchida sozinha.

## Como adicionar ou trocar um trabalho

Edite `data/projetos.json`. Cada **projeto** vira um card na grade e pode ter vários vídeos;
o player passa de um vídeo para o outro com as setas.

```json
{
  "titulo": "TikTok Shop",
  "categoria": "Direct Response",
  "descricao": "Vídeos verticais de venda de produto.",
  "ferramentas": ["CapCut", "Premiere Pro"],
  "capa": "https://mir-s3-cdn-cf.behance.net/projects/original_webp/....jpg",
  "behance": "https://www.behance.net/gallery/...",
  "videos": [
    { "tipo": "behance", "id": "Fsmhp3IKNkj", "formato": "9:16", "duracao": "0:37" },
    { "tipo": "youtube", "id": "c9Ae6OQfRYM", "formato": "16:9" }
  ]
}
```

- **categoria**: os botões de filtro são criados a partir das categorias da lista.
- **capa**: imagem do card (proporção ~1380×1080). Hoje usa as capas do Behance; pode ser um
  arquivo em `assets/img/` também.
- **videos**: lista de vídeos do projeto, na ordem em que aparecem no player.
  - Behance: `{ "tipo": "behance", "id": "<código>" }` — o código está no endereço do player do
    Behance: `www-ccv.adobe.io/v1/player/ccv/<código>/embed`.
  - YouTube: `{ "tipo": "youtube", "id": "<código depois de v= ou de shorts/>" }`
  - Vimeo: `{ "tipo": "vimeo", "id": "<número do vídeo>" }`
  - Arquivo no próprio site (só para vídeos pequenos): `{ "tipo": "arquivo", "arquivo": "assets/video/x.mp4" }`
  - **formato**: `9:16`, `1:1` ou `16:9` — define o tamanho do player.
- Para esconder um projeto sem apagar, adicione `"oculto": true`.
- O total de vídeos da seção "Em números" é contado sozinho a partir desta lista.

Vídeos longos devem ficar no YouTube (pode ser "não listado") ou no Vimeo:
o GitHub Pages limita o site a 1 GB e o tráfego a ~100 GB/mês.

## Em destaque

A seção "Em destaque" mostra sempre o **primeiro projeto** de
`data/projetos.json` (o primeiro do perfil no Behance) e abre o projeto inteiro no player, começando
pelo primeiro vídeo. Para trocar o destaque,
mude a ordem no Behance (ou dos vídeos dentro do projeto).

Os pontos ao lado do vídeo vêm do campo opcional `destaques` do projeto:

```json
"destaques": [
  { "titulo": "Conexão", "texto": "B-roll de lifestyle que aproxima o público da história" }
]
```

Sem esse campo, aparece a `descricao` do projeto.

## Reel

Em `data/site.json`, `"reel": { "tipo": "youtube", "id": "XXXXXXXXXXX", "formato": "16:9" }` mostra o
botão "Ver reel" na abertura. Com `"reel": null`, o botão fica escondido.

O WhatsApp fica em `contato.whatsapp`; pode ser escrito como quiser (ex.: `+55 (11) 98100-3202`).

## SEO

A cada publicação o site sai com:

- título, descrição e link canônico; prévia completa para WhatsApp, Instagram e redes (Open Graph);
- dados estruturados (schema.org) da pessoa, do site e de cada projeto com seus vídeos, o que ajuda
  o Google a entender o portfólio e a mostrar os vídeos na busca;
- `sitemap.xml` e `robots.txt`;
- todo o conteúdo já no HTML (sem depender de JavaScript para o Google ler);
- capas em três tamanhos, para cada tela baixar só o necessário.

Para o site aparecer mais rápido no Google, cadastre-o no
[Google Search Console](https://search.google.com/search-console) e envie o sitemap
`https://gustavovfonseca.github.io/sitemap.xml`.

## Ver o site no computador antes de publicar

Monte o site e abra a pasta gerada com um servidor local:

```bash
python3 scripts/build_site.py
python3 -m http.server -d _site 8000
```

e abra `http://localhost:8000`.

## O que ainda falta preencher

- [ ] Link do reel (`data/site.json`) — sem ele o botão "Ver reel" fica escondido
- [ ] Número de WhatsApp (`data/site.json`)
- [ ] Métricas de resultado (ROAS, retenção) e logos de clientes, se puderem ser divulgados
- [ ] Vinheta final sem a marca d'água "Veo" e com "captured" escrito certo
