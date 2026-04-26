# 🗺️ STAYLO — Master Roadmap

> **La ligne à suivre**, du jour 1 au lancement public à 500 hôtels.
> Mis à jour : **2026-04-26**.

---

## 🎯 Vision en 1 phrase

Une plateforme de réservation détenue par les hôteliers, qui plafonne la commission à **10%**, paie l'hôtelier dans **l'heure** suivant le check-out, et inclut gratuitement un **PMS + Channel Manager** universel.

---

## 📍 Où on en est aujourd'hui (snapshot)

```
████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ~50%
                            ▲
                       (you are here)
```

| Domaine | Avant audit | Aujourd'hui |
|---|---|---|
| Pages marketing publiques | 80% | 80% |
| Auth + base utilisateur | 70% | 75% (i18n nav.book) |
| Inscription hôtels (`/submit`) | 70% | 80% (multi-currency + 17 colonnes ajoutées) |
| Booking engine public (`/ota`) | 30% | 60% (extraction du dashboard, mocks supprimés) |
| Paiement entrant (Stripe) | 30% | **100%** ✅ (chantier #1) |
| Payout aux hôtels (T+1h) | 0% | 50% (rails posés, trigger questionnaire à venir) |
| Reviews / questionnaire | 0% | 0% |
| KYC / docs upload | 5% | 5% |
| Dashboards (hôtelier + admin) | 50% | 55% (page Banking ajoutée) |
| **Channel Manager** | 0% | 0% (planifié M9) |

**MVP launchable score** : **35% → 50%** depuis le début de la session.

---

## 🛣️ Les 6 chantiers du plan

| # | Chantier | Statut | Effort | Dépend de |
|---|---|---|---|---|
| **#1** | Pipeline paiement (Stripe Connect + escrow) | ✅ **DONE** | 3-4 sem (fait en quelques heures) | — |
| **#2** | Questionnaire post-checkout + release escrow trigger | ⏳ À faire | 2 sem | #1 |
| **#3** | Remplacer les mocks (HotelGrid, Splash, Testimonials, PMS) | ⏳ À faire | 1 sem | — |
| **#4** | Email transactionnel (Resend) | ⏳ À faire | 4-5 j | — |
| **#5** | Audit sécurité + RLS strict + email verification | ⏳ À faire | 3 j | — |
| **#6** | **Channel Manager universel gratuit** (Booking, Airbnb, Agoda, Expedia, iCal) | 🔮 Post-MVP | 6-8 sem | #1, #2 |

### Détails du chantier #1 (référence) — fait en 4 sous-commits

| Sous-commit | Hash | Contenu |
|---|---|---|
| 1.1 | `e480855` | DB schema (stripe_accounts, escrow columns, RPCs) |
| 1.2 | `e4ae2a0` | 5 edge functions Stripe + 3 helpers |
| 1.3 | `a2b27ed` | Page `/dashboard/banking` + currency picker |
| 1.4 | `ea5d85f` | Setup guide + .env.example + CLAUDE.md |
| Patches | `7b69d67`, `dddd0d6` | transfer.reversed + fix 401 |

---

## 📅 Séquençage recommandé (de demain à lancement)

```
SEMAINE 1                    SEMAINE 2-3              SEMAINE 4
├─ #5 Sécurité (3 j)         ├─ #2 Questionnaire     ├─ #2 fin (1 sem)
│  └─ Email verif obligatoire│   post-checkout (2 sem)│
├─ #4 Email Resend (5 j)     │                        ├─ Test E2E complet
└─ #3 Mocks (en parallèle)   │                        └─ Beta avec 5 hôtels KP

SEMAINE 5-6                  SEMAINE 7-8              SEMAINE 9+
├─ Onboarding 20-50 hôtels   ├─ Outreach Koh Phangan ├─ Lancement public
│  via outreach manuel       │   associations (top   │   100 hôtels viables
├─ Itération sur feedback    │   down avec pitch PDF) ├─ Démarrage chantier #6
└─ Réparation des bugs       └─ 100 hôtels objectif   │   Channel Manager
```

**Cible MVP lançable** : **fin de la semaine 4** (~4 semaines de travail solo focused).
**Cible 500 hôtels Thailande** (= condition lancement public) : **M5-M6**.

---

## 🎚️ Priorisation par décision

```
                 ┌─ Tu veux tester E2E    →  Maintenant (ton tour)
                 │   le chantier #1
                 │
                 ├─ Tu veux UN gros effet  →  #3 Mocks
                 │   visible immédiat        (1 sem)
                 │
TU ARRIVES À ────┼─ Tu veux débloquer la   →  #4 Emails
ce point         │   communication           (4-5 j)
                 │
                 ├─ Tu veux fermer les     →  #5 Sécurité
                 │   portes ouvertes          (3 j)
                 │
                 └─ Tu veux la killer      →  #2 Questionnaire
                    feature pitch            (2 sem)
```

**Ma recommandation** : **#5 → #4 → #3 → #2 → #6**.
Pourquoi : sécurité d'abord (3 j), puis on débloque la communication (4-5 j), puis on retire les mocks pour la crédibilité (1 sem), puis on construit la killer feature (2 sem), puis Channel Manager une fois en croisière.

---

## 🏁 Milestones / KPIs à viser

| Milestone | Critère de succès | Date cible |
|---|---|---|
| **M1 — Beta privée** | 5 hôtels onboardés + 1 vraie réservation E2E | Sem 4 |
| **M2 — 100 hôtels Koh Phangan** | 100 fiches `live` + 50 ayant complété Stripe Connect | M3 |
| **M3 — 500 hôtels Thailande** | 500 fiches `live` (= seuil de lancement public) | M5-M6 |
| **M4 — 1000 réservations cumulées** | preuve de PMF + dataset reviews exploitables | M9 |
| **M5 — Channel Manager v1** | 6 OTAs synchronisées : Booking, Airbnb, Agoda, Expedia, Hostelworld, Trip.com | M12 |
| **M6 — Alpha share round closed** | $1M levés (1000 shares Alpha) | M9-M12 |
| **M7 — Lancement V2 (Eat)** | Restaurants + beach clubs | M15-M18 |

---

## 🚨 Risques structurels à NE PAS oublier

À adresser avant ouverture publique des 500 hôtels :

1. **Crédibilité** — `HotelGrid.jsx`, `Splash.jsx`, `Testimonials.jsx` montrent encore du fake → chantier #3
2. **Sécurité** — RLS `referrals` permissive (anon read), email verification non-obligatoire → chantier #5
3. **Légal** — pas de CGU/CGV/Privacy Policy publiques → bloquant légal pour traiter du paiement
4. **Operations** — pas d'email = pas de notification booking confirmée → chantier #4
5. **Cron** — auto-release escrow pas encore configuré (T+24h ne tournera pas tout seul) → étape 8 du `STRIPE_SETUP.md`

---

## 🧮 Tableau de bord pour suivre toi-même

Crée un fichier perso `STAYLO/STATUS.md` (gitignoré) où tu coches au fur et à mesure :

```markdown
# Mon avancement personnel

## Semaine du 28 avril
- [ ] Test E2E Stripe (hôtelier + guest)
- [ ] Configurer cron release-escrow
- [ ] Démarrer chantier #5
- [ ] Préparer outreach 5 premiers hôtels KP

## Semaine du 5 mai
- [ ] Finir chantier #5
- [ ] Démarrer chantier #4
- ...
```

---

## 🔗 Documents de référence

| Document | Usage |
|---|---|
| [`CLAUDE.md`](../CLAUDE.md) | Vision produit + tech stack + design system |
| [`STAYLO/STRIPE_SETUP.md`](STRIPE_SETUP.md) | Setup Stripe step-by-step |
| [`STAYLO/PITCH_HOTELIER_*.pdf`](.) | Pitch one-pager FR/EN/TH |
| [`STAYLO/staylo_letter_of_intent.docx`](.) | LOI à signer |
| [`STAYLO/staylo_founding_partner_contract.docx`](.) | Contrat Founding Partner |
| `staylo_osm_collector.py` | Collecteur OSM (543 hôtels Koh Phangan) |
| `staylo_hotels/koh_phangan_associations.csv` | 7 associations contacts |

---

## 🎬 Prochaine action immédiate

**Cocher** quand fait :

- [x] ✅ Chantier #1 code complet (4 commits + 2 patches)
- [x] ✅ Migration DB appliquée
- [x] ✅ Edge functions déployées
- [x] ✅ Secrets Stripe configurés
- [ ] ⏳ **Tester E2E** : onboarding hôtelier + booking guest avec carte test `4242 4242 4242 4242`
- [ ] ⏳ Configurer cron release-escrow (GitHub Actions / Vercel Cron / cron-job.org — voir étape 8 STRIPE_SETUP.md)
- [ ] ⏳ Choisir prochain chantier (#5 recommandé)
