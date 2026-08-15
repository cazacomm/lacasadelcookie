#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate-article.py — génération automatique d'un article de blog.

Principe : le gabarit HTML n'est jamais dupliqué dans ce script. Il est relu à
chaque exécution depuis l'article de référence déclaré dans blog-config.json
(`template_article`). Seules les zones variables sont substituées. Toute
évolution du design de l'article de référence est donc reprise automatiquement.

Codes de sortie :
    0   un article a été généré (ou aurait été généré, en --dry-run)
    1   erreur (API, validation, fichier illisible…) — rien n'est écrit
    78  aucun nouveau sujet à traiter — rien n'est écrit

Usage :
    python3 scripts/generate-article.py
    python3 scripts/generate-article.py --dry-run
    python3 scripts/generate-article.py --dry-run --mock-response fixture.json
    python3 scripts/generate-article.py --topic 4
"""

from __future__ import annotations

import argparse
import html as html_mod
import json
import os
import re
import sys
import unicodedata
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

EXIT_OK = 0
EXIT_ERROR = 1
EXIT_NO_TOPIC = 78

MOIS_FR = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]


# --------------------------------------------------------------------------
# Log
# --------------------------------------------------------------------------

def log(msg: str) -> None:
    print(f"[blog-auto] {msg}", flush=True)


def fail(msg: str) -> "NoReturn":  # type: ignore[valid-type]
    print(f"[blog-auto] ERREUR : {msg}", file=sys.stderr, flush=True)
    sys.exit(EXIT_ERROR)


# --------------------------------------------------------------------------
# Utilitaires texte / HTML
# --------------------------------------------------------------------------

def slugify(text: str) -> str:
    """Slug conforme à BLOG_WORKFLOW.md : minuscules, tirets, sans accent."""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return re.sub(r"-{2,}", "-", text).strip("-")


def esc_attr(text: str) -> str:
    return html_mod.escape(text, quote=True)


def esc_text(text: str) -> str:
    return html_mod.escape(text, quote=False)


def strip_tags(html_str: str) -> str:
    return re.sub(r"<[^>]+>", " ", html_str)


def word_count(html_str: str) -> int:
    return len(strip_tags(html_str).split())


def find_balanced_div(html_str: str, start_idx: int) -> int:
    """Index de fin du </div> fermant le <div> ouvert à start_idx (exclu)."""
    depth = 0
    for m in re.finditer(r"<div\b[^>]*>|</div>", html_str[start_idx:]):
        if m.group(0).startswith("</"):
            depth -= 1
            if depth == 0:
                return start_idx + m.end()
        else:
            depth += 1
    raise ValueError("<div> non équilibré dans le gabarit")


def replace_block(html_str: str, open_pattern: str, close_tag: str, new_block: str) -> str:
    """Remplace le bloc allant de `open_pattern` jusqu'à `close_tag` inclus."""
    m = re.search(open_pattern, html_str)
    if not m:
        raise ValueError(f"bloc introuvable dans le gabarit : {open_pattern}")
    end = html_str.index(close_tag, m.start()) + len(close_tag)
    return html_str[: m.start()] + new_block + html_str[end:]


def sub_attr(html_str: str, pattern: str, value: str, label: str) -> str:
    """Remplace le groupe 1 d'un motif par `value`. Échoue si le motif manque."""
    out, n = re.subn(pattern, lambda m: m.group(0).replace(m.group(1), value, 1), html_str, count=1)
    if n != 1:
        raise ValueError(f"motif introuvable dans le gabarit : {label}")
    return out


# --------------------------------------------------------------------------
# Configuration & état du dépôt
# --------------------------------------------------------------------------

def load_config() -> dict:
    path = REPO / "blog-config.json"
    if not path.exists():
        fail("blog-config.json introuvable à la racine du dépôt")
    try:
        cfg = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"blog-config.json illisible : {exc}")
    for key in ("site_name", "site_url", "site_slug", "template_article"):
        if not cfg.get(key):
            fail(f"blog-config.json : clé « {key} » manquante")
    cfg["site_url"] = cfg["site_url"].rstrip("/")
    return cfg


def parse_topics(cfg: dict) -> list[dict]:
    """Extrait les sujets suggérés du tableau de BLOG_WORKFLOW.md."""
    doc = REPO / cfg.get("workflow_doc", "BLOG_WORKFLOW.md")
    if not doc.exists():
        fail(f"{doc.name} introuvable")

    topics: list[dict] = []
    for line in doc.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) < 3 or not cells[0].isdigit():
            continue
        topics.append({"n": int(cells[0]), "subject": cells[1], "angle": cells[2]})

    if not topics:
        fail(f"aucun sujet trouvé dans {doc.name} (tableau « Douze sujets » attendu)")
    topics.sort(key=lambda t: t["n"])
    log(f"{len(topics)} sujets lus depuis {doc.name}")
    return topics


def scan_existing(cfg: dict) -> tuple[set[int], set[str]]:
    """Renvoie (numéros de sujets déjà publiés, slugs déjà présents)."""
    marker_re = re.compile(rf"<!--\s*{re.escape(cfg['site_slug'])}-topic:\s*(\d+)\s*-->")
    done: set[int] = set()
    slugs: set[str] = set()

    for article in sorted((REPO / "blog").glob("*/index.html")):
        slugs.add(article.parent.name)
        m = marker_re.search(article.read_text(encoding="utf-8"))
        if m:
            done.add(int(m.group(1)))

    log(f"articles existants : {len(slugs)} ({', '.join(sorted(slugs)) or 'aucun'})")
    log(f"sujets déjà traités : {sorted(done) or 'aucun'}")
    return done, slugs


def pick_topic(topics: list[dict], done: set[int], forced: int | None) -> dict | None:
    if forced is not None:
        for t in topics:
            if t["n"] == forced:
                if t["n"] in done:
                    log(f"sujet {forced} déjà traité — forcé malgré tout")
                return t
        fail(f"sujet {forced} absent de la liste")
    for t in topics:
        if t["n"] not in done:
            return t
    return None


# --------------------------------------------------------------------------
# Appel OpenAI
# --------------------------------------------------------------------------

def build_prompt(cfg: dict, topic: dict, existing_titles: list[str]) -> str:
    facts = "\n".join(f"- {f}" for f in cfg.get("verified_facts", []))
    forbidden = "\n".join(f"- {f}" for f in cfg.get("forbidden_content", []))
    geo = ", ".join(cfg.get("geo_keywords", []))
    deja = "\n".join(f"- {t}" for t in existing_titles) or "- (aucun)"

    return f"""Tu rédiges un article de blog pour {cfg['site_name']}, {cfg['sector']}, basé à {cfg['location']}.

SUJET IMPOSÉ : {topic['subject']}
ANGLE / MOT-CLÉ VISÉ : {topic['angle']}

TON : {cfg['tone']}. Tu écris comme un artisan qui conseille son client, pas comme un blog générique.

CONTRAINTES DE FOND — les seuls faits que tu as le droit d'affirmer sur l'entreprise :
{facts}

INTERDICTIONS ABSOLUES — n'invente jamais :
{forbidden}
Si une information te manque, formule-la de façon ouverte (« selon votre zone », « nous consulter »)
plutôt que de trancher. Ne cite aucune source, étude ou statistique.

ANCRAGE LOCAL OBLIGATOIRE : cite naturellement plusieurs de ces lieux : {geo}.

ARTICLES DÉJÀ PUBLIÉS (ne les répète pas, tu peux y faire allusion) :
{deja}

STRUCTURE ATTENDUE :
- environ {cfg['target_word_count']} mots dans le corps (minimum {cfg.get('min_word_count', 950)})
- au moins {cfg.get('min_h2_count', 3)} sections <h2>, avec des <h3> à l'intérieur
- au moins une liste <ul><li>
- exactement {cfg['faq_questions_count']} questions de FAQ, concrètes, telles qu'un client les poserait

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, avec ces clés :
{{
  "title": "titre de l'article, 60-90 caractères, accrocheur et clair",
  "meta_description": "moins de {cfg.get('max_meta_description_length', 154)} caractères, une phrase, contenant un lieu",
  "keywords": "6 à 10 mots-clés séparés par des virgules",
  "category_tag": "étiquette courte, 1 à 3 mots (ex : Guide local, Conseil, Coulisses)",
  "excerpt": "résumé de 25 à 40 mots pour la carte du blog",
  "lead": "paragraphe d'introduction de 50 à 80 mots, sans balise HTML",
  "body_html": "le corps de l'article en HTML : uniquement <h2>, <h3>, <p>, <ul>, <li>, <strong>. Pas de <h1>, pas de <script>, pas de <div>, pas de <img>, pas de lien externe.",
  "faq": [
    {{"question": "…", "answer": "réponse de 2 à 4 phrases, sans balise HTML"}}
  ]
}}"""


def call_openai(cfg: dict, prompt: str) -> dict:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        fail("variable d'environnement OPENAI_API_KEY absente")

    try:
        from openai import OpenAI
    except ImportError:
        fail("paquet « openai » non installé (pip install openai)")

    client = OpenAI(api_key=api_key)
    model = cfg.get("openai_model", "gpt-4o-mini")
    last_error = None

    for attempt in (1, 2):
        try:
            log(f"appel OpenAI ({model}), tentative {attempt}/2…")
            resp = client.chat.completions.create(
                model=model,
                temperature=cfg.get("openai_temperature", 0.7),
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Tu es rédacteur SEO local pour des artisans français. "
                            "Tu n'inventes jamais de chiffre, de prix, de date ni de nom. "
                            "Tu réponds exclusivement en JSON valide."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
            )
            raw = resp.choices[0].message.content or ""
            usage = getattr(resp, "usage", None)
            if usage:
                log(f"tokens : {usage.prompt_tokens} entrée / {usage.completion_tokens} sortie")
            return json.loads(raw)
        except json.JSONDecodeError as exc:
            last_error = f"réponse non-JSON : {exc}"
        except Exception as exc:  # erreurs réseau / API / quota
            last_error = f"{type(exc).__name__}: {exc}"
        log(f"échec tentative {attempt} — {last_error}")

    fail(f"appel OpenAI échoué après 2 tentatives — {last_error}")


# --------------------------------------------------------------------------
# Validation
# --------------------------------------------------------------------------

def validate(cfg: dict, data: dict) -> None:
    required = ("title", "meta_description", "keywords", "category_tag",
                "excerpt", "lead", "body_html", "faq")
    missing = [k for k in required if not data.get(k)]
    if missing:
        fail(f"réponse incomplète, clés manquantes : {', '.join(missing)}")

    body = data["body_html"]

    max_meta = cfg.get("max_meta_description_length", 154)
    if len(data["meta_description"]) > max_meta:
        fail(f"meta description trop longue ({len(data['meta_description'])} > {max_meta})")

    wc = word_count(body)
    if wc < cfg.get("min_word_count", 950):
        fail(f"corps trop court ({wc} mots, minimum {cfg.get('min_word_count', 950)})")

    h2 = len(re.findall(r"<h2\b", body))
    if h2 < cfg.get("min_h2_count", 3):
        fail(f"pas assez de <h2> ({h2}, minimum {cfg.get('min_h2_count', 3)})")

    if re.search(r"<h1\b|<script\b|<iframe\b|<img\b", body, re.I):
        fail("le corps contient une balise interdite (h1/script/iframe/img)")

    if re.search(r"\d\s*(€|euros?)|\b(prix|tarif)\s*:\s*\d", body, re.I):
        fail("le corps contient un prix chiffré — interdit par BLOG_WORKFLOW.md")

    expected = cfg["faq_questions_count"]
    faq = data["faq"]
    if not isinstance(faq, list) or len(faq) != expected:
        fail(f"FAQ invalide : {len(faq) if isinstance(faq, list) else '?'} entrées au lieu de {expected}")
    for i, item in enumerate(faq, 1):
        if not isinstance(item, dict) or not item.get("question") or not item.get("answer"):
            fail(f"FAQ : entrée {i} incomplète")

    log(f"validation OK — {wc} mots, {h2} sections H2, {len(faq)} questions FAQ")


# --------------------------------------------------------------------------
# Rendu de l'article à partir du gabarit
# --------------------------------------------------------------------------

def render_article(cfg: dict, template: str, data: dict, topic: dict,
                   slug: str, now: datetime) -> str:
    site = cfg["site_url"]
    url = f"{site}/blog/{slug}/"
    iso = now.strftime("%Y-%m-%d")
    human = f"{now.day} {MOIS_FR[now.month - 1]} {now.year}"
    cover = cfg["cover_images"][(topic["n"] - 1) % len(cfg["cover_images"])]
    cover_url = site + cover
    title = data["title"].strip()
    desc = data["meta_description"].strip()
    page_title = f"{title} | {cfg['site_name']}"
    out = template

    # --- <head> : titre, metas, canonical, OG, Twitter -------------------
    out = replace_block(out, r"<title>", "</title>", f"<title>{esc_text(page_title)}</title>")
    out = sub_attr(out, r'<meta name="description" content="([^"]*)"', esc_attr(desc), "meta description")
    out = sub_attr(out, r'<meta name="keywords" content="([^"]*)"', esc_attr(data["keywords"]), "meta keywords")
    out = sub_attr(out, r'<link rel="canonical" href="([^"]*)"', url, "canonical")
    out = sub_attr(out, r'<meta property="og:url" content="([^"]*)"', url, "og:url")
    out = sub_attr(out, r'<meta property="og:title" content="([^"]*)"', esc_attr(title), "og:title")
    out = sub_attr(out, r'<meta property="og:description" content="([^"]*)"', esc_attr(desc), "og:description")
    out = sub_attr(out, r'<meta property="og:image" content="([^"]*)"', cover_url, "og:image")
    out = sub_attr(out, r'<meta property="article:published_time" content="([^"]*)"', iso, "published_time")
    out = sub_attr(out, r'<meta property="article:modified_time" content="([^"]*)"', iso, "modified_time")
    out = sub_attr(out, r'<meta name="twitter:title" content="([^"]*)"', esc_attr(title), "twitter:title")
    out = sub_attr(out, r'<meta name="twitter:description" content="([^"]*)"', esc_attr(desc), "twitter:description")
    out = sub_attr(out, r'<meta name="twitter:image" content="([^"]*)"', cover_url, "twitter:image")

    # --- JSON-LD : Article, BreadcrumbList, FAQPage ----------------------
    blocks = list(re.finditer(r'<script type="application/ld\+json">\s*(.*?)\s*</script>', out, re.S))
    if len(blocks) != 3:
        raise ValueError(f"3 blocs JSON-LD attendus dans le gabarit, {len(blocks)} trouvés")

    for m in reversed(blocks):
        node = json.loads(m.group(1))
        ntype = node.get("@type")

        if ntype == "Article":
            node["mainEntityOfPage"]["@id"] = url
            node["headline"] = title
            node["description"] = desc
            node["image"] = [cover_url]
            node["datePublished"] = iso
            node["dateModified"] = iso
        elif ntype == "BreadcrumbList":
            node["itemListElement"][2]["name"] = title
            node["itemListElement"][2]["item"] = url
        elif ntype == "FAQPage":
            node["mainEntity"] = [
                {
                    "@type": "Question",
                    "name": q["question"].strip(),
                    "acceptedAnswer": {"@type": "Answer", "text": q["answer"].strip()},
                }
                for q in data["faq"]
            ]
        else:
            raise ValueError(f"type JSON-LD inattendu dans le gabarit : {ntype}")

        rendered = json.dumps(node, ensure_ascii=False, indent=2)
        rendered = "\n".join("  " + ln for ln in rendered.splitlines()).strip()
        out = out[: m.start(1)] + rendered + out[m.end(1):]

    # --- Fil d'ariane : 3e élément ---------------------------------------
    crumb = re.search(r'(<nav class="breadcrumb".*?</ol>)', out, re.S)
    if not crumb:
        raise ValueError("fil d'ariane introuvable dans le gabarit")
    items = re.findall(r"<li>.*?</li>", crumb.group(1), re.S)
    if len(items) != 3:
        raise ValueError(f"3 éléments de fil d'ariane attendus, {len(items)} trouvés")
    new_crumb = crumb.group(1).replace(items[2], f"<li>{esc_text(title)}</li>")
    out = out.replace(crumb.group(1), new_crumb, 1)

    # --- Titre, méta visible, couverture, chapô --------------------------
    out = replace_block(
        out, r'<h1 class="article-title">', "</h1>",
        f'<h1 class="article-title">{esc_text(title)}</h1>',
    )
    out = replace_block(
        out, r'<p class="article-meta">', "</p>",
        '<p class="article-meta">\n'
        f'          <time datetime="{iso}">{human}</time>\n'
        '          <span class="dot">•</span>\n'
        f'          <span>{esc_text(data["category_tag"])}</span>\n'
        '          <span class="dot">•</span>\n'
        f'          <span>{esc_text(cfg["author"])}</span>\n'
        '        </p>',
    )
    cover_alt = f"{title} — {cfg['site_name']}"
    out = replace_block(
        out, r'<div class="article-cover">', "</div>",
        '<div class="article-cover">\n'
        f'          <img src="{cover}" alt="{esc_attr(cover_alt)}" width="1200" height="800" loading="eager">\n'
        '        </div>',
    )
    out = replace_block(
        out, r'<p class="article-lead">', "</p>",
        f'<p class="article-lead">{esc_text(data["lead"].strip())}</p>',
    )

    # --- Corps (div équilibré) -------------------------------------------
    start = out.index('<div class="article-body">')
    end = find_balanced_div(out, start)
    body = "\n".join(
        ("          " + ln.strip()) if ln.strip() else ""
        for ln in data["body_html"].strip().splitlines()
    )
    out = out[:start] + '<div class="article-body">\n' + body + "\n        </div>" + out[end:]

    # --- FAQ : le micro-gabarit d'un item est relu depuis le modèle ------
    faq_start = out.index('<section class="faq"')
    faq_end = out.index("</section>", faq_start) + len("</section>")
    faq_block = out[faq_start:faq_end]
    item_tpl = re.search(r'<div class="faq-item">.*?</div>', faq_block, re.S)
    if not item_tpl:
        raise ValueError("aucun .faq-item dans le gabarit")

    items_html = []
    for q in data["faq"]:
        item = item_tpl.group(0)
        item = replace_block(item, r"<h3>", "</h3>", f"<h3>{esc_text(q['question'].strip())}</h3>")
        item = replace_block(item, r"<p>", "</p>", f"<p>{esc_text(q['answer'].strip())}</p>")
        items_html.append(item)

    head_end = faq_block.index('<div class="faq-item">')
    new_faq = faq_block[:head_end] + "\n\n          ".join(items_html) + "\n        </section>"
    out = out[:faq_start] + new_faq + out[faq_end:]

    # --- Marqueur d'idempotence ------------------------------------------
    marker = f'<!-- {cfg["site_slug"]}-topic: {topic["n"]} -->'
    out = out.replace("<head>", f"<head>\n  {marker}", 1)

    return out


def render_card(cfg: dict, data: dict, topic: dict, slug: str, now: datetime) -> str:
    cover = cfg["cover_images"][(topic["n"] - 1) % len(cfg["cover_images"])]
    iso = now.strftime("%Y-%m-%d")
    human = f"{now.day} {MOIS_FR[now.month - 1]} {now.year}"
    title = esc_text(data["title"].strip())
    return f"""      <article class="post-card">
        <a href="/blog/{slug}/" aria-label="Lire l'article : {esc_attr(data['title'].strip())}">
          <div class="post-card-media" style="background-image:url('{cover}');">
            <span class="post-card-tag">{esc_text(data['category_tag'])}</span>
          </div>
        </a>
        <div class="post-card-body">
          <p class="post-card-date"><time datetime="{iso}">{human}</time></p>
          <h2 class="post-card-title">
            <a href="/blog/{slug}/">{title}</a>
          </h2>
          <p class="post-card-excerpt">{esc_text(data['excerpt'].strip())}</p>
          <a class="post-card-link" href="/blog/{slug}/">Lire l'article →</a>
        </div>
      </article>
"""


# --------------------------------------------------------------------------
# Mise à jour des fichiers d'index
# --------------------------------------------------------------------------

def update_blog_index(cfg: dict, card: str, slug: str) -> str:
    path = REPO / cfg["blog_index"]
    content = path.read_text(encoding="utf-8")
    if f'href="/blog/{slug}/"' in content:
        log("carte déjà présente dans blog/index.html — inchangé")
        return content
    anchor = '<div class="post-grid">\n'
    idx = content.index(anchor) + len(anchor)
    return content[:idx] + "\n" + card + content[idx:]


def update_sitemap(cfg: dict, slug: str, iso: str) -> str:
    path = REPO / cfg["sitemap"]
    content = path.read_text(encoding="utf-8")
    url = f"{cfg['site_url']}/blog/{slug}/"
    if url in content:
        log("URL déjà présente dans sitemap.xml — inchangé")
        return content

    content = re.sub(
        rf"(<loc>{re.escape(cfg['site_url'])}/blog/</loc>\s*<lastmod>)[^<]*(</lastmod>)",
        rf"\g<1>{iso}\g<2>", content, count=1,
    )
    entry = (
        "  <url>\n"
        f"    <loc>{url}</loc>\n"
        f"    <lastmod>{iso}</lastmod>\n"
        "    <changefreq>monthly</changefreq>\n"
        "    <priority>0.8</priority>\n"
        "  </url>\n\n"
    )
    return content.replace("</urlset>", entry + "</urlset>", 1)


def update_rss(cfg: dict, data: dict, slug: str, now: datetime) -> str:
    path = REPO / cfg["rss"]
    content = path.read_text(encoding="utf-8")
    url = f"{cfg['site_url']}/blog/{slug}/"
    if url in content:
        log("item déjà présent dans rss.xml — inchangé")
        return content

    pub = format_datetime(now)
    content = re.sub(r"(<lastBuildDate>)[^<]*(</lastBuildDate>)",
                     rf"\g<1>{pub}\g<2>", content, count=1)
    item = f"""    <item>
      <title>{esc_text(data['title'].strip())}</title>
      <link>{url}</link>
      <guid isPermaLink="true">{url}</guid>
      <pubDate>{pub}</pubDate>
      <description>{esc_text(data['excerpt'].strip())}</description>
    </item>

"""
    anchor = "    <item>"
    idx = content.index(anchor) if anchor in content else content.index("  </channel>")
    return content[:idx] + item + content[idx:]


def update_llms(cfg: dict, data: dict, slug: str) -> str | None:
    path = REPO / "llms.txt"
    if not path.exists():
        return None
    content = path.read_text(encoding="utf-8")
    url = f"{cfg['site_url']}/blog/{slug}/"
    if url in content:
        log("lien déjà présent dans llms.txt — inchangé")
        return content
    anchor = "## Articles du blog\n\n"
    if anchor not in content:
        log("section « Articles du blog » absente de llms.txt — ignoré")
        return content
    idx = content.index(anchor) + len(anchor)
    line = f"- [{data['title'].strip()}]({url}) : {data['excerpt'].strip()}\n"
    return content[:idx] + line + content[idx:]


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Génère un article de blog SEO/GEO.")
    parser.add_argument("--dry-run", action="store_true",
                        help="génère et valide sans rien écrire sur le disque")
    parser.add_argument("--topic", type=int, default=None,
                        help="force un numéro de sujet au lieu du prochain non traité")
    parser.add_argument("--mock-response", metavar="FICHIER",
                        help="utilise un JSON local au lieu d'appeler OpenAI (tests)")
    args = parser.parse_args()

    cfg = load_config()
    log(f"site : {cfg['site_name']} — {cfg['site_url']}")
    if args.dry_run:
        log("MODE DRY-RUN — aucun fichier ne sera écrit")

    topics = parse_topics(cfg)
    done, slugs = scan_existing(cfg)

    topic = pick_topic(topics, done, args.topic)
    if topic is None:
        log("aucun sujet non traité — les 12 sujets de BLOG_WORKFLOW.md sont publiés.")
        log("Ajoutez de nouveaux sujets au tableau pour relancer la production.")
        return EXIT_NO_TOPIC
    log(f"sujet retenu : #{topic['n']} — {topic['subject']}")

    template_path = REPO / cfg["template_article"]
    if not template_path.exists():
        fail(f"gabarit introuvable : {cfg['template_article']}")
    template = template_path.read_text(encoding="utf-8")
    log(f"gabarit relu depuis {cfg['template_article']} ({len(template)} caractères)")

    existing_titles = []
    for article in sorted((REPO / "blog").glob("*/index.html")):
        m = re.search(r'<h1 class="article-title">(.*?)</h1>', article.read_text(encoding="utf-8"), re.S)
        if m:
            existing_titles.append(html_mod.unescape(strip_tags(m.group(1)).strip()))

    prompt = build_prompt(cfg, topic, existing_titles)

    if args.mock_response:
        mock = Path(args.mock_response)
        if not mock.exists():
            fail(f"fichier mock introuvable : {mock}")
        log(f"réponse simulée lue depuis {mock}")
        data = json.loads(mock.read_text(encoding="utf-8"))
    else:
        data = call_openai(cfg, prompt)

    validate(cfg, data)

    slug = slugify(data["title"])[:70].rstrip("-")
    if slug in slugs:
        log(f"le slug « {slug} » existe déjà — arrêt sans écriture pour ne rien écraser.")
        return EXIT_NO_TOPIC
    log(f"slug : {slug}")

    now = datetime.now(timezone.utc)
    iso = now.strftime("%Y-%m-%d")

    try:
        article_html = render_article(cfg, template, data, topic, slug, now)
        card = render_card(cfg, data, topic, slug, now)
        blog_index = update_blog_index(cfg, card, slug)
        sitemap = update_sitemap(cfg, slug, iso)
        rss = update_rss(cfg, data, slug, now)
        llms = update_llms(cfg, data, slug)
    except (ValueError, KeyError, IndexError) as exc:
        fail(f"rendu impossible ({type(exc).__name__}) : {exc}")

    # Contrôle final : le JSON-LD produit doit être valide
    for block in re.findall(r'<script type="application/ld\+json">\s*(.*?)\s*</script>',
                            article_html, re.S):
        try:
            json.loads(block)
        except json.JSONDecodeError as exc:
            fail(f"JSON-LD produit invalide : {exc}")
    log("JSON-LD produit : valide")

    if args.dry_run:
        print()
        print("=" * 72)
        print(f"TITRE       : {data['title']}")
        print(f"SLUG        : blog/{slug}/")
        print(f"DESCRIPTION : {data['meta_description']} ({len(data['meta_description'])} car.)")
        print(f"MOTS-CLÉS   : {data['keywords']}")
        print(f"CATÉGORIE   : {data['category_tag']}")
        print(f"MOTS CORPS  : {word_count(data['body_html'])}")
        print(f"TAILLE HTML : {len(article_html)} caractères")
        print("=" * 72)
        print("\nCHAPÔ :\n" + data["lead"])
        print("\nFAQ :")
        for i, q in enumerate(data["faq"], 1):
            print(f"  {i}. {q['question']}")
        print("\nEXTRAIT DU CORPS (200 premiers mots) :")
        print(" ".join(strip_tags(data["body_html"]).split()[:200]) + " […]")
        print("\n" + "=" * 72)
        log("dry-run terminé — aucun fichier écrit")
        return EXIT_OK

    (REPO / "blog" / slug).mkdir(parents=True, exist_ok=True)
    (REPO / "blog" / slug / "index.html").write_text(article_html, encoding="utf-8")
    (REPO / cfg["blog_index"]).write_text(blog_index, encoding="utf-8")
    (REPO / cfg["sitemap"]).write_text(sitemap, encoding="utf-8")
    (REPO / cfg["rss"]).write_text(rss, encoding="utf-8")
    if llms is not None:
        (REPO / "llms.txt").write_text(llms, encoding="utf-8")

    log(f"écrit  : blog/{slug}/index.html")
    log(f"mis à jour : {cfg['blog_index']}, {cfg['sitemap']}, {cfg['rss']}, llms.txt")
    log(f"terminé — sujet #{topic['n']} publié")
    return EXIT_OK


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(EXIT_ERROR)
