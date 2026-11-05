# Fonsekai Archive — portfólio de Gustavo Fonseca

Site estático (HTML, CSS e JavaScript puros, sem dependências) publicado no GitHub Pages.

## Estrutura

```
index.html              página única do site
404.html                página de "não encontrado"
assets/css/style.css    estilos (cores no topo do arquivo)
assets/js/main.js       vinheta, filtros, grade de trabalhos e player
assets/img/             logo, favicon e imagem de compartilhamento
assets/video/           vinheta de abertura e o quadro final (poster)
data/projetos.json      lista de trabalhos da grade
data/site.json          usuário do Behance, reel e WhatsApp
scripts/sync_behance.py lê o feed do Behance e atualiza data/projetos.json
scripts/coletar-videos.js coleta no navegador a lista de vídeos de cada projeto
.github/workflows/      publicação no GitHub Pages e sincronização com o Behance
```

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

A seção "Em destaque" mostra sempre o **primeiro vídeo do primeiro projeto** de
`data/projetos.json` — ou seja, do primeiro projeto do perfil no Behance. Para trocar o destaque,
mude a ordem no Behance (ou dos vídeos dentro do projeto).

Os pontos ao lado do vídeo vêm do campo opcional `destaques` do projeto:

```json
"destaques": [
  { "titulo": "Conexão", "texto": "B-roll de lifestyle que aproxima o público da história" }
]
```

Sem esse campo, aparece a `descricao` do projeto.

## Reel e WhatsApp

Em `data/site.json`:

```json
{
  "reel":     { "tipo": "youtube", "id": "XXXXXXXXXXX", "formato": "16:9" },
  "whatsapp": "5511999999999"
}
```

- Sem `reel`, o botão "Ver reel" fica escondido.
- Sem `whatsapp`, o botão de WhatsApp fica escondido. Use DDI + DDD + número, só dígitos.

## Ver o site no computador antes de publicar

Os dados vêm de arquivos JSON, então abrir o `index.html` direto no navegador não carrega a grade.
Rode um servidor local na pasta do site:

```bash
python3 -m http.server 8000
```

e abra `http://localhost:8000`.

## O que ainda falta preencher

- [ ] Link do reel (`data/site.json`) — sem ele o botão "Ver reel" fica escondido
- [ ] Número de WhatsApp (`data/site.json`)
- [ ] Métricas de resultado (ROAS, retenção) e logos de clientes, se puderem ser divulgados
- [ ] Vinheta final sem a marca d'água "Veo" e com "captured" escrito certo
