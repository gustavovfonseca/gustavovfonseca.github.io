#!/usr/bin/env python3
"""Monta o site publicado em _site/ a partir de templates/index.html e dos JSON.

Só usa a biblioteca padrão do Python.

    python3 scripts/build_site.py            # gera _site/
    python3 -m http.server -d _site 8000     # para ver no navegador

O que entra no HTML final (e por isso aparece para o Google e nas prévias de link):
- textos, contatos, serviços e "Sobre" de data/site.json;
- o destaque (primeiro projeto) e a grade de trabalhos de data/projetos.json;
- título, descrição, Open Graph, link canônico e dados estruturados (JSON-LD).
Também gera robots.txt e sitemap.xml.
"""

import argparse
import datetime as dt
import hashlib
import html
import json
import re
import shutil
import sys
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
MODELO = RAIZ / "templates" / "index.html"

PLAY_SVG = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="#000"/></svg>'
SETA_SVG = ('<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" '
            'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>')


def e(texto):
    """Escapa texto para HTML (inclusive dentro de atributos)."""
    return html.escape(str(texto), quote=True)


def json_para_script(dados):
    """JSON seguro para colocar dentro de <script>."""
    return json.dumps(dados, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


# ---------- Imagens do Behance em vários tamanhos ----------

def capa_behance(url):
    """Se a capa é do CDN do Behance, devolve (src, srcset) com as versões de 404, 808 e 1380 px."""
    m = re.match(r"(https://mir-s3-cdn-cf\.behance\.net/projects/)[^/]+/(.+)$", url or "")
    if not m:
        return url, ""
    base, arquivo = m.groups()
    srcset = f"{base}404_webp/{arquivo} 404w, {base}808_webp/{arquivo} 808w, {base}original_webp/{arquivo} 1380w"
    return f"{base}808_webp/{arquivo}", srcset


def img_capa(url, alt, classe, sizes, carregar="lazy"):
    if not url:
        return ""
    src, srcset = capa_behance(url)
    extra = f' srcset="{e(srcset)}" sizes="{e(sizes)}"' if srcset else ""
    return (f'<img class="{classe}" src="{e(src)}"{extra} alt="{e(alt)}" width="1380" height="1080" '
            f'loading="{carregar}" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">')


# ---------- Vídeos ----------

def url_embed(v):
    vid = v.get("id", "")
    if v.get("tipo") == "youtube":
        return f"https://www.youtube.com/embed/{vid}"
    if v.get("tipo") == "vimeo":
        return f"https://player.vimeo.com/video/{vid}"
    if v.get("tipo") == "behance":
        return f"https://www-ccv.adobe.io/v1/player/ccv/{vid}/embed?api_key=behance1"
    return ""


def duracao_iso(texto):
    """'2:26' -> 'PT2M26S' (formato dos dados estruturados)."""
    m = re.fullmatch(r"(?:(\d+):)?(\d+):(\d{2})", texto or "")
    if not m:
        return None
    h, mi, s = (int(x) if x else 0 for x in m.groups())
    return "PT" + (f"{h}H" if h else "") + (f"{mi}M" if mi else "") + f"{s}S"


def formatos(p):
    vistos = []
    for v in p.get("videos", []):
        if v.get("formato") and v["formato"] not in vistos:
            vistos.append(v["formato"])
    return " · ".join(vistos)


# ---------- Blocos de HTML ----------

def linhas_titulo(linhas, destacar_ultima):
    partes = []
    for n, linha in enumerate(linhas):
        if destacar_ultima and n == len(linhas) - 1 and len(linhas) > 1:
            partes.append(f'<span class="accent">{e(linha)}</span>')
        else:
            partes.append(e(linha))
    return "<br>".join(partes)


def bloco_destaque(projetos, site):
    indice = next((n for n, p in enumerate(projetos) if p.get("videos")), None)
    titulo_secao = e(site["destaque"]["titulo"])
    if indice is None:
        return ""
    p = projetos[indice]
    v = p["videos"][0]
    qtd = len(p["videos"])
    meta = f"{qtd} vídeos · {formatos(p)}" if qtd > 1 else " · ".join(x for x in (v.get("formato"), v.get("duracao")) if x)
    rotulo = f"Assistir {p['titulo']}" + (f" ({qtd} vídeos)" if qtd > 1 else "")

    if p.get("destaques"):
        itens = []
        for n, d in enumerate(p["destaques"], 1):
            texto = (f"<b>{e(d['titulo'])}</b> — {e(d.get('texto', ''))}" if d.get("titulo") else e(d.get("texto", "")))
            itens.append(f'<li><span class="mono muted">{n:02d}</span><span>{texto}</span></li>')
        corpo = f'<ol class="beats">{"".join(itens)}</ol>'
    else:
        corpo = f'<p class="lead">{e(p.get("descricao", ""))}</p>' if p.get("descricao") else ""

    capa = img_capa(p.get("capa"), f"Capa do projeto {p['titulo']}", "screen__img",
                    "(max-width: 760px) 100vw, 640px")
    return f'''<section class="section section--graphite" id="destaque">
      <div class="wrap split">
        <div class="stack split__main">
          <p class="eyebrow">Em destaque · {e(p["titulo"])}</p>
          <h2 class="title">{titulo_secao}</h2>
          {corpo}
        </div>
        <button class="screen" type="button" data-projeto="{indice}" aria-label="{e(rotulo)}">
          {capa}
          <span class="play" aria-hidden="true">{PLAY_SVG}</span>
          <span class="screen__meta mono">{e(meta)}</span>
        </button>
      </div>
    </section>'''


def bloco_servicos(site):
    cards = []
    for n, s in enumerate(site["servicos"]["itens"], 1):
        cards.append(f'<div class="card"><span class="mono muted">{n:02d}</span><h3>{e(s["titulo"])}</h3>'
                     f'<p class="muted">{e(s["texto"])}</p></div>')
    processo = site["servicos"].get("processo") or []
    linha = ""
    if processo:
        linha = ('<p class="process mono"><span class="process__label">Como funciona:</span> '
                 + " → ".join(e(x) for x in processo) + "</p>")
    return "\n          ".join(cards), linha


def bloco_filtros(projetos):
    cats = []
    for p in projetos:
        if p["categoria"] not in cats:
            cats.append(p["categoria"])
    if len(cats) < 2:
        return ""
    botoes = ['<button type="button" class="filter" data-filtro="Todos" aria-pressed="true">Todos</button>']
    botoes += [f'<button type="button" class="filter" data-filtro="{e(c)}" aria-pressed="false">{e(c)}</button>'
               for c in cats]
    return ('<div class="filters" id="filtros" role="group" aria-label="Filtrar trabalhos por categoria">'
            + "".join(botoes) + "</div>")


def bloco_cards(projetos):
    cards = []
    for n, p in enumerate(projetos):
        qtd = len(p.get("videos", []))
        capa = img_capa(p.get("capa"), f"Capa do projeto {p['titulo']}", "work__media",
                        "(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 300px")
        contagem = f'<span class="work__count">{qtd} vídeos</span>' if qtd > 1 else ""
        topo = f'<span class="work__top"><span class="work__cat">{e(p["categoria"])}</span>{contagem}</span>'
        if qtd:
            rotulo = f"Assistir {p['titulo']}" + (f" ({qtd} vídeos)" if qtd > 1 else "")
            tile = (f'<button type="button" class="work__tile" data-projeto="{n}" aria-label="{e(rotulo)}">'
                    f'{capa}{topo}<span class="play" aria-hidden="true">{PLAY_SVG}</span>'
                    f'<span class="work__fmt">{e(formatos(p))}</span></button>')
        elif p.get("behance"):
            tile = (f'<a class="work__tile" href="{e(p["behance"])}" target="_blank" rel="noopener" '
                    f'aria-label="Ver {e(p["titulo"])} no Behance (abre em nova aba)">'
                    f'{capa}{topo}<span class="play" aria-hidden="true">{SETA_SVG}</span>'
                    f'<span class="work__fmt">Ver no Behance ↗</span></a>')
        else:
            continue
        desc = f'<p class="work__desc">{e(p["descricao"])}</p>' if p.get("descricao") else ""
        ferr = (f'<p class="work__tools mono">{" · ".join(e(f) for f in p["ferramentas"])}</p>'
                if p.get("ferramentas") else "")
        cards.append(f'<article class="work" data-categoria="{e(p["categoria"])}">{tile}'
                     f'<div class="work__body"><h3 class="work__title">{e(p["titulo"])}</h3>{desc}{ferr}</div></article>')
    return "\n          ".join(cards)


def lista_ferramentas(site, projetos):
    contagem = Counter()
    ordem = []
    for f in list(site["sobre"].get("ferramentas") or []) + [f for p in projetos for f in p.get("ferramentas", [])]:
        contagem[f] += 1
        if f not in ordem:
            ordem.append(f)
    return sorted(ordem, key=lambda f: (-contagem[f], ordem.index(f)))


def bloco_contato(site):
    c = site["contato"]
    botoes = []
    if c.get("email"):
        botoes.append(f'<a class="btn btn--dark" href="mailto:{e(c["email"])}">Enviar e-mail</a>')
    numero = re.sub(r"\D", "", c.get("whatsapp") or "")
    if numero:
        botoes.append(f'<a class="btn btn--outline" href="https://wa.me/{numero}" target="_blank" rel="noopener">WhatsApp</a>')
    if c.get("instagram"):
        usuario = c["instagram"].lstrip("@")
        botoes.append(f'<a class="btn btn--outline" href="https://instagram.com/{e(usuario)}" target="_blank" '
                      f'rel="noopener me">Instagram @{e(usuario)}</a>')
    return "\n          ".join(botoes)


def botao_reel(site):
    if not site.get("reel"):
        return ""
    return ('<button class="reel-btn" type="button" data-video="reel">'
            f'<span class="reel-btn__dot">{PLAY_SVG.replace("20", "22")}</span>Ver reel</button>')


# ---------- SEO: dados estruturados ----------

def json_ld(site, projetos, ferramentas):
    url = site["url"].rstrip("/")
    pessoa_id = f"{url}/#pessoa"
    mesmo_que = []
    if site["contato"].get("instagram"):
        mesmo_que.append(f"https://www.instagram.com/{site['contato']['instagram'].lstrip('@')}/")
    if site.get("behance"):
        mesmo_que.append(f"https://www.behance.net/{site['behance']}")

    pessoa = {
        "@type": "Person",
        "@id": pessoa_id,
        "name": site["nome"],
        "jobTitle": site["profissao"],
        "url": url + "/",
        "image": f"{url}/{site['sobre']['foto']}",
        "address": {"@type": "PostalAddress", "addressLocality": site["cidade"], "addressCountry": "BR"},
        "knowsAbout": ["Edição de vídeo", "Motion graphics", "Direct Response", "Criativos para tráfego pago",
                       "TikTok Shop"] + ferramentas,
        "sameAs": mesmo_que,
    }
    if site["contato"].get("email"):
        pessoa["email"] = f"mailto:{site['contato']['email']}"

    itens = []
    for n, p in enumerate(projetos, 1):
        trabalho = {
            "@type": "CreativeWork",
            "name": p["titulo"],
            "creator": {"@id": pessoa_id},
            "genre": p["categoria"],
        }
        if p.get("descricao"):
            trabalho["description"] = p["descricao"]
        if p.get("capa"):
            trabalho["image"] = capa_behance(p["capa"])[0]
        if p.get("behance"):
            trabalho["url"] = p["behance"]
        if p.get("publicado"):
            trabalho["datePublished"] = p["publicado"]
        videos = []
        for k, v in enumerate(p.get("videos", []), 1):
            if not (p.get("capa") and p.get("publicado")):
                break  # o Google exige miniatura e data para vídeos
            video = {
                "@type": "VideoObject",
                "name": p["titulo"] if len(p["videos"]) == 1 else f"{p['titulo']} — vídeo {k}",
                "description": p.get("descricao") or p["titulo"],
                "thumbnailUrl": capa_behance(p["capa"])[0],
                "uploadDate": p["publicado"],
                "embedUrl": url_embed(v),
            }
            if duracao_iso(v.get("duracao")):
                video["duration"] = duracao_iso(v["duracao"])
            videos.append(video)
        if videos:
            trabalho["video"] = videos
        itens.append({"@type": "ListItem", "position": n, "item": trabalho})

    grafo = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "WebSite", "@id": f"{url}/#site", "url": url + "/", "name": site["marca"],
             "inLanguage": "pt-BR", "publisher": {"@id": pessoa_id}},
            {"@type": "ProfilePage", "@id": f"{url}/#pagina", "url": url + "/", "name": site["seo"]["titulo"],
             "description": site["seo"]["descricao"], "inLanguage": "pt-BR", "isPartOf": {"@id": f"{url}/#site"},
             "mainEntity": {"@id": pessoa_id}},
            pessoa,
            {"@type": "ItemList", "name": "Trabalhos", "itemListElement": itens},
        ],
    }
    return json_para_script(grafo)


# ---------- Montagem ----------

def preencher(modelo, contexto):
    def valor(caminho):
        atual = contexto
        for parte in caminho.split("."):
            if not isinstance(atual, dict) or parte not in atual:
                sys.exit(f"Campo não encontrado no modelo: {caminho}")
            atual = atual[parte]
        return atual

    saida = re.sub(r"\{\{\{\s*([\w.]+)\s*\}\}\}", lambda m: str(valor(m.group(1))), modelo)
    saida = re.sub(r"\{\{\s*([\w.]+)\s*\}\}", lambda m: e(valor(m.group(1))), saida)
    if "{{" in saida:
        sys.exit("Sobrou marcador {{ }} sem preencher no modelo.")
    return saida


def montar(saida):
    site = json.loads((RAIZ / "data" / "site.json").read_text(encoding="utf-8"))
    projetos = [p for p in json.loads((RAIZ / "data" / "projetos.json").read_text(encoding="utf-8"))
                if p.get("titulo") and p.get("categoria") and not p.get("oculto")]

    anos = site["anos_experiencia"]
    trocar_anos = lambda t: t.replace("{anos}", str(anos))
    url = site["url"].rstrip("/")
    nome_partes = site["nome"].split()
    ferramentas = lista_ferramentas(site, projetos)
    cards_servicos, processo = bloco_servicos(site)

    css = (RAIZ / "assets" / "css" / "style.css").read_bytes()
    js = (RAIZ / "assets" / "js" / "main.js").read_bytes()

    contexto = dict(site)
    contexto.update({
        "url_inicio": url + "/",
        "url_og_imagem": f"{url}/assets/img/og-image.jpg",
        "nome_primeiro": nome_partes[0],
        "nome_ultimo": nome_partes[-1],
        "marca_maiusculas": site["marca"].upper(),
        "profissao_minusculas": site["profissao"][:1].lower() + site["profissao"][1:],
        "anos_mais": f"{anos}+",
        "ano": dt.date.today().year,
        "versao": hashlib.sha1(css + js).hexdigest()[:8],
        "abertura_titulo": linhas_titulo(site["abertura"]["titulo"], destacar_ultima=True),
        "abertura_texto": trocar_anos(site["abertura"]["texto"]),
        "sobre_texto": trocar_anos(site["sobre"]["texto"]),
        "contato_titulo": linhas_titulo(site["contato"]["titulo"], destacar_ultima=False),
        "secao_destaque": bloco_destaque(projetos, site),
        "servicos_cards": cards_servicos,
        "servicos_processo": processo,
        "filtros": bloco_filtros(projetos),
        "cards_trabalhos": bloco_cards(projetos),
        "ferramentas": ('<ul class="tags">' + "".join(f"<li>{e(f)}</li>" for f in ferramentas) + "</ul>")
                       if ferramentas else "",
        "botoes_contato": bloco_contato(site),
        "botao_reel": botao_reel(site),
        "json_ld": json_ld(site, projetos, ferramentas),
        "dados_player": json_para_script({
            "reel": site.get("reel"),
            "projetos": [{"titulo": p["titulo"], "videos": p.get("videos", [])} for p in projetos],
        }),
    })
    contexto["seo"] = {k: trocar_anos(v) for k, v in site["seo"].items()}

    pagina = preencher(MODELO.read_text(encoding="utf-8"), contexto)

    if saida.exists():
        shutil.rmtree(saida)
    saida.mkdir(parents=True)
    (saida / "index.html").write_text(pagina, encoding="utf-8")
    shutil.copytree(RAIZ / "assets", saida / "assets")
    shutil.copy2(RAIZ / "404.html", saida / "404.html")
    # Arquivos que precisam ficar na raiz do site sem alteração (ex.: verificação do Google).
    publico = RAIZ / "publico"
    if publico.is_dir():
        for arquivo in publico.iterdir():
            if arquivo.is_file():
                shutil.copy2(arquivo, saida / arquivo.name)

    hoje = dt.date.today().isoformat()
    (saida / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {url}/sitemap.xml\n", encoding="utf-8")
    (saida / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"  <url><loc>{url}/</loc><lastmod>{hoje}</lastmod></url>\n"
        "</urlset>\n", encoding="utf-8")
    print(f"Site montado em {saida.relative_to(RAIZ) if saida.is_relative_to(RAIZ) else saida} "
          f"({len(projetos)} projetos, {sum(len(p.get('videos', [])) for p in projetos)} vídeos).")


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--saida", default=str(RAIZ / "_site"), help="pasta de saída (padrão: _site)")
    montar(Path(ap.parse_args().saida).resolve())


if __name__ == "__main__":
    main()
