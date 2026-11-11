# Rapport de la nuit du 10 au 11 novembre 2026

## À savoir en premier

Les PR #1, #2 et #3 ont été fusionnées dans l’ordre #1, #2, #3, donc **`main` ne contient que la tranche 2**. Les tranches 3 et 4 sont restées sur `t3-fiabilisation` et `t4-outillage`. Je suis parti de `t4-outillage` et j’ai ouvert la **PR #4** pour les remonter.

**Ordre de fusion : #4, puis #5, puis #6.** Rien n’est fusionné, rien n’a été poussé sur `main`, rien n’est déployé.

## Ce que j’ai fait

**Partie A (PR #5, `t4-tests`)**

- 81 tests frontend, bloquants en CI. 12 défauts introduits volontairement : 12 détectés.
- Deux vrais défauts trouvés et corrigés : un `localStorage` abîmé faisait planter l’accueil, et « Dans le plafond » ne vérifiait pas que le budget était complet.
- Accessibilité mesurée dans Chrome : 2 175 textes, axe-core 0 violation, 236 arrêts de focus, aucun débordement à 390, 768 et 1440 px. Détail dans `docs/DIRECTION_ARTISTIQUE.md`.

**Partie B (PR #6, `t5-preparation`)**

- Images Docker, compose de production, Caddy avec HTTPS automatique, `--forwarded-allow-ips` restreint au proxy, scripts de déploiement, de sauvegarde et de restauration, `docs/DEPLOIEMENT.md`.

**Résultat de la restauration** (sur un runner GitHub Actions, voir plus bas) : 17 voyages, sauvegarde de 7 394 octets en 245 ms, restauration en 8 140 ms, **empreinte MD5 de la table identique avant et après**, ancienne clé de lecture toujours valide.

**Contrôles :** 67 tests backend, 81 tests frontend, lint et build, tous réussis avant le push de la partie A et le dernier push de la partie B. Entre les deux, trois pushs n’ont corrigé que les scripts de test du déploiement : ils ont été vérifiés par la CI, pas relancés sur mon poste.

## Ce que j’ai décidé seul, et pourquoi

| Décision                                                               | Pourquoi                                                                                                                                                        |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partir de `t4-outillage`, pas de `main`                                | Ta consigne disait « pars de `main` si c’est fusionné », mais `main` n’a ni la tranche 3 ni ESLint. Travailler dessus aurait fait repartir d’un code incomplet. |
| Ouvrir la PR #4 de rattrapage                                          | Sans elle, les tranches 3 et 4 restaient bloquées. Elle n’ajoute aucun code et ne fusionne rien.                                                                |
| `t5-preparation` part de `t4-tests`, chaque PR vise `main`             | Pas de pile de PR, et pas de conflit sur le journal et `NEXT.md`. Quel que soit l’ordre de fusion, `main` reste cohérent.                                       |
| Test de déploiement sur un runner GitHub                               | Docker n’est pas sur ton poste, et l’installer sans toi demandait des droits d’administrateur et un redémarrage. Le runner utilise le vrai compose.             |
| Une CI de déploiement à blanc en plus                                  | C’est le seul moyen d’exécuter ces fichiers. Elle ne se lance que si les fichiers de déploiement changent.                                                      |
| Deux branches temporaires, supprimées depuis                           | Pour prouver que le test détecte un proxy mal configuré.                                                                                                        |
| Caddy comme reverse proxy                                              | HTTPS automatique avec très peu de configuration, et aucun journal d’accès, ce qui reste conforme à la page de confidentialité.                                 |
| Un seul worker uvicorn                                                 | Le quota vit en mémoire : plusieurs workers le diviseraient.                                                                                                    |
| `aria-disabled` au lieu de `disabled` sur les boutons qui enregistrent | Un bouton désactivé fait perdre le focus clavier. L’apparence ne change pas.                                                                                    |
| Sauvegarde automatique avant chaque migration                          | Sans elle, le retour arrière après migration est impossible.                                                                                                    |

## Ce que je n’ai pas réussi

- **Test de restauration sur ton poste** : impossible sans Docker. Il a bien eu lieu avec le PostgreSQL du compose, mais sur un runner GitHub.
- **Corail sur fonds colorés** : 4,39 ; 3,82 ; 3,71, sous les 4,5:1 demandés. Conforme au WCAG AA car c’est du grand texte, mais je ne l’ai pas corrigé : ça toucherait à l’identité visuelle.
- À 390 px, le message temporaire (4,5 s) peut encore recouvrir un bouton focalisé.
- Pas de lecteur d’écran réel, ni Safari, ni Firefox, ni téléphone réel. Pas de vrai VPS ni de vrai certificat. Retour arrière entre deux versions différentes et tâche `cron` non testés.
- **Ta base locale est toujours en 0002.** Je n’y ai pas touché, comme demandé. Sans la migration, la nouvelle API répond 503.

## Les trois questions que je t’aurais posées

1. **Le corail :** garde-t-on `--coral-ink` sur les fonds colorés (conforme au WCAG AA, grand texte seulement), ou l’assombrit-on pour atteindre 4,5:1 quitte à perdre un peu de l’identité ?
2. **Le domaine et le responsable des données :** quel nom de domaine, et quel nom et contact afficher sur la page de confidentialité ? Ce sont les deux seuls vrais blocages avant une mise en ligne.
3. **Où copier les sauvegardes ?** Pour l’instant, elles resteraient sur le VPS qu’elles protègent. Un stockage externe chiffré, ou une copie régulière sur ta machine ?
