# Architecture chromatique proposee

Cette architecture ne remplace pas les tokens globaux de production. Elle est declaree uniquement dans le scope du Design Lab:

- `.kredo-identity-lab[data-kredo-concept="a"]`
- `.kredo-identity-lab[data-kredo-concept="b"]`
- `.kredo-identity-lab[data-kredo-concept="c"]`

Les composants du lab consomment des variables semantiques. Les couleurs metier ne sont pas codees directement dans les composants.

## Familles

1. Identite de marque: signature KREDO, navigation, CTA, accent premium.
2. Surfaces et fonds: canvas, surface, raised, tint.
3. Texte et bordures: texte primaire, secondaire, muted, border default/strong.
4. Statuts fonctionnels: success, warning, danger, info, neutral.
5. Categories metier: domaines KREDO.
6. Data visualisation: series de graphiques et jauges.
7. Intelligence artificielle: cockpit, generation, confiance, signal IA.
8. Etats interactifs: hover, focus, selected, active, disabled, overlays.

## Variables de domaine

Variables a conserver pour toute future implementation:

```css
--color-domain-need
--color-domain-candidate
--color-domain-collaborator
--color-domain-account
--color-domain-recruitment
--color-domain-mission-at
--color-domain-fixed-project
--color-domain-finance
--color-domain-intelligence
--color-domain-ai
```

Regle centrale: les statuts ne doivent jamais devenir l'identite permanente d'un domaine. Par exemple, `danger` reste reserve aux erreurs, risques forts et destructions; il ne doit pas designer le recrutement ou la finance.

## Usages autorises et interdits

### Identite de marque

- Autorise: navigation, CTA primaire, selection forte, signature Cockpit.
- Interdit: differencier des statuts metier, colorer tous les KPI indistinctement.
- Surface maximale: 15 a 30% selon direction.

### Statuts

- Autorise: validation, warning, danger, info, variation positive/negative.
- Interdit: nom permanent d'un module, fond de page, navigation.
- Surface maximale: 8 a 12%, hors elements d'alerte critiques.

### Domaines

- Autorise: rail, dot, badge, underline d'onglet, header marker, jauge, mini-viz.
- Interdit: grand fond de page, texte long, etat d'erreur.
- Surface maximale: 8 a 12% en routine; 20% seulement pour Cockpit Intelligence.

### IA

- Autorise: anneau, halo, confiance, generation, recommandation, resultat IA.
- Interdit: mouvement permanent decoratif, rainbow non semantique, loading infini sur toute page.
- Surface maximale: 6 a 10%; moment exceptionnel seulement.

## Direction A: Cobalt Stratifie

| Nom | HEX | Role semantique | Foreground | Contraste | Usages autorises | Usages interdits | Surface max | Clair / sombre |
|---|---:|---|---:|---:|---|---|---:|---|
| Cobalt directeur | `#244FB3` | Marque, CTA, selection | `#F8FAFF` | 7.1:1 | boutons, liens, selection | statut metier | 20% | excellent clair, utilisable sombre |
| Navy conseil | `#13244B` | nav, headers analytiques | `#F8FAFF` | 13.2:1 | sidebar, fonds inverses | badges courants | 30% | sombre seulement |
| Brass franc | `#C99A2E` | accent premium | `#211700` | 7.0:1 | benchmark, details | warning seul | 8% | lisible clair, precieux sombre |
| Canvas lin | `#F4F1EA` | fond app | `#18223A` | 13.1:1 | page background | texte accent | 100% | clair |
| Surface ivoire | `#FFFDF8` | cartes, panneaux | `#18223A` | 14.0:1 | surfaces | nav sombre | 80% | clair |
| Bord graphite | `#D8DFEA` | separations | `#18223A` | 10.8:1 | borders, dividers | texte seul | 100% | clair |
| Succes foret | `#287657` | validation | `#FFFFFF` | 5.5:1 | positif | collaborateur permanent | 12% | bon clair/sombre |
| Warning ocre | `#B57B18` | attention | `#211700` | 5.1:1 | alertes | besoins | 10% | bon clair |
| Danger brique | `#B64242` | erreur, risque | `#FFFFFF` | 5.1:1 | risque critique | domaine | 8% | bon clair |
| Besoin ambre | `#E5A600` | besoins | `#231700` | 8.3:1 | rail besoin | warning | 10% | bon clair |
| Candidat pourpre | `#8E3FA7` | candidats | `#FFFFFF` | 5.9:1 | recrutement candidat | idee generale | 10% | bon clair/sombre |
| Collaborateur sauge | `#5F8750` | collaborateurs | `#FFFFFF` | 4.7:1 | equipe | success | 12% | bon clair |
| Compte cyan petrol | `#247B8D` | CRM | `#FFFFFF` | 4.8:1 | comptes/contacts | info statut | 12% | bon clair/sombre |
| Recrutement magenta froid | `#A33C78` | recrutement | `#FFFFFF` | 5.4:1 | pipeline recrutement | danger | 10% | bon |
| Mission AT bleu acier | `#3F6FA7` | AT | `#FFFFFF` | 5.1:1 | mission AT | brand primaire | 12% | bon |
| Forfait indigo | `#5A58A8` | forfait | `#FFFFFF` | 5.8:1 | projets forfaitaires | IA | 10% | bon |
| Finance olive | `#6B7D2F` | finance | `#FFFFFF` | 4.9:1 | finance | succes | 10% | bon |
| Intelligence cobalt nuit | `#173D89` | cockpit | `#F8FAFF` | 9.4:1 | cockpit | routine pages | 35% | sombre |
| AI prisme | `#6B5CF6` | IA | `#FFFFFF` | 5.5:1 | generation, confiance | module metier | 8% | bon |
| Dataviz ciel | `#4F8DD9` | serie 1 | `#FFFFFF` | decoratif | courbes | texte petit | 18% | data only |

## Direction B: Atelier Clair

| Nom | HEX | Role semantique | Foreground | Contraste | Usages autorises | Usages interdits | Surface max | Clair / sombre |
|---|---:|---|---:|---:|---|---|---:|---|
| Encre directoire | `#20304F` | titres, nav sobre | `#FFFFFF` | 12.2:1 | texte fort | statut | 25% | excellent |
| Bleu archive | `#315C9C` | marque secondaire | `#FFFFFF` | 6.2:1 | liens | toutes categories | 16% | bon |
| Cuivre doux | `#B8844A` | accent premium | `#1F160D` | 5.6:1 | selection chaude | warning | 8% | bon |
| Canvas papier | `#F7F4EF` | fond editorial | `#1B2435` | 13.7:1 | fond | nav inverse | 100% | clair |
| Surface porcelaine | `#FFFFFF` | panneaux | `#1B2435` | 15.1:1 | tables | decor massif | 90% | clair |
| Bord lin | `#DED8CE` | separations | `#1B2435` | 10.9:1 | dividers | texte | 100% | clair |
| Succes pin | `#2E7251` | validation | `#FFFFFF` | 5.8:1 | positif | domaine equipe | 10% | bon |
| Warning safran | `#A9711A` | surveillance | `#FFFFFF` | 4.9:1 | alertes | besoin | 8% | bon |
| Danger garance | `#A94040` | risque | `#FFFFFF` | 5.7:1 | danger | domaine | 8% | bon |
| Besoin moutarde | `#D19513` | besoins | `#211700` | 6.8:1 | rails besoin | warning | 10% | clair |
| Candidat prune | `#7C4D8D` | candidats | `#FFFFFF` | 5.8:1 | candidats | IA | 10% | bon |
| Collaborateur eucalyptus | `#4F8064` | collaborateurs | `#FFFFFF` | 4.8:1 | equipe | success | 12% | bon |
| Compte bleu gris | `#4E7F9B` | CRM | `#FFFFFF` | 4.5:1 | comptes | info statut | 12% | bon |
| Recrutement rose fumee | `#A85A73` | recrutement | `#FFFFFF` | 4.7:1 | recrutement | danger | 10% | bon |
| Mission AT denim | `#456F9C` | missions AT | `#FFFFFF` | 5.4:1 | AT | marque | 12% | bon |
| Forfait ardoise violette | `#62609B` | forfait | `#FFFFFF` | 5.0:1 | projets | IA | 10% | bon |
| Finance lichen | `#727C3A` | finance | `#FFFFFF` | 4.8:1 | finance | succes | 10% | bon |
| Intelligence horizon | `#2F5F8F` | cockpit IA clair | `#FFFFFF` | 6.6:1 | IA panels | nav globale | 20% | bon |
| AI laser froid | `#4E63D9` | actions IA | `#FFFFFF` | 5.3:1 | generation | domaine | 6% | bon |
| Dataviz terracotta | `#C4694A` | serie chaude | `#FFFFFF` | decoratif | data | texte petit | 14% | data only |

## Direction C: Signal Room

| Nom | HEX | Role semantique | Foreground | Contraste | Usages autorises | Usages interdits | Surface max | Clair / sombre |
|---|---:|---|---:|---:|---|---|---:|---|
| Cobalt electrique | `#3D6DF2` | CTA, selection | `#FFFFFF` | 4.7:1 | action | texte petit sur clair | 15% | sombre |
| Nuit operational | `#081322` | canvas sombre | `#EAF1FF` | 16.1:1 | cockpit | formulaires longs seuls | 100% | sombre |
| Alliage or | `#E3B94A` | accent premium | `#171000` | 9.4:1 | signal rare | warning seul | 8% | tres bon |
| Canvas graphite | `#0D1726` | fond cockpit | `#EAF1FF` | 14.3:1 | vues analytiques | tout produit sans validation | 100% | sombre |
| Surface carbone | `#111D2F` | panneaux | `#EAF1FF` | 12.8:1 | panels | surfaces longues de saisie | 85% | sombre |
| Bord phosphore | `#263854` | bordures | `#EAF1FF` | 8.8:1 | grid, dividers | texte | 100% | sombre |
| Succes neon foret | `#42B883` | validation | `#06120C` | 8.1:1 | positif | collaborateur | 10% | sombre |
| Warning ion | `#F1B642` | attention | `#171000` | 8.7:1 | warning | besoin | 8% | sombre |
| Danger plasma | `#F15C64` | risque | `#160305` | 5.9:1 | danger | domaine | 8% | sombre |
| Besoin sodium | `#F2B33D` | besoins | `#171000` | 8.6:1 | besoins | warning | 10% | sombre |
| Candidat violet signal | `#B06CFF` | candidats | `#13051F` | 6.8:1 | candidats | IA | 9% | sombre |
| Collaborateur menthe | `#58CFA2` | collaborateurs | `#06120C` | 9.8:1 | equipe | success | 10% | sombre |
| Compte cyan radar | `#3CC7D6` | CRM | `#031316` | 10.1:1 | comptes | info statut | 10% | sombre |
| Recrutement rose ion | `#FF7DA8` | recrutement | `#18040C` | 7.3:1 | recrutement | danger | 8% | sombre |
| Mission AT azur | `#63A4FF` | AT | `#041024` | 7.3:1 | AT | brand | 10% | sombre |
| Forfait pervenche | `#8D8BFF` | forfait | `#08072A` | 6.7:1 | projets | IA | 9% | sombre |
| Finance lime sourd | `#B9D85A` | finance | `#101702` | 10.4:1 | finance | success | 8% | sombre |
| Intelligence ultraviolet | `#6F7DFF` | cockpit | `#FFFFFF` | 4.4:1 large | IA hero | texte petit | 20% | sombre |
| AI fusion | `#39D9F2` | generation IA | `#031316` | 11.2:1 | IA | domaine | 8% | sombre |
| Dataviz laser | `#FFB86B` | serie accent | `#171000` | 8.7:1 | data | fond page | 12% | sombre |

## Etats interactifs

Variables recommandees:

```css
--motion-duration-fast: 120ms;
--motion-duration-standard: 180ms;
--motion-duration-emphasis: 280ms;
--shadow-interactive;
--shadow-panel;
--shadow-selected;
--focus-ring-domain;
```

Regles:

- Hover: elevation 1 a 2px, border domain 35 a 50%, surface mix 6 a 10%.
- Selected: border domain 100%, rail visible, shadow selected faible.
- Active: scale 0.99 ou retour a elevation zero, jamais de layout shift.
- Disabled: opacity 45 a 50%, pas de mouvement, pas de contraste critique.
- Focus: anneau visible 3px, offset 2px, couleur domain ou brand selon contexte.
