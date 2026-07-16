# design-assets

Références visuelles **hors déploiement** (ne sont pas servies par Next.js).

`palette_couleurs/` — nuanciers de référence de l'identité Cobalt Franc.
Déplacés hors de `public/` (audit perf, Session 28) : ~12 Mo jamais chargés par
l'app mais qui alourdissaient le déploiement Vercel. La source de vérité des
couleurs reste `src/app/globals.css` (`@theme`). Ces PNG ne sont qu'un support
de design ; les remettre dans `public/` uniquement si une page doit les afficher.
