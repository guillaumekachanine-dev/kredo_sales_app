# Pré-chantier P0-A — Bouton « Simuler » du Cockpit Intelligence compte

**Statut :** prêt pour implémentation  
**Date :** 23/08/2026  
**Périmètre :** uniquement le bouton `Simuler` du Cockpit Intelligence mobile d’un compte

---

## 1. Baseline constatée

Dans `src/components/intelligence/IntelligenceFAB.tsx` :

- le Cockpit compte est rendu par `AccountMobileContent` ;
- `ACCOUNT_EDITORIAL_ACTIONS` contient actuellement `simulate` avec `href: "/finance"` ;
- le clic ferme donc le Cockpit et navigue vers Finance ;
- `recruit` reste également un simple deep-link et **ne doit pas être touché dans ce lot**.

Modules existants à réutiliser :

### Modélisation financière AT

- `src/features/financial-modeling/components/mobile/FinancialModelingMobileFlow.tsx`
- `src/features/financial-modeling/domain/financial-modeling-launch-preset.ts`

`FinancialModelingMobileFlow` accepte déjà un `initialPreset` avec `companyId` et `companyName` : le compte courant peut donc être présélectionné sans nouvelle architecture.

### Coûts des automatisations

- `src/components/automations/VeilleSimulatorCard.tsx`
- `src/components/automations/VeilleSimulatorModal.tsx`
- `src/lib/automations/veille-cadence.ts`
- calcul de baseline actuellement dans `src/lib/automations/automations-data.ts`

Le calcul actuel combine le coût moyen observé de `account_watch_refresh` et les cadences actives des comptes surveillés.

---

## 2. UX cible

```text
Cockpit Intelligence — compte courant
→ Simuler
→ Modale « Choisir une simulation »

[ Modélisation financière AT ]
Rentabilité d’une assistance technique

[ Coûts des automatisations ]
Impact du volume et de la cadence de veille

[ Scénarios financiers de revenus ]
Hypothèses gain / perte d’opportunités
Bientôt disponible
```

### Comportement

**AT**
- ferme la modale de sélection ;
- ouvre `FinancialModelingMobileFlow` ;
- préremplit `companyId` + `companyName` avec le compte courant.

**Coûts automatisations**
- ferme la modale de sélection ;
- charge la baseline réelle ;
- ouvre le simulateur de cadence existant.

**Scénarios financiers**
- carte visible mais désactivée ;
- badge / mention `Bientôt disponible` ;
- aucun backend ni calcul.

---

## 3. Architecture minimale

### `IntelligenceFAB.tsx`

Ajouter uniquement les états / handlers nécessaires :

- `simulationPickerOpen` ;
- `financialModelingOpen` ;
- `automationSimulatorOpen` ;
- éventuellement `automationBaseline` + état de chargement.

Modifier `simulate` pour qu’il déclenche le picker au lieu d’un `href`.

Ne pas modifier les autres actions du compte.

### Baseline simulateur de cadence

Ne pas copier la formule dans `IntelligenceFAB.tsx`.

Approche recommandée : extraire depuis `automations-data.ts` un helper serveur ciblé, par exemple :

```ts
getVeilleSimulatorBaseline(): Promise<VeilleSimulatorBaseline>
```

Il doit lire uniquement les données nécessaires au simulateur et être réutilisable par le dashboard Automatisations et le Cockpit.

Éviter de charger tout `getAutomationsDashboardData()` juste pour cette baseline.

### Data / Supabase

Aucune migration attendue.

Le module AT persiste déjà ses simulations dans `financial_models` / `financial_model_expenses`.
Le simulateur de cadence exploite déjà les données existantes de coûts IA et `account_watch_settings`.

### n8n

Aucun changement.

---

## 4. DoD

- `Simuler` n’est plus un lien vers `/finance` ;
- modale à 3 choix ;
- AT ouvre le flow mobile existant avec compte présélectionné ;
- Coûts automatisations ouvre le simulateur existant avec baseline réelle ;
- Scénarios revenus = placeholder explicite ;
- `Recruter` inchangé ;
- reste du Cockpit compte inchangé ;
- aucune migration Supabase ;
- aucun workflow n8n ;
- aucun nouveau moteur de calcul ;
- typecheck + tests ciblés verts.

---

# Prompt Gemini — P0-A Simuler

```md
@GitHub @Supabase

Implémente UNIQUEMENT le bouton **Simuler** du Cockpit Intelligence mobile d’un compte.

Baseline : dans `IntelligenceFAB.tsx`, `ACCOUNT_EDITORIAL_ACTIONS.simulate` pointe actuellement vers `/finance`. Ne touche pas aux autres actions ni au design/structure du Cockpit compte.

## Cible

Au clic sur **Simuler**, ouvrir une modale de sélection avec 3 cartes :

1. **Modélisation financière AT** → ouvrir le `FinancialModelingMobileFlow` existant avec `companyId` + `companyName` du compte courant via `initialPreset`.
2. **Coûts des automatisations** → ouvrir le simulateur de cadence existant (`VeilleSimulatorCard/Modal`) avec sa baseline réelle.
3. **Scénarios financiers de revenus** → placeholder désactivé `Bientôt disponible`. Ne rien développer derrière.

## Contraintes

- Réutiliser l’existant, aucun moteur parallèle.
- Pour la baseline cadence, ne duplique pas les formules : extrais si nécessaire un petit helper serveur réutilisable depuis `automations-data.ts`; ne charge pas tout le dashboard Automatisations inutilement.
- Aucun changement Supabase / RLS / n8n.
- Ne touche PAS au bouton `Recruter`.
- Ne refactore PAS le Cockpit compte hors strict nécessaire.
- Mobile : touch targets ≥ 44px, primitives KREDO existantes.

## Validation

Vérifie les 3 parcours, puis lance typecheck + tests ciblés. Termine par la liste des fichiers modifiés et les résultats de validation.
```
