# ADR-0003 : Projet Supabase dédié + schéma `public` unique avec préfixes

**Statut :** Accepté
**Date :** 2026-06
**Décideur :** Dosta

## Contexte
Plan gratuit Supabase limité à 2 projets actifs (500 Mo/projet, pause après 7 jours d'inactivité). Habitude de mutualiser plusieurs projets via des schémas. Question : Kredo mérite-t-il un projet entier, et faut-il un schéma par brique fonctionnelle ?

## Décision
1. **Projet Supabase entièrement dédié** à Kredo (1 des 2 slots gratuits). Le 2ᵉ slot devient un « labo » mutualisé pour les bricks indépendantes.
2. **Schéma `public` unique**, tables et types **préfixés par domaine** (`crm_`, `sales_`, …).

## Options considérées
| | Projet mutualisé / schéma par brique | Projet dédié / schéma unique (retenu) |
|---|---|---|
| Jointures cross-domaine | ❌ fragiles (API auto cross-schéma) | ✅ natives |
| Friction client (`supabase-js`) | ❌ `.schema()` partout, schémas à exposer | ✅ défaut `public` |
| Isolation Auth/Realtime/pgvector | ❌ partagée | ✅ dédiée |
| Enveloppe gratuite | partagée | ✅ pour Kredo seul |

## Principe directeur
**Un schéma sert à *isoler* ; la valeur de Kredo est d'*interconnecter*.** Le test : « ces données ont-elles besoin de se parler ? » Oui (Kredo) → un schéma. Non (bricks du labo) → un schéma chacune.

## Conséquences
- ✅ L'API auto-générée embarque les relations sans configuration.
- ✅ Rangement visuel par préfixe sans la friction du multi-schéma.
- ⚠️ Pause après 7 jours d'inactivité → prévoir un ping quotidien via n8n pendant les absences.
