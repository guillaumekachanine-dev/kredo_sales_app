# SHELL-0018 — Audit de l'existant au 2026-09-07

## 1. Objet

Ce document remplace les constats de baseline du chantier SHELL-0018 datés du 6–7 août 2026.

Il décrit uniquement la réalité nécessaire pour reprendre le chantier de standardisation du menu secondaire Desktop et, dans un second temps, la refonte du Shell global.

Baseline Git auditée : `d9c7fc9edb9d35cc6d2fc889d9e251ad0fa311a1`.

## 2. Conclusion d'audit

L'intention de SHELL-0018 reste valide : KREDO possède plusieurs implémentations de navigation secondaire qui convergent visuellement mais restent dupliquées et incohérentes techniquement.

La cible initiale d'août ne peut toutefois plus être appliquée telle quelle : plusieurs pages ont été profondément refondues depuis, le Mobile dépend désormais de contrats de navigation partagés, et de nouveaux rails ont été ajoutés sans primitive commune.

Le chantier V2 doit donc commencer par extraire le **standard réellement convergent du produit actuel**, puis remplacer progressivement les implémentations locales sans refondre simultanément leur métier.

## 3. Référence visuelle actuelle

La meilleure référence du châssis est `ClientIntelligenceSidebar.tsx` :

- largeur `w-[11.5rem]` ;
- navigation verticale ;
- items `min-h-10` ;
- filet gauche brass sur l'élément actif ;
- couleurs EDITO ;
- section `Chapitres` ;
- section `Modules`.

La V2 fige toutefois trois précisions produit qui deviennent normatives :

1. le chapeau est un **bouton navy** ;
2. son contenu est le **titre de la page principale**, en **blanc**, **gras** et **centré** ;
3. le **nom de l'onglet actif** est toujours rendu dans le header de la zone principale, jamais uniquement dans le rail.

## 4. Inventaire actuel des mécanismes Desktop

| Surface | Mécanisme | Largeur / état | Écart principal |
|---|---|---|---|
| Account Intelligence | rail vertical local | `11.5rem` | proche standard |
| Business Intelligence | rail vertical local | `11.5rem` | chapeau non canonique ; rail local |
| Veille | rail vertical local | `11.5rem` | chapeau non canonique ; rail local |
| Rapports | rail inline dans la page | `11.5rem` | duplication inline ; modules non structurés |
| Automatisations | rail vertical local | `11.5rem` | styles divergents ; pas de section Modules |
| Engagements | rail inline dans le shell | `11.5rem` | nouveau clone ; manque structure canonique |
| Prospection | rail vertical local | `15rem` | largeur et vocabulaire divergents |
| Knowledge Hub | rail contextuel local | `12.5rem` | largeur et rendu Modules divergents |
| Finance | tabs horizontaux | — | ancien mécanisme client-state |
| Plusieurs routes historiques | `SectionNavBar` / `SectionNavBarSlot` | horizontal | mécanisme legacy toujours consommé |

Le problème n'est donc plus « cinq clones » : le nombre de surfaces verticales a augmenté et la duplication s'est diffusée.

## 5. État des pages majeures

### 5.1 Account Intelligence

Le rail possède déjà le vocabulaire le plus proche du standard V2.

À conserver :

- dimensions ;
- état actif ;
- rythme vertical ;
- icônes compactes ;
- chapeau navy centré.

À adapter lors de l'extraction :

- le chapeau doit toujours représenter le titre de la page principale ;
- seuls les modules contextuels de la page doivent apparaître dans `Modules` ;
- le header principal doit porter explicitement le nom de l'onglet actif.

### 5.2 Business Intelligence

Business Intelligence est désormais un workspace mono-segment URL-driven.

Le chapitre actif est représenté dans l'URL via `?tab=`. Cette architecture est canonique pour BI et ne doit pas être transformée en sous-routes artificielles.

Conséquence : le standard de navigation V2 ne doit pas imposer un pathname par chapitre. Il impose uniquement que l'état de navigation soit **adressable dans l'URL**, refresh-safe et compatible back/forward.

### 5.3 Engagements

Le shell Desktop d'Engagements utilise déjà un rail vertical `11.5rem` et pilote ses vues via `?vue=`.

Ce nouveau rail confirme la convergence vers un modèle commun, mais il a été recopié localement et ne possède pas encore l'anatomie normative complète.

### 5.4 Veille

Veille dispose déjà d'une vraie section de modules contextuels.

Le comportement métier doit être conservé. Le chantier ne doit remplacer que le châssis de navigation, sauf décision spécifique prise dans un lot ultérieur.

### 5.5 Rapports

`ReportsLocalNavigation` reste défini inline dans `ReportsDesktopView.tsx`.

C'est une dette directe : il doit être extrait puis remplacé par la primitive commune.

### 5.6 Automatisations

Le rail est proche du modèle, mais ses ombres, sa sémantique de tabs et certains états actifs divergent du vocabulaire partagé.

### 5.7 Prospection

La largeur `15rem` est incompatible avec le standard. La migration doit la ramener à `11.5rem` et adopter le vocabulaire `Chapitres`.

### 5.8 Knowledge Hub

Knowledge Hub possède une navigation contextuelle réellement différente dans son contenu, mais son **châssis** peut être standardisé.

La V2 ne cherche pas à aplatir les domaines du Knowledge Hub. Elle standardise seulement : largeur, chapeau, sections, items, état actif et position de `Modules`.

### 5.9 Finance

Finance reste sur un composant `FinanceTabs` horizontal et un état client.

Sa migration demande deux changements distincts :

1. adopter `SectionRail` ;
2. rendre l'onglet actif URL-addressable.

Finance ne doit pas servir de premier pilote visuel : il sera traité après extraction du rail sur des pages déjà verticales.

## 6. Shell global actuel

Le Desktop reste structuré autour de :

- `DesktopSidebar` ;
- contenu principal ;
- panneau latéral Cockpit Intelligence ;
- `useSidebarCollapse` utilisé dans plusieurs surfaces.

Il n'existe pas de host global de navigation secondaire.

La V2 ne crée pas immédiatement un `SectionRailHost` central : plusieurs pages ont des états contextuels riches et des stratégies URL différentes. La primitive doit d'abord être **présentationnelle et composable**.

## 7. Mobile — dépendance protégée

Le Mobile est hors périmètre de refonte visuelle de SHELL-0018 V2.

Cependant, il utilise encore des contrats partagés de navigation (`main-menu.config.ts`, helpers de tabs, `MobileSectionRail`).

Aucune suppression de ces contrats n'est autorisée tant que leurs consommateurs mobiles n'ont pas été remplacés explicitement.

## 8. Modules du menu secondaire

Le standard V2 distingue strictement :

- **navigation locale** : chapeau + chapitres ;
- **modules contextuels** : outils directement liés à la page ou au contexte affiché ;
- **actions transverses** : hors rail, centralisées dans Cockpit Intelligence.

Il est interdit d'ajouter au rail un module simplement parce qu'il existe dans KREDO. Un module n'apparaît que s'il est pertinent dans la page courante et réellement ouvrable dans ce contexte.

## 9. Base de données

L'audit live Supabase n'a identifié aucune table de configuration de navigation/menu/module.

Décision maintenue :

- aucune table `navigation_*`, `menu_*`, `module_registry` ou équivalent ;
- aucune migration Supabase pour standardiser le rail ;
- la configuration de navigation reste TypeScript et versionnée avec le code.

## 10. Documents historiques à ne plus utiliser comme cible

Les documents suivants restent utiles uniquement pour comprendre la genèse :

- ancien ADR-0018 daté du 2026-08-06 ;
- ancien ledger SHELL-0018 daté du 2026-08-07 ;
- ancienne arborescence cible d'août 2026.

Ils contiennent des hypothèses désormais invalidées : état du Mobile, nombre de rails, structure de Business Intelligence, périmètre de certaines pages et ancienne conception des modules.

## 11. Ce qu'il faut conserver

- largeur `11.5rem` ;
- rail vertical Desktop ;
- chapeau en tête ;
- navigation locale simple ;
- filet brass actif ;
- séparation claire Chapitres / Modules ;
- configuration client-safe ;
- migration page par page ;
- URL comme source de vérité de la position de navigation ;
- aucune donnée factice ;
- aucune migration DB pour le Shell.

## 12. Ce qu'il faut changer

- supprimer progressivement les clones locaux ;
- uniformiser largeur et anatomie ;
- rendre le chapeau strictement conforme au standard ;
- garantir le titre de l'onglet actif dans le header principal ;
- limiter `Modules` aux modules contextuels ;
- ancrer `Modules` en bas du rail quand l'espace le permet ;
- remplacer progressivement les états de navigation purement locaux par un état URL ;
- protéger les dépendances Mobile ;
- traiter `useSidebarCollapse` et l'ancien `SectionNavBar` dans une phase Shell séparée.

## 13. Ordre recommandé

1. rebaseline documentaire ;
2. primitive `SectionRail` ;
3. migration des rails déjà verticaux ;
4. standardisation des modules contextuels ;
5. URLisation des navigations encore client-state ;
6. migration Finance et autres mécanismes horizontaux ;
7. refonte du Shell global ;
8. nettoyage legacy.
