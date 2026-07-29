# ADR-0016 — Realtime et notifications : ne pas re-architecturer, la mesure ne le justifie pas

**Statut :** Accepté
**Date :** 2026-07-29
**Décideurs :** Guillaume (Owner)
**Liés :** ADR-0010 (brief hebdomadaire, `user_notifications` — non filé, en transcript), audit de performance : [AUDIT-PERFORMANCE-KREDO.md](../AUDIT-PERFORMANCE-KREDO.md) (Lot 2)

> Cet ADR existe pour **fermer un sujet**, pas pour en ouvrir un. Il grave le refus de
> re-architecturer le dispositif Realtime de KREDO, avec les chiffres qui fondent ce refus,
> afin que la question ne soit pas rouverte sur la base de l'indicateur trompeur qui l'avait
> ouverte.

---

## 1. Contexte

L'audit de performance de KREDO (Lot 0, 2026-07-29) a relevé dans `pg_stat_statements` que
la requête de polling WAL de Supabase Realtime représentait **79,7 % du temps d'exécution
cumulé de la base** — 2 913 secondes sur 539 257 appels, loin devant *toutes* les requêtes
applicatives réunies.

Cet indicateur a conduit à formuler un « Levier B » dans le protocole d'audit : réduire ce
coût, en re-cadrant l'abonnement permanent de `NotificationBell` (monté dans `AppShell`,
donc actif sur toutes les pages, pour tous les utilisateurs). Trois options étaient posées :
filtrage serveur par `user_id`, bascule `postgres_changes` → `broadcast`, ou remplacement par
un polling basse fréquence.

**Le Lot 2 a mesuré avant d'agir. La mesure invalide la prémisse.**

---

## 2. Ce que la mesure établit

Fenêtre `pg_stat_statements` : réinitialisée le 2026-07-13 10:25 UTC, soit
**1 419 976 secondes** (16 jours 10 h) au moment de la mesure.

| Grandeur | Valeur |
|---|---|
| Temps total d'exécution, **toutes requêtes confondues** (1 724 requêtes distinctes, 718 901 appels) | **3 655 s** |
| Part de ce total dans la fenêtre | **0,257 % d'un seul cœur** |
| Dont polling WAL Realtime | 2 913 s → **0,205 % d'un cœur** |
| Dont tout le reste de l'application | 742 s → **0,05 % d'un cœur** |
| Cadence réelle du polling | 539 257 appels / 1 419 976 s = **1 appel toutes les 2,6 s** |
| Lignes renvoyées par appel | ≈ 1 — c'est un **battement à vide**, pas du transport de données |
| Trafic utilisateur sur la même période (logs runtime Vercel, 7 j) | **≈ 60 requêtes** |

**Conclusion arithmétique : la base de données est au repos.** Les 79,7 % étaient une part
d'un total négligeable. L'indicateur était exact et **structurellement trompeur** : dans une
base qui ne fait presque rien, le processus de fond qui tourne en continu capte
mécaniquement la quasi-totalité du temps mesuré.

### 2.1 Contrôles annexes, tous négatifs

- **Fuites de canaux** : les 8 fichiers client ouvrant un canal Realtime ont été audités
  (`use-workspace-diagnostic`, `NotificationBell`, `AutomationsDesktopDashboard`,
  `ClientIntelligenceDesktopView`, `ClientIntelligenceMobileView`,
  `IntelligenceActionDrawers`, `AccountScanDialog`, `ReportGenerationDrawer`). Tous
  équilibrent création et `removeChannel`. Vérification ciblée sur `NotificationBell`, le
  seul canal permanent : `removeChannel` est bien dans le `return` du `useEffect`, avec des
  dépendances stables (`[supabase]`) — canal créé une fois, retiré au démontage.
  **Aucune fuite.**
- **Rétention WAL** : `pg_replication_slots` affichait 2 slots actifs (16 MB retenus chacun)
  à une heure d'intervalle, puis **aucun slot**. Realtime les recrée cycliquement. Aucun
  risque de rétention non bornée (le scénario qui remplirait le disque).
- **Volume d'écriture** : `audit_log` est la plus grosse table (19 MB / 5 063 lignes,
  soit ≈ 3,8 KB par ligne) mais n'accumule que 1 153 insertions sur 16,4 jours, soit
  ≈ 70/jour → **≈ 100 MB/an**. Sujet de croissance de stockage à surveiller, **pas** un
  contributeur de charge.

---

## 3. Décision

**Aucune modification du dispositif Realtime.** Les trois options envisagées sont écartées :

| Option écartée | Motif |
|---|---|
| Filtrage serveur sur `user_id` pour `NotificationBell` | Optimiserait 0,2 % d'un cœur. Coût de développement et de test non nul, gain non mesurable. |
| Bascule `postgres_changes` → `broadcast` | Même gain nul, mais **régression fonctionnelle réelle** : `broadcast` n'évalue pas les RLS, il faudrait reconstruire côté applicatif la garantie d'isolation que `postgres_changes` fournit gratuitement. |
| Remplacement par un polling basse fréquence | Dégraderait l'immédiateté de l'alerte d'échec de workflow (ADR-0010 / Session 28), au bénéfice d'un gain nul. |

**Ce qui est conservé en l'état :** les 3 tables publiées (`ai_intelligence_results`,
`ai_intelligence_runs`, `user_notifications`), l'abonnement permanent de `NotificationBell`,
et les 11 autres canaux.

**Ce qui est retenu comme suivi, pas comme action :** la croissance d'`audit_log`
(≈ 100 MB/an). À revoir si le volume d'écriture change d'ordre de grandeur — par exemple à
l'arrivée d'utilisateurs réels, ou si les triggers `log_audit` sont étendus à d'autres tables.

---

## 4. Conditions de réouverture

Ce refus est **conditionnel à l'échelle actuelle**. Rouvrir le sujet si l'un de ces seuils
est franchi — et seulement dans ce cas, avec un nouveau relevé de `perf-baseline.sql` à
l'appui :

1. Le temps d'exécution total de la base dépasse **10 % d'un cœur** sur une fenêtre de 7 jours
   (contre 0,257 % aujourd'hui) ;
2. Un slot de réplication reste actif avec une rétention WAL **croissante** sur plusieurs
   heures (risque de saturation disque) ;
3. Le nombre d'utilisateurs simultanés dépasse **10** — le coût Realtime croît avec le nombre
   d'abonnés × le volume de WAL, or ces deux facteurs sont aujourd'hui au plancher ;
4. Une table à fort volume d'écriture est ajoutée à la publication `supabase_realtime`.

---

## 5. Conséquence sur l'audit de performance

Le Lot 1 (RLS InitPlan) et le Lot 2 (Realtime) ont tous deux vu **leur prémisse invalidée par
la mesure**. Les deux leviers désignés comme prioritaires sur la base d'indicateurs relatifs
(`seq_scan` sur `profiles`, part de CPU Realtime) se révèlent sans enjeu en absolu.

**La moitié « base de données » de l'audit est donc close : il n'y a rien à y optimiser.**

Le seul levier restant qui porte une valeur perceptible par l'utilisateur est le **Levier C**
— frontière serveur/client, cache et bundle. C'est cohérent avec le profil réel de
l'application : une base au repos, mais **4,8 MB de JavaScript client**, un chunk de layout de
**156 KB chargé sur chaque page**, **68 des 71 routes en rendu dynamique**, `use cache` jamais
employé et 7 `<Suspense>` pour 50 routes. Dans une application dont la base ne travaille pas,
la latence ressentie est **intégralement** un problème de front-end.

**Priorité révisée pour la suite : Lot 3 (cache Next 16 / frontière RSC) puis Lot 4 (bundle).**
Le Lot 5 (requêtes lentes) conserve une cible identifiée par la mesure — dans
`v_crm_account_list`, un nœud `HashAggregate` consomme 14,3 ms des 53 ms et deux
`Nested Loop Left Join` rejettent 690 et 555 lignes par `Join Filter` — mais à 53 ms sur une
base au repos, c'est un travail de confort, pas de performance.

---

## 6. Leçon de méthode

Une part relative n'est pas une grandeur. « 79,7 % du temps de la base » et « 0,2 % d'un
cœur » décrivent le même fait ; l'un appelle une refonte, l'autre un classement sans suite.

Règle retenue pour la suite de l'audit, ajoutée aux règles d'exécution du protocole :
**tout indicateur exprimé en pourcentage doit être accompagné de sa valeur absolue et de la
fenêtre de mesure avant d'être utilisé pour prioriser quoi que ce soit.**
