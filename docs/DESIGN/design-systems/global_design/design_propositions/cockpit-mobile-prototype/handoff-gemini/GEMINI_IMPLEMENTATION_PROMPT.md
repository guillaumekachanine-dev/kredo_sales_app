Tu implémentes la version mobile finale du Cockpit KREDO sur `/cockpit` dans le repo local suivant:

`/Users/dosta/Desktop/Projets-Dev/KREDO/kredo`

Avant toute modification, lis intégralement:

1. `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/outputs/cockpit-mobile-prototype/handoff-gemini/GEMINI_HANDOFF.md`
2. les captures dans `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/outputs/cockpit-mobile-prototype/handoff-gemini/reference-assets/`

Puis audite au minimum:
- `src/components/cockpit/CockpitMobileDashboard.tsx`
- `src/components/cockpit/CockpitDesktopDashboard.tsx`
- `src/components/cockpit/index.tsx`
- `src/lib/cockpit/cockpit-data.ts`
- `src/components/templates/MobileActionPage.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/SurfaceCard.tsx`
- `src/components/ui/AppDrawer.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/MobileBottomNav.tsx`
- `src/components/accounts-contacts/CompanyIdentityDrawer.tsx`
- `src/components/accounts-contacts/ContactIdentityDrawer.tsx`
- `src/components/missions/NewOpportunityDrawer.tsx`

Contraintes absolues:
- mobile uniquement;
- ne modifie pas la vue Desktop;
- ne réinterprète pas le prototype;
- aucun redesign;
- aucune nouvelle dépendance;
- aucun mock silencieux en production;
- uniquement les tokens existants;
- pas de masquage CSS desktop/mobile: conserve le split adaptatif existant côté serveur;
- pas de couleur en dur, gradient ou ombre décorative;
- pas de modification Supabase ou schéma si un seam typé suffit.

Ordre d'exécution:
1. protéger le desktop et créer un view-model mobile dédié;
2. implémenter le shell/header mobile et copier le logo officiel vers `public/branding/kredo/logo_sans_fond.png`;
3. implémenter agenda;
4. implémenter staffings;
5. implémenter rendez-vous;
6. implémenter prospection;
7. brancher sheets, drawers et deep-links confirmés;
8. laisser les points non confirmés sous forme de seams typés ou états vides explicites.

Validation obligatoire avant rendu:
- `pnpm` ou `npm` typecheck selon le projet
- build de l'app
- vérification visuelle mobile `390 x 844`
- vérification accessibilité clavier/focus
- vérification `prefers-reduced-motion`
- vérification qu'il n'y a aucun scroll horizontal
- vérification que Desktop n'a pas changé

Compte rendu final exigé:
- fichiers modifiés/créés, un par un;
- choix de mapping données réel vs seam;
- deep-links réellement branchés;
- points explicitement laissés `A RESOUDRE`;
- résultats de validation TypeScript, build, accessibilité et visuelle.
