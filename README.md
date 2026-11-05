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
data/site.json          reel, anúncio em destaque e WhatsApp
.github/workflows/      publicação automática no GitHub Pages
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

## Como adicionar ou trocar um trabalho

Edite `data/projetos.json`. Cada trabalho é um bloco assim:

```json
{
  "titulo": "VSL — Produto X",
  "categoria": "Direct Response",
  "formato": "9:16",
  "duracao": "0:45",
  "capa": "assets/img/trabalhos/produto-x.jpg",
  "previa": "assets/video/previas/produto-x.mp4",
  "video": { "tipo": "youtube", "id": "dQw4w9WgXcQ" }
}
```

- **categoria**: os botões de filtro são criados a partir das categorias que aparecem na lista.
- **formato**: `9:16` (vertical) ou `16:9` (horizontal). Define o tamanho do player.
- **capa** (opcional): imagem JPG/WebP vertical, ~600×1066 px, até ~150 KB.
- **previa** (opcional): MP4 curto (3–6 s), sem áudio, ~720 px de altura, até ~1 MB. Toca em loop na grade.
- **video**: onde está o vídeo completo.
  - YouTube: `{ "tipo": "youtube", "id": "<código depois de v= ou de shorts/>" }`
  - Vimeo: `{ "tipo": "vimeo", "id": "<número do vídeo>" }`
  - Arquivo no próprio site (só para vídeos pequenos): `{ "tipo": "arquivo", "arquivo": "assets/video/x.mp4" }`
  - Ainda sem vídeo: `null` — o player mostra "Este vídeo ainda não foi adicionado".
- Para esconder um trabalho sem apagar, adicione `"oculto": true`.

Vídeos longos devem ficar no YouTube (pode ser "não listado") ou no Vimeo:
o GitHub Pages limita o site a 1 GB e o tráfego a ~100 GB/mês.

## Reel, anúncio em destaque e WhatsApp

Em `data/site.json`:

```json
{
  "reel":     { "tipo": "youtube", "id": "XXXXXXXXXXX", "formato": "16:9" },
  "destaque": { "tipo": "youtube", "id": "YYYYYYYYYYY", "formato": "9:16" },
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

Procure por `[` no `index.html` e no `data/projetos.json`:

- [ ] Vídeos reais dos trabalhos (títulos, capas, links)
- [ ] Link do reel e do anúncio em destaque (`data/site.json`)
- [ ] Números de resultado (ROAS, retenção) — ou remover esses cards
- [ ] Logos de clientes
- [ ] Foto do Gustavo (`assets/img/gustavo.jpg`) e ferramentas
- [ ] Número de WhatsApp
- [ ] Tempos do anúncio em destaque (seção "Anúncio em destaque")
- [ ] Vinheta final sem a marca d'água "Veo" e com "captured" escrito certo
