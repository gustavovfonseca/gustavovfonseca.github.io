#!/usr/bin/env python3
"""Sincroniza data/projetos.json com o feed RSS público do Behance.

Usa só a biblioteca padrão do Python. O feed traz título, link, capa, descrição
e data de cada projeto; ele NÃO traz os vídeos. Por isso:

- Projeto novo no Behance  -> entra no site com capa e descrição, e o card abre a
  página do projeto no Behance até que os vídeos sejam adicionados em "videos".
- Projeto que já está no site -> atualiza link, capa (se for do Behance) e data.
  Título, categoria, descrição, ferramentas, vídeos e "oculto" editados à mão
  são mantidos.
- Projeto apagado no Behance -> sai do site (só quando é certo que ele deveria
  aparecer no feed; veja `remover_ausentes`).
- Ordem dos projetos -> igual à do perfil no Behance (o feed vem nessa ordem).
- Se nada mudou, o arquivo não é regravado.

Uso:
    python3 scripts/sync_behance.py               # baixa o feed e atualiza
    python3 scripts/sync_behance.py --feed x.xml  # usa um arquivo local (testes)
    python3 scripts/sync_behance.py --dry-run     # mostra o que mudaria
"""

import argparse
import email.utils
import html
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PROJETOS = RAIZ / "data" / "projetos.json"
SITE = RAIZ / "data" / "site.json"
USER_AGENT = "FonsekaiArchiveSync/1.0 (+https://gustavovfonseca.github.io)"
CDN_BEHANCE = "mir-s3-cdn-cf.behance.net"

# Palavras que ajudam a escolher a categoria de um projeto novo.
CATEGORIAS = [
    ("Direct Response", ("direct response", "vsl", "tiktok shop", "tiktokshop", "criativo", "reels", "anúncio", "anuncio", "ads", "ugc")),
    ("Motion", ("motion",)),
]
CATEGORIA_PADRAO = "Conteúdo"


def baixar(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/xml"})
    with urllib.request.urlopen(req, timeout=30) as r:
        if r.status != 200:
            raise RuntimeError(f"{url} respondeu {r.status}")
        tipo = r.headers.get("Content-Type", "")
        corpo = r.read()
    if "xml" not in tipo:
        raise RuntimeError(f"{url} não devolveu um feed (Content-Type: {tipo!r}); o Behance pode estar bloqueando o acesso.")
    return corpo


def id_do_link(link):
    m = re.search(r"/gallery/(\d+)", link or "")
    return m.group(1) if m else None


def texto_limpo(fragmento_html):
    sem_tags = re.sub(r"<[^>]+>", " ", fragmento_html or "")
    return re.sub(r"\s+", " ", html.unescape(sem_tags)).strip()


def capa_grande(url):
    # O feed traz a capa de 404 px; a versão original_webp do mesmo arquivo tem 1380 px.
    return re.sub(r"/projects/\d+/", "/projects/original_webp/", url) if url else ""


def ler_feed(xml_bytes):
    raiz = ET.fromstring(xml_bytes)
    itens = []
    for item in raiz.iter("item"):
        link = (item.findtext("link") or "").strip()
        pid = id_do_link(link)
        if not pid:
            continue
        descricao_html = item.findtext("description") or ""
        img = re.search(r"<img[^>]+src=['\"]([^'\"]+)", descricao_html)
        data = item.findtext("pubDate")
        publicado = email.utils.parsedate_to_datetime(data).date().isoformat() if data else ""
        itens.append({
            "id": pid,
            "nome": (item.findtext("title") or "").strip(),
            "link": link,
            "capa": capa_grande(img.group(1)) if img else "",
            "descricao": texto_limpo(descricao_html),
            "publicado": publicado,
        })
    return itens


SIGLAS = {"ugc", "vsl", "ads", "ai", "ia", "3d", "tv", "dr", "cta", "ux", "ui"}


def titulo_bonito(nome):
    if not nome.isupper():
        return nome
    partes = re.split(r"(\s+|/)", nome.lower())
    return "".join(
        p if p.isspace() or p == "/" else (p.upper() if p in SIGLAS else p[:1].upper() + p[1:])
        for p in partes
    )


def adivinhar_categoria(item):
    texto = f"{item['nome']} {item['descricao']}".lower()
    for categoria, palavras in CATEGORIAS:
        if any(p in texto for p in palavras):
            return categoria
    return CATEGORIA_PADRAO


def novo_projeto(item):
    return {
        "titulo": titulo_bonito(item["nome"]),
        "categoria": adivinhar_categoria(item),
        "descricao": item["descricao"],
        "ferramentas": [],
        "capa": item["capa"],
        "behance": item["link"],
        "publicado": item["publicado"],
        "videos": [],
    }


def sincronizar(projetos, itens, remover_ausentes=True):
    """Devolve (nova_lista, log). Não altera a lista recebida."""
    log = []
    por_id = {item["id"]: item for item in itens}
    vistos = set()
    resultado = []

    # Data do item mais antigo do feed: abaixo dela o feed pode ter cortado a lista.
    datas = sorted(i["publicado"] for i in itens if i["publicado"])
    mais_antigo = datas[0] if datas else ""

    for p in projetos:
        pid = id_do_link(p.get("behance", ""))
        if not pid:
            resultado.append(p)  # projeto sem Behance: é manual, fica como está
            continue
        vistos.add(pid)
        item = por_id.get(pid)
        if item is None:
            publicado = p.get("publicado", "")
            dentro_da_janela = bool(publicado and mais_antigo and publicado >= mais_antigo)
            if remover_ausentes and dentro_da_janela:
                log.append(f"- removido (não está mais no Behance): {p.get('titulo')}")
                continue
            resultado.append(p)
            continue
        atualizado = dict(p)
        atualizado["behance"] = item["link"]
        if item["publicado"]:
            atualizado["publicado"] = item["publicado"]
        capa_atual = p.get("capa", "")
        if item["capa"] and (not capa_atual or CDN_BEHANCE in capa_atual):
            atualizado["capa"] = item["capa"]
        if not p.get("descricao") and item["descricao"]:
            atualizado["descricao"] = item["descricao"]
        if atualizado != p:
            log.append(f"- atualizado: {p.get('titulo')}")
        resultado.append(atualizado)

    novos = [novo_projeto(i) for i in itens if i["id"] not in vistos]
    for n in novos:
        log.append(f"+ novo: {n['titulo']} ({n['categoria']}) — adicione os vídeos em data/projetos.json")

    # Mesma ordem do perfil no Behance (o feed vem na ordem do perfil). Projetos que não
    # estão no feed (manuais ou antigos demais para o feed) vão para o fim, na ordem atual.
    posicao = {item["id"]: n for n, item in enumerate(itens)}
    todos = novos + resultado
    ordenado = sorted(
        enumerate(todos),
        key=lambda par: (posicao.get(id_do_link(par[1].get("behance", "")), len(itens)), par[0]),
    )
    ordenado = [p for _, p in ordenado]
    antes = [p.get("titulo") for p in resultado]
    depois = [p.get("titulo") for p in ordenado if p in resultado]
    if antes != depois:
        log.append("~ ordem atualizada para seguir o perfil do Behance: " + ", ".join(p.get("titulo") for p in ordenado))
    return ordenado, log


def para_json(projetos):
    """JSON com 2 espaços e um vídeo por linha, igual ao arquivo editado à mão."""
    texto = json.dumps(projetos, ensure_ascii=False, indent=2)

    def compactar(m):
        objeto = json.loads(m.group(0))
        return json.dumps(objeto, ensure_ascii=False, separators=(", ", ": ")).replace("{", "{ ", 1)[:-1] + " }"

    # Junta em uma linha cada objeto dentro de "videos" e cada lista de "ferramentas".
    texto = re.sub(r"\{\n\s+\"tipo\"[^{}]*?\n\s+\}", compactar, texto)
    texto = re.sub(r"\"ferramentas\": \[\n\s+([^\]]*?)\n\s+\]",
                   lambda m: '"ferramentas": [' + ", ".join(s.strip() for s in m.group(1).split(",\n")) + "]",
                   texto)
    return texto + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--feed", help="arquivo RSS local em vez de baixar")
    ap.add_argument("--usuario", help="usuário do Behance (padrão: data/site.json → behance)")
    ap.add_argument("--dry-run", action="store_true", help="não grava, só mostra")
    args = ap.parse_args()

    site = json.loads(SITE.read_text(encoding="utf-8"))
    usuario = args.usuario or site.get("behance")
    if not usuario and not args.feed:
        sys.exit("Defina \"behance\" em data/site.json com o usuário do Behance.")

    xml_bytes = Path(args.feed).read_bytes() if args.feed else baixar(f"https://www.behance.net/feeds/user?username={usuario}")
    itens = ler_feed(xml_bytes)
    if not itens:
        sys.exit("O feed veio sem projetos; nada foi alterado.")

    texto_atual = PROJETOS.read_text(encoding="utf-8")
    atual = json.loads(texto_atual)
    novo, log = sincronizar(atual, itens)
    texto_novo = para_json(novo)
    print(f"Feed: {len(itens)} projetos. Site: {len(atual)} -> {len(novo)} projetos.")

    # Só grava se o arquivo realmente mudar; assim o workflow não commita nem publica à toa.
    if texto_novo == texto_atual:
        print("Nada mudou.")
        return
    print("\n".join(log) if log else "Só ajuste de formatação.")
    if args.dry_run:
        return
    PROJETOS.write_text(texto_novo, encoding="utf-8")
    print(f"Gravado {PROJETOS.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
