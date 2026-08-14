# BLOG_WORKFLOW — La Casa Del Cookie

Procédure pour publier un nouvel article sur le blog. Site statique HTML/CSS hébergé sur GitHub Pages, domaine `lacasadelcookie.fr`.

---

## 1. Architecture

```
/assets/blog.css                       ← style du blog (charte identique au site)
/blog/index.html                       ← liste des articles
/blog/<slug>/index.html                ← un article = un dossier
/sitemap.xml                           ← à mettre à jour à chaque article
/rss.xml                               ← à mettre à jour à chaque article
/llms.txt                              ← à mettre à jour à chaque article
/robots.txt                            ← ne bouge pas
```

Un article = **un dossier** avec un `index.html` dedans. L'URL est donc toujours propre et se termine par `/` :
`https://www.lacasadelcookie.fr/blog/mon-sujet/`

---

## 2. Créer un nouvel article — checklist

### a. Le dossier

1. Copier `/blog/cookies-artisanaux-soumoulou-pau-tarbes/index.html` dans un nouveau dossier `/blog/<nouveau-slug>/index.html`.
2. **Slug** : minuscules, mots séparés par des tirets, sans accent, 3 à 6 mots, avec au moins un mot-clé métier et un mot-clé local. Exemple : `cookie-anniversaire-pau-livraison`.

### b. Le `<head>` — à modifier systématiquement

| Élément | Règle |
|---|---|
| `<title>` | 50–60 caractères, contient le mot-clé principal + « La Casa Del Cookie » |
| `<meta name="description">` | **moins de 155 caractères**, une phrase, avec le lieu |
| `<link rel="canonical">` | URL complète en **`https://www.`**, avec le `/` final — voir §6 |
| `og:url`, `og:title`, `og:description`, `og:image` | alignés sur le contenu |
| `twitter:title`, `twitter:description`, `twitter:image` | idem |
| `article:published_time` / `article:modified_time` | format `AAAA-MM-JJ` |
| JSON-LD `Article` | `headline`, `description`, `image`, `datePublished`, `dateModified`, URL dans `@id` |
| JSON-LD `BreadcrumbList` | position 3 = titre + URL du nouvel article |
| JSON-LD `FAQPage` | les 5 questions/réponses, **strictement identiques** au HTML visible de la section FAQ |

> ⚠️ Le JSON-LD FAQ doit refléter mot pour mot les questions/réponses affichées à l'écran. Un décalage entre les deux peut être sanctionné par Google.

### c. Le contenu

- **1200 à 1500 mots.**
- Un seul `<h1>` (le titre de l'article).
- Structure en `<h2>` / `<h3>`, avec au moins 3 `<h2>`.
- **Ancrage local obligatoire** : Soumoulou, Pau, Tarbes, et communes du secteur (Nay, Morlaàs, Ousse, Pontacq, Lourdes, Ibos, Bordes, Assat…).
- 2 à 4 liens internes vers `/index.html`, `/produits.html`, `/histoire.html` ou un autre article.
- 1 bloc FAQ de **5 questions** en fin d'article.
- 1 bloc CTA final (WhatsApp + Click & Collect ou Voir les cookies).

### d. Règles éditoriales — interdictions

Ne **jamais** écrire dans un article :

- ❌ un **prix** qui ne figure pas déjà tel quel sur le site ;
- ❌ un **chiffre précis** non vérifié (nombre de clients, de cookies vendus, de commerces partenaires, années d'expérience) ;
- ❌ un **nom de client** ou un témoignage non validé ;
- ❌ une **date de fondation** ou un historique daté non confirmé ;
- ❌ une **règle d'hygiène / réglementation** citée comme faisant autorité (normes, agréments, obligations légales) ;
- ❌ une **adresse de commerce partenaire** — la liste évolue et n'est publiée que sur les réseaux sociaux.

En cas de doute sur une information : la formuler de façon ouverte (« selon votre zone », « nous consulter ») plutôt que de trancher.

### e. Les faits réutilisables sans risque

Ces éléments sont déjà publiés sur le site et peuvent être repris :

- Atelier / laboratoire situé à **Soumoulou (64420)**.
- **Délai minimum de 48h** à l'avance pour toute commande.
- Retrait au laboratoire **sur rendez-vous**, aux horaires convenus ensemble.
- **Livraison possible selon la zone**, à confirmer au cas par cas.
- **Commerces partenaires** autour de Tarbes, liste communiquée sur les réseaux sociaux.
- Fabrication **100 % maison, à la main, sur commande**.
- Fondatrice : **Fanny**.
- Contact : **WhatsApp +33 7 82 16 31 79** et **lacasadelcookie@outlook.fr**.
- Click & Collect via Calendly.
- Cookies nommés sur le site : Cookie Torrid, Cookie Signature, La Casa x Dubaï, Pizza Cookie, carte cadeau.

---

## 3. Après création de l'article — les 4 fichiers à mettre à jour

1. **`/blog/index.html`** → ajouter une `<article class="post-card">` en haut de `.post-grid` (le plus récent en premier).
2. **`/sitemap.xml`** → ajouter un bloc `<url>` avec la nouvelle URL et la `<lastmod>` du jour. Mettre aussi à jour la `<lastmod>` de `/blog/`.
3. **`/rss.xml`** → ajouter un `<item>` en haut de la liste, et mettre à jour `<lastBuildDate>`. Format de date RSS : `Fri, 14 Aug 2026 09:00:00 +0200`.
4. **`/llms.txt`** → ajouter une ligne dans la section « Articles du blog ».

---

## 4. Publication

```bash
git add .
git commit -m "Blog: nouvel article <slug>"
git push origin main
```

GitHub Pages redéploie automatiquement. Compter quelques minutes avant que l'URL soit accessible.

### Après mise en ligne

- Vérifier l'URL en navigation privée.
- Tester le JSON-LD sur https://search.google.com/test/rich-results
- Soumettre l'URL dans la Google Search Console (Inspection d'URL → Demander l'indexation).
- Relayer l'article sur Instagram / Facebook.

---

## 5. NAP — cohérence à respecter partout

Le NAP (Name, Address, Phone) doit être **rigoureusement identique** sur le site, dans `llms.txt`, sur Google Business Profile et sur les réseaux sociaux. Toute variation dilue le signal local.

```
La Casa Del Cookie
9 rue des Mattets, 64420 Soumoulou, France
+33 7 82 16 31 79
lacasadelcookie@outlook.fr
```

---

## 6. Domaine canonique : **www obligatoire**

Le fichier `CNAME` du dépôt contient `www.lacasadelcookie.fr`. Le domaine canonique du site est donc :

```
https://www.lacasadelcookie.fr
```

### Règle

Toute URL absolue écrite dans le dépôt doit porter le `www.`. Sans exception :

- `<link rel="canonical">`
- `og:url`, `og:image`
- `twitter:image`
- `<link rel="alternate">` (RSS)
- tous les JSON-LD : `url`, `@id`, `image`, `logo`, `mainEntityOfPage`, `item` des `BreadcrumbList`
- `sitemap.xml` (`<loc>`), `rss.xml` (`<link>`, `<guid>`, `atom:link`)
- `llms.txt`
- la ligne `Sitemap:` de `robots.txt`

Les liens **internes** dans le HTML restent relatifs à la racine (`/produits.html`, `/blog/`, `/images/…`) : ils n'ont pas besoin du domaine et suivent automatiquement l'hôte servi.

### Vérification avant chaque push

```bash
# doit renvoyer 0
grep -rn "https://lacasadelcookie\.fr" --include="*.html" --include="*.xml" --include="*.txt" . | grep -v "^\./\.git" | wc -l
```

### Redirection non-www → www

**Elle ne peut pas se faire par un fichier statique.** GitHub Pages ne lit ni `.htaccess`, ni `_redirects`, ni `vercel.json` ; et une redirection en JavaScript ou via `<meta http-equiv="refresh">` serait mauvaise pour le SEO (pas de 301 côté serveur) et ne peut de toute façon pas s'appliquer, puisque les deux domaines servent exactement le même dépôt.

La redirection est assurée **par GitHub Pages lui-même**, à condition que le DNS soit correctement configuré. Configuration attendue chez le registrar :

| Type | Nom | Valeur |
|---|---|---|
| `CNAME` | `www` | `cazacomm.github.io` |
| `A` | `@` | `185.199.108.153` |
| `A` | `@` | `185.199.109.153` |
| `A` | `@` | `185.199.110.153` |
| `A` | `@` | `185.199.111.153` |

Avec cette configuration et `CNAME` = `www.lacasadelcookie.fr` dans le dépôt, GitHub Pages émet automatiquement un **301** de `lacasadelcookie.fr` vers `www.lacasadelcookie.fr`.

Côté dépôt : ne jamais modifier ni supprimer le fichier `CNAME`. Dans les réglages GitHub (Settings → Pages), le champ *Custom domain* doit afficher `www.lacasadelcookie.fr` et **Enforce HTTPS** doit être coché.

### Contrôle après déploiement

```bash
# doit répondre 301 vers https://www.lacasadelcookie.fr/
curl -sI https://lacasadelcookie.fr/ | head -5
```

Si la réponse n'est pas un 301, le problème est dans les enregistrements DNS de l'apex, pas dans le dépôt.

Dans la Google Search Console, déclarer la propriété **`https://www.lacasadelcookie.fr/`** et y soumettre le sitemap.

---

## 7. Douze sujets d'articles suggérés

Tous ancrés local + métier, tous rédigeables sans inventer de données.

| # | Sujet | Angle / mot-clé visé |
|---|---|---|
| 1 | Cookie moelleux ou cookie croustillant : comment choisir ? | pédagogie produit — « cookie moelleux » |
| 2 | Offrir des cookies pour un anniversaire à Pau : le guide d'organisation | événementiel — « cookies anniversaire Pau » |
| 3 | Cookies pour un pot de départ au bureau : quantités et organisation | B2B léger — « cookies entreprise Tarbes » |
| 4 | Le Click & Collect à Soumoulou : comment ça marche, étape par étape | conversion — « click and collect Soumoulou » |
| 5 | Que faire d'un cookie qui a un peu durci ? 4 astuces de conservation | service — « conserver cookie maison » |
| 6 | Cookie au chocolat, à la pistache ou à la noisette : quel profil pour qui ? | choix produit — « cookie pistache » |
| 7 | Un goûter d'anniversaire d'enfant réussi entre Pau et Tarbes | famille — « goûter anniversaire enfant Pau » |
| 8 | Pourquoi un cookie artisanal se commande 48h à l'avance | transparence — « cookie sur commande » |
| 9 | Les coulisses d'une journée à l'atelier de Soumoulou | storytelling — « atelier cookie Béarn » |
| 10 | Idées de cadeaux gourmands à offrir dans le Béarn | cadeau — « cadeau gourmand Pau » |
| 11 | Le format XXL à partager : quand choisir une pizza cookie | produit — « cookie géant à partager » |
| 12 | Cookies pour un mariage ou une réception dans les Pyrénées-Atlantiques | événementiel — « cookies mariage 64 » |

**Rythme conseillé** : 1 à 2 articles par mois. Mieux vaut un article solide et local par mois que quatre articles génériques.
