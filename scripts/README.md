# Automatisation du blog — La Casa Del Cookie

Publication automatique d'un article par semaine, sans intervention humaine.

| | |
|---|---|
| **Quand** | Tous les lundis à 09:00 UTC (11h en France l'été, 10h l'hiver) |
| **Quoi** | 1 article complet + carte sur `/blog/`, `sitemap.xml`, `rss.xml`, `llms.txt` |
| **Où** | Workflow `.github/workflows/blog-auto.yml` |
| **Sujets** | Tableau « Sujets d'articles suggérés » de `BLOG_WORKFLOW.md`, dans l'ordre — réserve regarnie automatiquement |
| **Modèle** | `gpt-4o`, température 0.7, 3 appels maximum par article (+ 2 pour les sujets) |
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
python3 scripts/generate-article.py --topics-only      # regarnit la réserve seule
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

## 7. La réserve de sujets se regarnit seule

Avant, quand tous les sujets de `BLOG_WORKFLOW.md` étaient publiés, le script
sortait en code `78` et le blog s'arrêtait. Il se réapprovisionne désormais.

**Déclenchement.** À chaque exécution, le script compte les sujets **non
traités**. S'il en reste moins de `TOPIC_RESERVE_MIN` (8), il demande à `gpt-4o`
un lot de `TOPIC_BATCH` (40) nouveaux sujets, en deux appels maximum
(`TOPIC_MAX_CALLS`). Huit sujets, c'est deux mois de publication hebdomadaire :
la marge absorbe plusieurs réapprovisionnements ratés d'affilée.

**Ce qui est envoyé au modèle** : `sector`, `location`, `geo_keywords` et `tone`
de `blog-config.json`, plus **la liste de tous les sujets déjà listés**, pour
qu'il ne les repropose pas. Consigne : des sujets concrets, actionnables,
ancrés localement, avec un angle SEO/conseil et un mot-clé visé.

**Déduplication sur le slug, jamais sur le titre.** Le slug est la clé
d'idempotence de tout le pipeline — nom du dossier dans `/blog/`, résolution du
sujet suivant, refus d'écraser un fichier. Deux titres différents qui produisent
le même slug sont un doublon effectif : le second ne serait jamais publiable.
`clean_line()` normalise au passage puces, numérotation, balisage markdown et
neutralise le `|` qui casserait la ligne du tableau.

**Écriture.** `append_topics_to_workflow()` relit le format du tableau sur place
plutôt que de le supposer, repère la dernière ligne de données et poursuit la
numérotation. Le slug n'est **pas** écrit dans le tableau : il est déduit du
titre par `slugify()`, exactement comme pour les sujets d'origine.

**Un seul point de vérité.** `topic_is_pending()` définit ce qu'est un « sujet
non traité », et sert à la fois à compter la réserve et à choisir le sujet à
rédiger. Deux définitions séparées auraient fini par diverger, et le
réapprovisionnement se serait déclenché sur un décompte ne correspondant pas à
ce que le script publie.

### Les sujets sont poussés avant la rédaction

Dans le workflow, le réapprovisionnement est une étape **séparée et antérieure**
à la rédaction :

1. **Identité git** — sans elle le commit des sujets échouerait.
2. **Réapprovisionnement** — `--topics-only`, ignoré si `dry_run` ou `rewrite`.
3. **Push des nouveaux sujets** — poussé seulement si `origin/<branche>..HEAD`
   n'est pas vide.
4. Rédaction de l'article, puis commit et push de l'article.

Si la rédaction échoue à l'étape 4, **le lot de sujets est déjà sur le remote** :
rien n'est perdu et il ne sera pas regénéré au prochain run. Un échec du
réapprovisionnement passe en `::warning::` et le job continue avec la réserve
existante — il ne bloque jamais la publication.

`--topics-only` et `--rewrite` sont incompatibles : le premier ne rédige aucun
article, le second en réécrit un. Le script refuse la combinaison.

---

## 8. Idempotence

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

## 9. Le gabarit

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

## 10. Coût estimé

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

## 11. Quand la réserve s'épuise

Elle ne s'épuise plus toute seule : voir §7, le script regarnit avant d'atteindre
le fond. Le code `78` ne survient donc plus que si le réapprovisionnement échoue
plusieurs fois de suite **et** que la réserve tombe à zéro — le job reste vert,
rien n'est publié ce jour-là.

Pour reprendre la main, deux options :

- forcer un lot : `python3 scripts/generate-article.py --topics-only` ;
- ou ajouter des lignes à la main au tableau « Sujets d'articles suggérés » de
  `BLOG_WORKFLOW.md`, en continuant la numérotation. Aucune modification du
  script n'est nécessaire.

---

## 12. Après une publication automatique

- Ouvrir l'article en navigation privée.
- Tester le JSON-LD : <https://search.google.com/test/rich-results>
- Soumettre l'URL dans la Google Search Console.
- **Relire l'article.** La génération est automatique, la responsabilité
  éditoriale ne l'est pas : les garde-fous bloquent les erreurs grossières,
  pas les approximations. `--rewrite <slug>` régénère un article décevant.
