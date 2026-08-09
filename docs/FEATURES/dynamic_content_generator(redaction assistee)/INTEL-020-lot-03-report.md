# INTEL-020 — Rapport Lot 3 — Résolveur dynamique

- Baseline : `467ac8a3eae8eb537e76ac526e78561b8d061cff` sur `main`.
- Fichiers : résolveur pur, tests du résolveur, ledger et présent rapport.
- Règles : résolution scope → catégorie → scénario → finalité → objectif → canal → longueur → ton ; préservation des choix valides, corrections tracées, scopes Management/Staff forcés, offre pilotée par la registry.
- Compatibilité : `profile_submission` est normalisé ; `interne_management` est converti seulement avec scope explicite et rejeté sinon, sans réémission legacy.
- Vérification : 20 tests ciblés, TypeScript, ESLint ciblé et `git diff --check` réussis. Aucun React, Supabase, n8n, migration ou point d'entrée modifié.
- Réserve : les échecs globaux historiques de lint et du test mobile restent hors périmètre et ne sont pas aggravés. Aucun Lot 4 n'est engagé.
