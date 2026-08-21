# Automatisation du blog — La Casa Del Cookie

Publication automatique d'un article par semaine, sans intervention humaine.

| | |
|---|---|
| **Quand** | Tous les lundis à 09:00 UTC (11h en France l'été, 10h l'hiver) |
| **Quoi** | 1 article complet + carte sur `/blog/`, `sitemap.xml`, `rss.xml`, `llms.txt` |
| **Où** | Workflow `.github/workflows/blog-auto.yml` |
| **Sujets** | Tableau « Douze sujets d'articles suggérés » de `BLOG_WORKFLOW.md`, dans l'ordre |
| **Modèle** | `gpt-4o`, température 0.7, 3 appels maximum par article |
| **Volume** | 1200 à 1500 mots de corps, FAQ exclue |

---

## 1. Le principe : le modèle écrit, le script fabrique

Le modèle ne produit **plus une ligne de HTML**. Il rend un objet JSON éditorial
— titre, chapô, sections `h2`/`h3`, paragraphes, listes, FAQ — et le script
assemble la page à partir du gabarit.

C'est ce qui débloque le volume. Dans la version précédente, le modèle
régénérait toute la page : les deux tiers de ses tokens de sortie partaient en
balisage, et le corps rédigé plafonnait autour de 850 mots quelle que soit la
consigne. Aujourd'hui les tokens vont au texte, et la cible de 1200-1500 mots
est tenable.

Fabriqués par le script, donc jamais faux : `<title>`, meta description,
canonical, Open Graph, Twitter Card, les trois blocs JSON-LD, le fil d'Ariane,
le marqueur d'idempotence, le header, le footer, le bloc CTA et le lien de
retour au blog.

---

## 2. Ajouter la clé API (à faire une seule fois)

1. Créer une clé sur <https://platform.openai.com/api-keys>.
2. Sur GitHub : **Settings → Secrets and variables → Actions → New repository secret**.
3. Nom : `OPENAI_API_KEY` — Valeur : la clé (`sk-…`).

Sans ce secret, le workflow échoue proprement avec le message
`Variable d'environnement OPENAI_API_KEY absente`, et ne publie rien.

---

## 3. Lancer manuellement

**Depuis GitHub** : onglet *Actions* → *Blog auto — La Casa Del Cookie* →
*Run workflow*. Deux champs :

- **dry_run** : génère et valide sans rien écrire ni pousser — pour tester.
- **rewrite** : slug d'un article existant à régénérer. Laisser vide pour
  publier le sujet suivant.

**En local** :

```bash
pip install openai
export OPENAI_API_KEY="sk-…"

python3 scripts/generate-article.py --dry-run          # test, n'écrit rien
python3 scripts/generate-article.py --dry-run --mock   # test sans appel API
python3 scripts/generate-article.py                    # écrit les fichiers
python3 scripts/generate-article.py --rewrite mon-slug # régénère un article
```

`--mock` fabrique un contenu de démonstration au format attendu : c'est le moyen
de vérifier l'assemblage HTML après une modification du gabarit, sans consommer
un seul token.

---

## 4. Codes de sortie

| Code | Signification | Effet sur le workflow |
|---|---|---|
| `0` | Article généré | commit + push |
| `78` | Aucun sujet restant, ou fichier déjà présent | job vert, aucun commit |
| `1` | Erreur (API, validation, gabarit illisible) | job rouge, **aucun fichier écrit** |

---

## 5. Le rattrapage

Le modèle rend souvent 600 à 900 mots en première passe. Plutôt que d'échouer,
le script **relance** en lui renvoyant sa propre copie accompagnée d'une
consigne de reprise ciblée.

- Plafond : **3 appels** par article, rattrapages compris.
- La reprise ne porte pas que sur le volume : maillage interne manquant, nombre
  de questions de FAQ, longueur du `title`, tout ce que le modèle peut corriger
  lui-même passe dans le message de reprise.
- Chaque reprise repart de la **meilleure** copie obtenue jusque-là, pas de la
  dernière : le modèle développe un texte déjà long au lieu de repartir d'un
  plus court.
- La copie retenue est celle qui a le moins d'erreurs, puis celle qui approche
  le mieux la cible.

Si après trois appels le contenu reste invalide, le script sort en code `1` et
**n'écrit rien**.

---

## 6. Garde-fous

**Sur le contenu** (dépend du modèle, donc contrôlé) : volume 900-1900 mots,
`title` de 40 à 70 caractères, meta description sous 155 caractères, exactement
5 questions de FAQ, au moins deux liens internes vers les cibles configurées
plus un lien vers `/blog/`, aucun prix chiffré, types de blocs limités à
`p` / `h3` / `ul` / `ol` / `strong`.

**Sur l'assemblage** (dépend de notre code, doit toujours passer) : DOCTYPE,
`</html>`, marqueur d'idempotence, un seul `<h1>`, canonical exact, 3 blocs
JSON-LD tous reparsés, nombre de `.faq-item`, présence de `</main>`,
`</article>`, `.article-body`, du lien vers `blog.css`, et équilibre des
balises `<section>`.

**Contre l'injection** : le modèle ne fournit que du texte. Tout passe par un
échappement HTML, et le seul balisage inline accepté est `**gras**` et
`[libellé](/chemin)`. Les liens sont restreints aux chemins commençant par `/` :
un lien externe est structurellement impossible.

**Interdictions éditoriales**, injectées dans le prompt depuis `blog-config.json`
et `BLOG_WORKFLOW.md` : aucun prix, aucun chiffre de fréquentation, aucun nom de
client, aucune date de fondation, aucune norme ou réglementation, aucun avis,
aucun horaire ni adresse en dehors de la liste `facts`.

---

## 7. Idempotence

Chaque article généré porte un marqueur `<!-- lacasadelcookie-topic: N -->` dans
son `<body>`. Un sujet déjà marqué n'est jamais retraité. Si le dossier du slug
existe déjà, le script s'arrête en code `78` sans rien écraser — seul
`--rewrite` autorise l'écrasement, explicitement.

Les mises à jour de `blog/index.html`, `sitemap.xml`, `rss.xml` et `llms.txt`
sont idempotentes par URL : rejouer le workflow ne crée jamais de doublon.

> L'article fondateur `cookies-artisanaux-soumoulou-pau-tarbes` a été écrit à la
> main et ne porte pas de marqueur. Il sert de **gabarit** (clé
> `reference_article_slug`) et n'est jamais modifié par le pipeline.

---

## 8. Le gabarit

`split_template()` relit l'article de référence à chaque exécution et en extrait
les morceaux réutilisables. Il est **adapté aux conventions HTML de ce site**,
qui diffèrent de celles d'autres dépôts CAZA COMM :

- pas de commentaire `<!-- Article -->` avant les JSON-LD ;
- les trois blocs JSON-LD sont **au milieu** du `<head>`, suivis des favicons :
  le parseur isole un `head_top` et un `head_tail` pour ne rien perdre ;
- les balises meta ne sont **pas** auto-fermantes (`>` et non `/>`) ;
- le fil d'Ariane est un `<nav class="breadcrumb"><ol><li>…`, placé dans
  `<main>` avant `<article class="article-wrap">` ;
- la FAQ utilise `.faq-item > h3 + p` (et non `.faq-q` / `.faq-a`) ;
- l'article se termine par un lien « ← Retour au blog ».

**Le gabarit HTML n'est jamais modifié : c'est le parseur qui s'y adapte.** Si
le design de l'article de référence évolue, les articles suivants en héritent —
il suffit de relancer un `--dry-run --mock` pour vérifier que le découpage tient
toujours.

---

## 9. Coût estimé

Tarifs OpenAI `gpt-4o` au moment de la mise en place : **2,50 $ / M tokens en
entrée**, **10,00 $ / M tokens en sortie**.

Un article consomme environ 2 000 tokens en entrée et 4 500 en sortie par appel.
Avec le rattrapage, comptez 2 appels en moyenne, 3 au pire :

```
2 appels : (4 000 × 2,50 + 9 000 × 10,00) / 1 000 000 ≈ 0,10 $
3 appels : (6 000 × 2,50 + 13 500 × 10,00) / 1 000 000 ≈ 0,15 $
```

Soit **environ 0,10 $ par article**, et **5 à 8 $ par an** au rythme
hebdomadaire. Vérifier les tarifs en vigueur sur
<https://openai.com/api/pricing/>, ils évoluent.

Les minutes GitHub Actions sont gratuites sur un dépôt public.

---

## 10. Quand les 12 sujets seront épuisés

Le workflow sortira en code `78` chaque lundi, sans rien publier ni échouer.
Pour relancer la production, ajouter des lignes au tableau
« Douze sujets d'articles suggérés » de `BLOG_WORKFLOW.md` en continuant la
numérotation (13, 14, …). Aucune modification du script n'est nécessaire.

---

## 11. Après une publication automatique

- Ouvrir l'article en navigation privée.
- Tester le JSON-LD : <https://search.google.com/test/rich-results>
- Soumettre l'URL dans la Google Search Console.
- **Relire l'article.** La génération est automatique, la responsabilité
  éditoriale ne l'est pas : les garde-fous bloquent les erreurs grossières,
  pas les approximations. `--rewrite <slug>` régénère un article décevant.
