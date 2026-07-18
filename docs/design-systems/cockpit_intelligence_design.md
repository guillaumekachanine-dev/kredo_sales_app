# `cockpit_intelligence_design`

## Statut

Référence canonique KREDO pour toutes les pages **Cockpit Intelligence** des comptes.

- **Identifiant à employer dans les prompts** : `cockpit_intelligence_design`
- **Design system parent obligatoire** : `edito_bright_design`
- **Composant source principal** : `src/components/accounts-contacts/intelligence/ClientIntelligenceDesktopView.tsx`
- **Tokens et typographie** : `src/app/globals.css`
- **Page de référence** : Cockpit Intelligence du compte CEGEMA
- **Mode validé** : Desktop clair, éditorial, premium et analytique

La simple mention de `cockpit_intelligence_design` vaut instruction explicite de lire ce document puis `docs/design-systems/edito_bright_design.md` avant toute modification UI.

---

## 1. Intention

Ce pattern transforme la fiche d’intelligence d’un compte en espace éditorial de décision, sans reprendre l’apparence d’un dashboard CRM générique.

Le rendu doit rester :

- clair et fortement hiérarchisé ;
- dense mais respirant ;
- premium sans effets décoratifs excessifs ;
- mémorable grâce à quelques signatures visuelles discrètes ;
- centré sur l’analyse du compte et la progression vers l’action commerciale.

---

## 2. Structure canonique

La page comprend, dans cet ordre :

1. retour au contexte Comptes & contacts ;
2. titre `Cockpit intelligence` avec filet laiton court ;
3. bandeau d’identité du compte avec logo, métadonnées, documents et score ;
4. navigation horizontale des chapitres ;
5. frise de progression des grands blocs d’intelligence ;
6. contenu analytique de l’onglet actif ;
7. modules secondaires disposés selon la densité du contenu.

Cette structure peut évoluer, mais l’identité, la navigation, la frise et la hiérarchie éditoriale doivent rester reconnaissables.

---

## 3. Signatures visuelles validées

Les éléments suivants sont désormais constitutifs du pattern :

- typographie **Lato** pour les libellés et textes d’interface concernés ;
- libellés de section : `font-weight: 700`, `font-size: 12px`, `line-height: 16px`, `letter-spacing: 0.6px` ;
- filet laiton court sous le titre principal ;
- repère laiton net sur l’onglet actif ;
- encoches de chapitre sur la frise ;
- micro-transition discrète au survol de la frise ;
- filets laiton très fins dans les en-têtes bleu nuit ;
- bleu nuit comme couleur structurante ;
- laiton uniquement comme accent ;
- surfaces blanches, bordures nettes et ombres minimales.

Ne pas multiplier ces signatures ni en ajouter d’autres sans nécessité réelle.

---

## 4. Règles de composition

### En-tête de compte

- grande surface blanche bordée ;
- logo clairement isolé ;
- nom du compte dominant ;
- métadonnées compactes ;
- actions à droite ;
- score présenté dans une zone distincte mais non spectaculaire.

### Navigation

- onglets sobres et lisibles ;
- état actif signalé par le laiton, jamais par un aplat agressif ;
- aucune animation permanente ;
- largeur adaptée au contenu.

### Frise des chapitres

- fond bleu nuit continu ;
- chapitres distribués horizontalement ;
- icônes et encoches laiton ;
- titres courts en uppercase ;
- descriptions très brèves ;
- états disponibles ou à venir lisibles mais secondaires ;
- hover subtil, sans déplacement important ni effet 3D.

### Modules analytiques

- en-têtes bleu nuit avec filet laiton discret ;
- corps blanc ;
- bordures visibles ;
- densité adaptée aux données ;
- éviter les grilles de cartes uniformes lorsque le contenu appelle une composition différente.

---

## 5. Typographie

Utiliser la typographie réellement chargée dans le projet. Ne jamais substituer une police approchante à partir d’une capture.

Pour toute reprise ou extension :

1. inspecter les styles calculés de la page de référence ;
2. reprendre exactement `font-family`, poids, taille, `line-height` et `letter-spacing` ;
3. conserver la hiérarchie Lato validée ;
4. éviter toute nouvelle dépendance de police.

---

## 6. Contraintes

- aucune modification Supabase pour un besoin purement visuel ;
- aucune nouvelle dépendance graphique ;
- aucune ombre forte ;
- aucun gradient décoratif dominant ;
- aucun effet néon ;
- aucune animation permanente ;
- pas d’orange généralisé ;
- pas de duplication Desktop masquée en CSS sur Mobile ;
- ne pas transformer la page en tableau de bord de KPI génériques ;
- ne pas industrialiser prématurément un composant utilisé une seule fois.

---

## 7. Adaptation à d’autres Cockpits Intelligence

Lorsqu’un nouveau Cockpit Intelligence est créé :

- conserver le même langage visuel ;
- adapter la structure des modules aux données du compte ;
- préserver les quatre zones identitaires : en-tête, navigation, frise, contenu analytique ;
- accepter plusieurs compositions de page tant que le design system reste strictement identique ;
- produire un composant Mobile dédié si la page est rendue disponible sur Mobile.

Le design system fixe l’identité graphique, pas une unique mise en page immuable.

---

## 8. Activation agent

Lorsqu’un prompt mentionne `cockpit_intelligence_design`, l’agent doit :

1. lire ce document ;
2. lire `docs/design-systems/edito_bright_design.md` ;
3. inspecter `ClientIntelligenceDesktopView.tsx` et les styles associés dans `globals.css` ;
4. préserver les signatures visuelles validées ;
5. proposer ou implémenter la structure demandée sans modifier la logique métier ;
6. vérifier le rendu Desktop par capture ;
7. traiter Mobile séparément lorsque demandé.

---

## 9. Version

- **Version** : 1.0
- **Créée le** : 18 juillet 2026
- **Source validée** : Cockpit Intelligence CEGEMA après seconde passe visuelle
- **Propriétaire fonctionnel** : KREDO
