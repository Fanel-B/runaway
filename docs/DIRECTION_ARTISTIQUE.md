# Direction artistique de Runaway

**Identité : un carnet d’escapades entre amis, coloré, vivant et soigné.**

## Références et ce que j’en retiens

J’ai consulté les trois références avec un navigateur sans interface (captures Chrome headless) : Safeer et Q’in Saba à travers leurs pages CSS Design Awards, et Terreno directement sur son site, en partie masqué par sa bannière de cookies. Je m’inspire de leurs principes, sans reprendre leur marque, leurs textes ni leurs images.

| Référence | Principe retenu | Application dans Runaway |
| --- | --- | --- |
| [Safeer](https://www.cssdesignawards.com/sites/safeer/50189/) | Immersion, grand paysage plein cadre, cartes photo inclinées qui chevauchent la section suivante | Accueil : paysage SVG en pleine largeur, cartes postales inclinées posées sur le bas du paysage |
| [Q’in Saba](https://www.cssdesignawards.com/sites/qin-saba-italy-travel/50541/) | Carnet éditorial, serif délicate, petites étiquettes espacées, légendes discrètes | Titres en Fraunces, étiquettes en capitales espacées, légende manuscrite sous les illustrations, couverture de carnet avec image « collée » |
| [Terreno Barrio Hotel](https://www.terrenohotel.com/en/) | Personnalité chaleureuse, grands aplats de couleur, objets de collage, journée racontée | Chapitres en aplats (soleil, rose, sauge), tampon « Exemple fictif », journées découpées du matin au soir |

## Palette

Les couleurs sont centralisées dans `frontend/src/styles/tokens.css`.

| Rôle | Jeton | Valeur | Usage |
| --- | --- | --- | --- |
| Fond principal | `--cream` | `#FFF6E8` | Page, fonds clairs |
| Papier | `--paper` | `#FFFBF4` | Cartes postales, champs, tableau |
| Encre | `--ink` | `#18392F` | Texte, pied de page, éléments verrouillés |
| Cobalt | `--cobalt` | `#3155E7` | Action principale (texte blanc, contraste ≈ 5,9:1), focus, partage |
| Corail | `--coral` | `#EF725B` | **Décor uniquement** (soleil, repères de parcours), jamais du texte |
| Corail encre | `--coral-ink` | `#B2432F` | Texte corail : titres en italique, annotations (≈ 5,3:1 sur crème) |
| Jaune soleil | `--sun` | `#F4CB54` | Plafond du budget, chapitre 1, ciel « grands espaces » |
| Rose pâle | `--rose` | `#EFCBDD` | Accueil, chapitre 2 |
| Vert sauge | `--sage` | `#C6D7BE` | Export, chapitre 3, ciel « ville » |
| Ciel | `--sky` | `#DCE3FB` | Ciel « bord de l’eau », journée 4 |

Sur les grandes surfaces colorées, le texte secondaire passe en `--ink-soft` (`#3E5A50`). Le gris ne descend donc jamais sous 4,5:1.

### Statuts ≠ décor

Les couleurs des journées (`--day-*`) sont décoratives. Les statuts ont leurs propres couleurs. Ils sont **toujours** accompagnés d’une icône et d’un libellé, avec une bordure qui change de forme selon le statut :

| Statut | Couleurs | Forme |
| --- | --- | --- |
| Dans le plafond | vert foncé `#17543A` / `#E1F0E5` | bordure pleine + coche |
| Au-dessus du plafond, erreur | rouge `#9A1B12` / `#FCE3E0` | bordure pleine + triangle |
| Impossible de conclure, inconnu | violet `#4A3F8F` / `#ECE9FB` | bordure **pointillée** + i |
| À revoir, non enregistré | brun `#6B4500` / `#FFF3D1` | bordure **pointillée** + triangle |

Le violet de l’« inconnu » n’existe nulle part dans le décor : un budget incomplet ne ressemble ni à une réussite ni à un échec.

## Typographie

| Rôle | Police | Secours |
| --- | --- | --- |
| Titres expressifs | Fraunces (variable, axes `opsz` et `SOFT`) | Iowan Old Style, Palatino, Georgia |
| Interface, formulaires, chiffres | Instrument Sans | Segoe UI, system-ui |
| Annotations de carnet | Caveat | Segoe Print, cursive |

Les polices sont chargées depuis Google Fonts avec `display=swap`. Sans réseau, l’interface reste lisible avec les polices de secours. Les montants utilisent des chiffres tabulaires.

## Espacements et formes

- Échelle de 4 px : `--s-1` (4) à `--s-9` (96). Marge latérale fluide `--gutter` de 16 à 48 px, contenu limité à 1240 px.
- Rayons : 6 px (champs), 14 px (encarts), 28 px (chapitres, dialogues). Boutons en pilule, 48 px de haut minimum, 44 px pour les petits.
- Une seule ombre « papier », réservée aux objets posés : cartes postales, tickets, scénarios.

## Composants et éléments de carnet

- **Cartes postales** : inclinaison propre à chaque carte, redressée au survol ; un clic préremplit le brief.
- **Chapitres** : grand numéro « 01 » en Fraunces fine et « Chapitre un » manuscrit.
- **Ligne de parcours** : trait pointillé vertical avec un nœud par activité. Le nœud est plein quand l’activité est verrouillée.
- **Moments de journée** : Matin, Midi, Après-midi, Soir, seulement si la donnée existe. Aucun horaire n’est inventé.
- **Tickets** : voyages récents avec un talon séparé par des pointillés.
- **Tampon** « Exemple fictif » sur la couverture et ruban « Exemple fictif » sous la couverture.
- **Papier ligné** avec marge corail pour le résumé des décisions.
- **Comparaison avant/après** : l’ancienne valeur est barrée, la nouvelle est mise en avant sur fond cobalt pâle.

## Illustrations

Aucune photo. Quatre scènes SVG originales (`Landscape.jsx`), une par ambiance : un peu de tout, grands espaces, bord de l’eau, ville. Elles sont faites de formes plates (aplats, pas de dégradés) et utilisent les jetons de couleur par classes CSS. Elles sont `aria-hidden` et légendées « illustration originale, pas une photo du lieu » : un visuel ne laisse jamais croire qu’un lieu a été vérifié. Il n’y a ni licence à suivre ni chargement qui puisse échouer.

## Logo

Un oiseau vu de loin, dessiné en deux arcs (`BirdMark` dans `Chrome.jsx`), comme ceux des paysages. Il est posé après « run*away* », légèrement surélevé : cobalt sur fond crème, jaune soleil dans le pied de page. Au survol du logo, l’oiseau bat deux fois des ailes. Le même tracé sert de favicon (`frontend/public/favicon.svg`).

## Ambiance animée

Inspirée du mouvement ambiant de Q’in Saba : une couche décorative fixe (`Ambience.jsx`) passe **sous** le papier (`z-index: -1`). On la voit dans les marges crème, jamais par-dessus le texte des encarts. Elle ne capte aucun clic et elle est masquée aux technologies d’assistance.

| Ambiance | Quand | Effet |
| --- | --- | --- |
| Vagues | style « Au bord de l’eau » | trois couches de vagues qui glissent en bas de l’écran à des vitesses différentes |
| Neige | départ en décembre, janvier ou février (sauf bord de l’eau) | flocons cobalt pâle et blancs qui tombent en oscillant |
| Feuilles | style « Grands espaces » hors hiver | feuilles corail, soleil et sauge qui tombent en tournoyant |
| Soleil | « Ville et culture », « Un peu de tout » hors hiver | soleil en haut à droite, rayons qui tournent lentement, éclats qui montent |

Les vagues et les oiseaux de l’illustration de couverture bougent aussi légèrement. Un bouton sur la couverture met l’ambiance en pause (WCAG 2.2.2), et ce choix est mémorisé dans le navigateur. Si le système demande moins de mouvement, les particules disparaissent et les vagues ou le soleil restent immobiles. L’ambiance n’apparaît pas à l’impression.

## Règles

1. La composition et la hiérarchie passent avant les effets. Les animations se limitent au survol, à l’ambiance du voyage (avec pause) et aux petits mouvements de la couverture. Elles sont coupées si le système demande moins de mouvement.
2. Les formulaires et les chiffres restent sur fond clair, avec un contraste d’au moins 4,5:1.
3. La couleur ne porte jamais seule une information.
4. Focus visible partout : anneau cobalt de 3 px, jaune soleil sur fond sombre ou cobalt.
5. Pas de cartes identiques en série : chaque écran a sa propre composition (postales, tickets, chapitres, encarts du carnet).
6. Les mentions d’honnêteté (simulé, non vérifié, fictif) sont visibles sans être alarmistes.
