# Direction artistique de Runaway

**Identité : un carnet d’escapades entre amis, coloré, vivant et soigné.**

## Références et ce que j’en retiens

J’ai consulté les trois références avec un navigateur sans interface (captures Chrome headless) : Safeer et Q’in Saba à travers leurs pages CSS Design Awards, et Terreno directement sur son site, en partie masqué par sa bannière de cookies. Je m’inspire de leurs principes, sans reprendre leur marque, leurs textes ni leurs images.

| Référence                                                                       | Principe retenu                                                                                  | Application dans Runaway                                                                                                                    |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [Safeer](https://www.cssdesignawards.com/sites/safeer/50189/)                   | Immersion, grand paysage plein cadre, cartes photo inclinées qui chevauchent la section suivante | Accueil : paysage SVG en pleine largeur, cartes postales inclinées posées sur le bas du paysage                                             |
| [Q’in Saba](https://www.cssdesignawards.com/sites/qin-saba-italy-travel/50541/) | Carnet éditorial, serif délicate, petites étiquettes espacées, légendes discrètes                | Titres en Fraunces, étiquettes en capitales espacées, légende manuscrite sous les illustrations, couverture de carnet avec image « collée » |
| [Terreno Barrio Hotel](https://www.terrenohotel.com/en/)                        | Personnalité chaleureuse, grands aplats de couleur, objets de collage, journée racontée          | Chapitres en aplats (soleil, rose, sauge), tampon « Exemple fictif », journées découpées du matin au soir                                   |

## Palette

Les couleurs sont centralisées dans `frontend/src/styles/tokens.css`.

| Rôle           | Jeton         | Valeur    | Usage                                                                                   |
| -------------- | ------------- | --------- | --------------------------------------------------------------------------------------- |
| Fond principal | `--cream`     | `#FFF6E8` | Page, fonds clairs                                                                      |
| Papier         | `--paper`     | `#FFFBF4` | Cartes postales, champs, tableau                                                        |
| Encre          | `--ink`       | `#18392F` | Texte, pied de page, éléments verrouillés                                               |
| Cobalt         | `--cobalt`    | `#3155E7` | Action principale (texte blanc, contraste ≈ 5,9:1), focus, partage                      |
| Corail         | `--coral`     | `#EF725B` | **Décor uniquement** (soleil, repères de parcours), jamais du texte                     |
| Corail encre   | `--coral-ink` | `#B2432F` | Texte corail : titres en italique, annotations (≈ 5,3:1 sur crème)                      |
| Jaune soleil   | `--sun`       | `#F4CB54` | Petits accents seulement : pastilles, soleils des illustrations, logo du pied de page   |
| Jaune doux     | `--sun-soft`  | `#F8E2A6` | Grandes surfaces jaunes : chapitre 1, plafond du budget, ciel « grands espaces », sable |
| Rose pâle      | `--rose`      | `#EFCBDD` | Accueil, chapitre 2                                                                     |
| Vert sauge     | `--sage`      | `#C6D7BE` | Export, chapitre 3, ciel « ville »                                                      |
| Ciel           | `--sky`       | `#DCE3FB` | Ciel « bord de l’eau », journée 4                                                       |

Sur les grandes surfaces colorées, le texte secondaire passe en `--ink-soft` (`#3E5A50`). Le gris ne descend donc jamais sous 4,5:1.

### Statuts ≠ décor

Les couleurs des journées (`--day-*`) sont décoratives. Les statuts ont leurs propres couleurs. Ils sont **toujours** accompagnés d’une icône et d’un libellé, avec une bordure qui change de forme selon le statut :

| Statut                          | Couleurs                         | Forme                             |
| ------------------------------- | -------------------------------- | --------------------------------- |
| Dans le plafond                 | vert foncé `#17543A` / `#E1F0E5` | bordure pleine + coche            |
| Au-dessus du plafond, erreur    | rouge `#9A1B12` / `#FCE3E0`      | bordure pleine + triangle         |
| Impossible de conclure, inconnu | violet `#4A3F8F` / `#ECE9FB`     | bordure **pointillée** + i        |
| À revoir, non enregistré        | brun `#6B4500` / `#FFF3D1`       | bordure **pointillée** + triangle |

Le violet de l’« inconnu » n’existe nulle part dans le décor : un budget incomplet ne ressemble ni à une réussite ni à un échec.

## Typographie

| Rôle                             | Police                                     | Secours                            |
| -------------------------------- | ------------------------------------------ | ---------------------------------- |
| Titres expressifs                | Fraunces (variable, axes `opsz` et `SOFT`) | Iowan Old Style, Palatino, Georgia |
| Interface, formulaires, chiffres | Instrument Sans                            | Segoe UI, system-ui                |
| Annotations de carnet            | Caveat                                     | Segoe Print, cursive               |

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

Inspirée du mouvement ambiant de Q’in Saba : une couche décorative fixe (`Ambience.jsx`) couvre presque toute la page, **par-dessus** le contenu, comme un voile transparent. Elle est fusionnée en `mix-blend-mode: multiply`, comme de l’encre sur du papier : elle teinte le fond sans jamais éclaircir le texte, qui reste lisible. Elle ne capte aucun clic (`pointer-events: none`), passe sous les toasts et les dialogues, et elle est masquée aux technologies d’assistance.

| Ambiance | Quand                                                       | Effet                                                                                                                                       |
| -------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Vagues   | style « Au bord de l’eau »                                  | trois couches de vagues transparentes sur les trois quarts bas de l’écran, qui glissent et montent comme une houle                          |
| Neige    | départ en décembre, janvier ou février (sauf bord de l’eau) | voile froid du haut vers le bas, flocons cobalt pâle qui tombent en oscillant sur toute la page                                             |
| Feuilles | style « Grands espaces » hors hiver                         | voile chaud, feuilles corail, soleil et sauge qui tombent en tournoyant sur toute la page                                                   |
| Soleil   | « Ville et culture », « Un peu de tout » hors hiver         | halo chaud très léger sur toute la page, grand soleil pâle en haut à droite dont les rayons tournent lentement, quelques éclats qui montent |

Les vagues et les oiseaux de l’illustration de couverture bougent aussi légèrement. Un bouton sur la couverture met l’ambiance en pause (WCAG 2.2.2), et ce choix est mémorisé dans le navigateur. Si le système demande moins de mouvement, les particules disparaissent et les vagues ou le soleil restent immobiles. L’ambiance n’apparaît pas à l’impression.

## Règles

1. La composition et la hiérarchie passent avant les effets. Les animations se limitent au survol, à l’ambiance du voyage (avec pause) et aux petits mouvements de la couverture. Elles sont coupées si le système demande moins de mouvement.
2. Les formulaires et les chiffres restent sur fond clair, avec un contraste d’au moins 4,5:1.
3. La couleur ne porte jamais seule une information.
4. Focus visible partout : anneau cobalt de 3 px, jaune soleil sur fond sombre ou cobalt.
5. Pas de cartes identiques en série : chaque écran a sa propre composition (postales, tickets, chapitres, encarts du carnet).
6. Les mentions d’honnêteté (simulé, non vérifié, fictif) sont visibles sans être alarmistes.

## Accessibilité

Mesures faites le 11 novembre 2026 dans Chrome (headless, piloté par un script local hors dépôt), sur l’application réelle. Le seuil visé est le WCAG 2.1 AA : 4,5:1 pour le texte courant, 3:1 pour le grand texte (24 px et plus, ou 18,66 px et plus en gras).

### Contrastes

2 175 textes mesurés sur 21 états de l’application (accueil, formulaire et ses erreurs, programme, budget, carnet, dialogues, confidentialité, page d’erreur, vue lecteur). Pour chaque texte : couleur calculée, fond effectif, opacités composées. axe-core a tourné sur les mêmes états : **0 violation**. Il classe certains textes en « à vérifier » parce qu’ils se chevauchent : la mesure ci-dessous les couvre.

| Texte                                                                                | Sur                                       | Contraste                 |
| ------------------------------------------------------------------------------------ | ----------------------------------------- | ------------------------- |
| `--ink`                                                                              | `--cream`, `--paper`                      | 11,77 ; 12,23             |
| `--ink`                                                                              | `--sage`, `--rose`, `--sun-soft`, `--sky` | 8,33 ; 8,56 ; 9,86 ; 9,86 |
| `--ink-soft`                                                                         | `--cream`, `--paper`                      | 7,04 ; 7,31               |
| `--ink-soft`                                                                         | `--sun-soft`, `--sky`, `--rose`, `--sage` | 5,90 ; 5,90 ; 5,12 ; 4,98 |
| `--muted`                                                                            | `--cream`, `--paper`                      | 6,15 ; 6,39               |
| `--coral-ink`                                                                        | `--cream`, `--paper`                      | 5,24 ; 5,45               |
| `--coral-ink`, **grand texte seulement**                                             | `--sun-soft`, `--rose`, `--sage`          | **4,39 ; 3,82 ; 3,71**    |
| `--cobalt`                                                                           | `--paper`                                 | 5,68                      |
| blanc, `--cream`                                                                     | `--cobalt`                                | 5,86 ; 5,47               |
| `--sun`, `--cream`                                                                   | `--ink`                                   | 8,12 ; 11,77              |
| `--ink`                                                                              | `--sun`                                   | 8,12                      |
| `--danger-ink`                                                                       | `--danger-bg`, `--cream`, `--paper`       | 6,77 ; 7,72 ; 8,02        |
| blanc                                                                                | `--danger-ink`                            | 8,27                      |
| `--ok-ink` / `--ok-bg`, `--unknown-ink` / `--unknown-bg`, `--warn-ink` / `--warn-bg` |                                           | 7,52 ; 7,34 ; 7,67        |

**Corrigé :**

- Les textes indicatifs des champs (`::placeholder`) étaient à 3,52:1. Ils utilisent maintenant `--muted` (6,39:1), un jeton existant.
- Sous les vagues, `--ink-soft` sur `--sage` tombait à 4,49:1. La vague de devant passe de 5 % à 4 % d’opacité.

**Non corrigé, à trancher :** `--coral-ink` sur les fonds colorés reste sous 4,5:1 (4,39 ; 3,82 ; 3,71). Cela concerne « Un départ ensemble. » sur l’accueil et les « Chapitre un » manuscrits. Ce sont de grands textes, donc conformes au seuil de 3:1 du WCAG AA, mais sous les 4,5:1 demandés. Passer à 4,5:1 obligerait à assombrir nettement le corail, ou à l’abandonner sur ces fonds : ce serait toucher à l’identité visuelle, donc je n’y ai pas touché.

**Sous le voile animé :** le voile est fusionné en `multiply`. Son effet sur chaque couple a été calculé à partir des couleurs mesurées, pour les cinq cas les plus sombres (vagues à deux et trois couches, neige, feuilles, soleil). Aucun couple ne passe sous son seuil WCAG. C’est un calcul, pas une mesure au pixel. Une feuille ou un flocon qui passe sur un mot n’est pas pris en compte : ces particules sont temporaires.

Les boutons inactifs sont exclus de la mesure, comme le prévoit le WCAG.

### Clavier

236 arrêts de focus inspectés avec de vraies touches, à 1440 et 390 px : Tab, Maj+Tab, Entrée, Échap, flèches dans les onglets. Pour chaque arrêt : anneau visible, contraste de l’anneau (3:1 minimum), élément dans l’écran, non caché par la barre collante, non recouvert.

| Défaut trouvé                                                                                                                                                                  | Correction                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Le focus disparaissait quand un bouton se désactivait pendant l’enregistrement (« On garde », « Modifier », « Appliquer », « Enregistrer le budget », « Explorer un exemple ») | `aria-disabled` au lieu de `disabled` : le bouton garde le focus, et les clics sont ignorés pendant l’envoi |
| Le focus tombait hors du dialogue au passage à la comparaison, et au retour à la saisie                                                                                        | Le focus suit l’étape : tableau de comparaison, puis champ « Nom »                                          |
| Focus perdu après « C’est revu » (le bouton disparaît)                                                                                                                         | Le focus va au bouton suivant de la même activité                                                           |
| Focus perdu après « Oublier » dans les voyages récents                                                                                                                         | Le focus va au titre de la section                                                                          |
| Champs de date : focus invisible sur le jour, le mois et l’année                                                                                                               | Anneau sur tout le champ avec `:focus-within`                                                               |
| En développement, le focus partait sur `main` au chargement, et le premier Tab sautait l’en-tête et le lien d’évitement                                                        | L’effet compare la route au lieu d’un drapeau de premier rendu                                              |
| axe : niveaux de titres sautés dans les onglets (`h1` puis `h3`)                                                                                                               | Un `h2` réservé aux lecteurs d’écran par onglet, sans effet visuel                                          |

**Vérifié sans défaut :** lien d’évitement vers le contenu, focus sur la page après chaque navigation, flèches dans les onglets, focus enfermé dans les dialogues, Échap qui rend le focus au bouton d’origine, focus sur le bouton « Modifier » après « Appliquer ».

**Reste :** à 390 px, le message temporaire en bas d’écran (4,5 secondes) peut recouvrir un bouton qui vient de recevoir le focus. Une marge de défilement réduit le cas sans l’éliminer.

### Débordement horizontal

Aucun débordement à 390, 768 et 1440 px sur 18 écrans mesurés : accueil, formulaire, confidentialité, programme, budget et carnet à chaque largeur.

### Non vérifié

Pas de lecteur d’écran réel (NVDA, VoiceOver), pas de Safari ni de Firefox, pas de téléphone réel. Le script de mesure n’est pas dans la CI.
