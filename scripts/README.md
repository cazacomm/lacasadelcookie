# Automatisation du blog

Publication automatique d'un article par semaine, sans intervention humaine.

| | |
|---|---|
| **Quand** | Tous les lundis à 09:00 UTC (11h en France l'été, 10h l'hiver) |
| **Quoi** | 1 article complet + carte sur `/blog/`, `sitemap.xml`, `rss.xml`, `llms.txt` |
| **Où** | Workflow `.github/workflows/blog-auto.yml` |
| **Sujets** | Tableau « Douze sujets d'articles suggérés » de `BLOG_WORKFLOW.md`, dans l'ordre |
| **Modèle** | `gpt-4o-mini`, température 0.7 |

---

## 1. Ajouter la clé API (à faire une seule fois)

1. Créer une clé sur <https://platform.openai.com/api-keys>.
2. Sur GitHub : **Settings → Secrets and variables → Actions → New repository secret**.
3. Nom : `OPENAI_API_KEY` — Valeur : la clé (`sk-…`).

Sans ce secret, le workflow échoue proprement avec le message
`variable d'environnement OPENAI_API_KEY absente`, et ne publie rien.

---

## 2. Lancer manuellement

**Depuis GitHub** : onglet *Actions* → *Blog auto* → *Run workflow*. Deux options :

- **dry_run** : génère et valide sans rien écrire ni publier — à utiliser pour tester.
- **topic** : force un numéro de sujet (1 à 12) au lieu du prochain non traité.

**En local** :

```bash
pip install openai
export OPENAI_API_KEY="sk-…"

python3 scripts/generate-article.py --dry-run     # test, n'écrit rien
python3 scripts/generate-article.py               # écrit les fichiers
python3 scripts/generate-article.py --topic 4     # force le sujet n°4
```

Tester la mécanique de rendu **sans consommer d'API** :

```bash
python3 scripts/generate-article.py --dry-run --mock-response fixture.json
```

`fixture.json` doit contenir les clés `title`, `meta_description`, `keywords`,
`category_tag`, `excerpt`, `lead`, `body_html`, `faq`.

---

## 3. Codes de sortie

| Code | Signification | Effet sur le workflow |
|---|---|---|
| `0` | Article généré | commit + push |
| `78` | Aucun nouveau sujet, ou slug déjà existant | job vert, aucun commit |
| `1` | Erreur (API, validation, gabarit illisible) | job rouge, **aucun fichier écrit** |

---

## 4. Comment le script reste sûr

- **Le gabarit HTML n'est pas dupliqué dans le script.** Il est relu à chaque
  exécution depuis `blog/cookies-artisanaux-soumoulou-pau-tarbes/index.html`
  (déclaré dans `blog-config.json`). Si le design de l'article évolue, les
  articles suivants en héritent automatiquement.
- **Idempotence.** Chaque article généré porte un marqueur
  `<!-- lacasadelcookie-topic: N -->` dans son `<head>`. Un sujet déjà marqué
  n'est jamais retraité. Si le slug calculé existe déjà, le script s'arrête
  en code 78 sans rien écraser.
- **Rien n'est écrit avant validation complète.** Tous les fichiers sont
  préparés en mémoire ; la moindre erreur interrompt avant la première écriture.
- **Garde-fous éditoriaux** repris de `BLOG_WORKFLOW.md` : longueur minimale
  (950 mots), nombre de `<h2>`, exactement 5 questions de FAQ, meta description
  sous 154 caractères, rejet des balises interdites (`h1`, `script`, `iframe`,
  `img`) et de tout **prix chiffré** dans le corps.
- **JSON-LD FAQ ≡ FAQ visible**, par construction : les deux sont produits
  depuis la même source.
- Le JSON-LD final est reparsé avant écriture ; s'il est invalide, rien n'est écrit.

---

## 5. Coût estimé

Tarifs OpenAI `gpt-4o-mini` au moment de la mise en place : **0,15 $ / M tokens
en entrée**, **0,60 $ / M tokens en sortie**.

Une exécution consomme environ 900 tokens en entrée et 2 500 en sortie :

```
entrée  :   900 × 0,15 $ / 1 000 000 ≈ 0,00014 $
sortie  : 2 500 × 0,60 $ / 1 000 000 ≈ 0,00150 $
total   ≈ 0,0017 $ par article, soit moins de 0,2 centime
```

À raison d'un article par semaine : **environ 0,09 $ par an**, soit moins de
10 centimes. Le coût réel est négligeable ; vérifier néanmoins les tarifs en
vigueur sur <https://openai.com/api/pricing/>, ils évoluent.

Les minutes GitHub Actions sont gratuites sur un dépôt public.

---

## 6. Quand les 12 sujets seront épuisés

Le workflow sortira en code 78 chaque lundi, sans rien publier ni échouer.
Pour relancer la production, ajouter des lignes au tableau
« Douze sujets d'articles suggérés » de `BLOG_WORKFLOW.md` en continuant la
numérotation (13, 14, …). Aucune modification du script n'est nécessaire.

---

## 7. Vérifications après une publication automatique

- Ouvrir l'article en navigation privée.
- Tester le JSON-LD : <https://search.google.com/test/rich-results>
- Soumettre l'URL dans la Google Search Console.
- **Relire l'article.** La génération est automatique, la responsabilité
  éditoriale ne l'est pas : les garde-fous bloquent les erreurs grossières,
  pas les approximations.
