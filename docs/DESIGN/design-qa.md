# Design QA — Veille & actualités Desktop

## Références contractuelles

- Atlas éditorial — Desktop : `Image Codex 3 août 2026, 03_11_11.png`
- Revue analytique — Desktop : `Image Codex 3 août 2026, 03_11_27.png`

## Contrôles structurels terminés

| Écart | Référence | Rendu | Correction appliquée |
|---|---|---|---|
| Navigation locale | Rail Atlas identique à Rapports | Rail dédié de 132 px | Densité, filet brass 3 px, teinte pétrole et focus repris de `ReportsLocalNavigation` |
| Header | Titre seul, deux actions et santé | Aucun sous-titre, aucun pitch global | Header limité à `Actualiser`, `Configurer la veille` et l’état réel du workflow |
| Lecture | Scène Revue dominante | Cadre teinté et feuille blanche | Padding papier 40–48 px, largeur 74ch, filets éditoriaux, aucune carte imbriquée |
| Rail droit | Actions Revue + contexte Atlas | Rail continu de 288 px | Pitch brass, actions réelles, contexte issu du matching existant, absence d’action digest fictive |
| Articles secondaires | Bande de trois cartes | Trois cartes sous la grille principale | Ordre de sélection conservé, article principal exclu, aucun placeholder |
| Palette | Claire, navy/pétrole/brass | Thème `edito-bright-veille` | Tokens `edito-*`, sans glow, gradient ni thème sombre |
| Mobile | Hors lot | Branche serveur conservée | Aucun changement dans `VeilleActualitesMobile.tsx` |

## Vérification navigateur

État : **en attente d’authentification**.

Le navigateur intégré atteint `http://localhost:3000/veille`, puis est redirigé
vers `/login?next=%2Fveille`. Les tests 1512×982, 1440×900 et 1280×800, les
captures simultanées avec les deux références et le contrôle final des modales
restent à exécuter dès qu’une session KREDO est ouverte dans cet onglet.

## Résultat

**Non statué visuellement** — aucun passage n’est revendiqué sans captures de
l’implémentation authentifiée.
