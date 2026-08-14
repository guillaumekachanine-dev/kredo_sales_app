# E2 — Journal de revalidation · `seg-parfumerie-compositions-b2b`

Run du **2026-08-14**. Ce journal consigne les requêtes **réellement jouées** pendant E2. Il
existe parce que `05-ETAPE-E2` §1 impose de revalider chaque échéance au jour du run : sans
trace, la revalidation n'est pas opposable, et `revalides_le` n'est qu'une déclaration.

---

## A1 — Identité France · registre Sirene / INSEE

Façade open data `recherche-entreprises.api.gouv.fr`. Aucune clé, aucune donnée personnelle.
⚠️ `entreprise.api.gouv.fr` n'a **pas** été utilisée : elle est réservée aux administrations.

Passe 1 — un appel par compte, sur la dénomination portée par le CRM :

```
https://recherche-entreprises.api.gouv.fr/search?q=Robertet&per_page=10
https://recherche-entreprises.api.gouv.fr/search?q=Argeville&per_page=10
https://recherche-entreprises.api.gouv.fr/search?q=Aromatech%20Group&per_page=10
https://recherche-entreprises.api.gouv.fr/search?q=Expressions%20Parfumees&per_page=10
https://recherche-entreprises.api.gouv.fr/search?q=Jean%20Niel&per_page=10
https://recherche-entreprises.api.gouv.fr/search?q=PARFEX&per_page=10
https://recherche-entreprises.api.gouv.fr/search?q=Payan%20Bertrand&per_page=10
```

**Trouvé** : 5 résolutions nettes (Robertet 415750660 · Argeville 415550227 · Expressions
Parfumées 323871426 · PARFEX 333974657 · Payan Bertrand 415550029), toutes en NAF 20.53Z.
Les SIREN d'Argeville et d'Expressions Parfumées étaient déjà en base : le registre les
**confirme à l'identique**, ce qui vaut contrôle croisé de la méthode.

**Non trouvé** : `Aromatech Group` → aucun établissement actif. `Jean Niel` → trois homonymes
à similarité 1,0, aucun dans la parfumerie.

Passe 2 — levée de doute sur les deux comptes non résolus :

```
https://recherche-entreprises.api.gouv.fr/search?q=Aromatech&per_page=10
https://recherche-entreprises.api.gouv.fr/search?q=Jean%20Niel%20parfums&per_page=10
https://recherche-entreprises.api.gouv.fr/search?q=Jean%20Niel%20Grasse&per_page=10
```

**Trouvé** : `AROMATECH` 339899486 (Saint-Cézaire-sur-Siagne, créée 1987) et `SOC NIEL JEAN`
415750306 (Grasse, créée 1957), toutes deux en NAF 20.53Z.
**Non trouvé** : `Jean Niel parfums` ne rend rien — la dénomination d'usage n'est pas au registre.

Passe 3 — vérification par SIREN des deux résolutions arbitrées :

```
https://recherche-entreprises.api.gouv.fr/search?q=415750306&per_page=1
https://recherche-entreprises.api.gouv.fr/search?q=339899486&per_page=1
```

**Trouvé** : les deux fiches confirment NAF 20.53Z, siège en Alpes-Maritimes, état
administratif `A`. Aucun effectif retenu — le registre ne publie qu'une **tranche**.

---

## S7 — Revalidation de l'échéance pivot · IFRA

Le macro `parfumerie-aromes` porte 5 items réglementaires, **tous sans `source_url`**. Un seul
est daté dans le futur : « IFRA 52e Amendement, 2026-12-31 ». C'est celui qui porte le motif
d'appel, donc le seul revalidé ici.

```
site:ifrafragrance.org IFRA 52nd Amendment Standards compliance deadline 2026 official
https://ifrafragrance.org/standards/amendments
https://ifrafragrance.org/latest-updates/ifra-news/ifra-52nd-amendment-consultation-closed
https://ifrafragrance.org/initiatives-positions/safe-use-fragrance-science/ifra-standards
```

**Trouvé, et ça contredit la base.** La consultation publique du 52e amendement s'est close le
**12/06/2026** ; la notification formelle est **attendue fin novembre 2026** (page publiée le
15/06/2026). Les délais de conformité ne sont pas des dates fixes : IFRA les exprime **en
relatif à la notification** — standard prohibitif +2 mois pour les créations nouvelles et
+13 mois pour les existantes, standard restrictif ou de spécification +9 et +28 mois.

La `deadline_date = 2026-12-31` en base n'est donc **pas une échéance de conformité**, et elle
n'a pas de source. L'échéance pivot retenue est la **notification elle-même**, annoncée pour
fin novembre 2026, avec sa réserve : elle se prononce « attendue fin novembre », jamais « le
30 novembre ».

**Non revalidé, et déclaré comme tel** : les quatre autres items du macro (IFRA 51, CSRD,
Règlement UE 2023/1545, REACH). Trois d'entre eux portent une échéance **dépassée** sans que
rien ne le signale — le règlement 2023/1545 a expiré 14 jours avant ce run tout en restant
marqué `critical` et `is_commercial_window = true`.

---

## A7 — Mesure du gisement avant exécution

`05-ETAPE-E2` §4.3 : mesurer la densité du gisement **avant** de lancer A7, faute de quoi le
corpus annonce un zéro sans savoir s'il vient du canal ou du secteur. Deux appels suffisent ;
cinq ont été joués pour tenir aussi le témoin.

```
GET /offres/search?secteurActivite=20
GET /offres/search?secteurActivite=20&domaine=M18
GET /offres/search?secteurActivite=20&departement=06
GET /offres/search?secteurActivite=20&departement=06&domaine=M18
GET /offres/search?departement=06&domaine=M18
```

API France Travail « Offres d'emploi v2 », comptages lus dans l'en-tête `Content-Range`.

**Trouvé** : 367 offres dans la division NAF 20 (chimie) en France, dont **4 seulement** au
domaine ROME M18 — une densité SI de 1,1 %. L'enveloppe exacte du segment (division 20,
département 06) rend 13 offres et **0 offre SI**.

**Témoin** : le département 06 porte 173 offres SI tous secteurs confondus. Le bassin n'est pas
mort ; c'est la chimie qui ne recrute pas son SI en propre.

**Conclusion** : absence de gisement, pas échec de mesure. A7 ne rendra rien sur ce segment, et
il a coûté cinq appels de le savoir au lieu d'une pagination complète sur sept comptes.
