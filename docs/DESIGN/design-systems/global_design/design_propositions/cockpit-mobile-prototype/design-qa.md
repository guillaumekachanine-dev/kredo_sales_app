source visual truth path: /Users/dosta/Desktop/Capture d’écran 2026-06-16 à 17.20.10.png
implementation screenshot path: /Users/dosta/Desktop/Projets-Dev/KREDO/kredo/outputs/cockpit-mobile-prototype/capture-a-collapsed.png
viewport: 390 x 844 px @ 3x
state: Vue principale avec agenda replie
full-view comparison evidence: La reference fournie ne couvre que le header iOS et la composition de l'entete. Le reste de l'ecran est donc compare au brief et aux tokens/composants KREDO audites, pas a une maquette ecran complet existante.
focused region comparison evidence: /Users/dosta/Desktop/Projets-Dev/KREDO/kredo/outputs/cockpit-mobile-prototype/header-comparison.png

**Findings**
- Aucun ecart P0, P1 ou P2 sur la verite visuelle disponible. La composition retenue respecte le logo KREDO a gauche, le titre immediatement a droite, un header compact et la hierarchie mobile demandee.
- [P3] Le prototype ne reproduit pas la chrome systeme iOS complete (heure, Dynamic Island, avatar).
  Location: header de reference.
  Evidence: la reference montre la barre systeme et un avatar a droite ; le brief demandait uniquement de s'inspirer de la composition et interdisait avatar/sous-titre.
  Impact: aucun sur la maquette cockpit demandee.
  Fix: ne rien changer pour cette iteration.

**Open Questions**
- Aucun blocage. Les etats non couverts par la reference image complete restent brief-driven plutot que mock-driven.

**Implementation Checklist**
- Verifier la direction mobile en local sur les trois etats captures.
- Reprendre cette structure si une implementation produit est lancee plus tard.

**Follow-up Polish**
- Ajuster encore la largeur visuelle du logo et l'espacement du titre si une maquette source ecran complet du cockpit devient disponible.

patches made since the previous QA pass:
- Correction de copy visible: "Cockpit" dans le panneau de capture.
- Harmonisation d'un libelle agenda opportunity -> opportunite.
- Normalisation d'une metrique prospection en "145 k€".

final result: passed
