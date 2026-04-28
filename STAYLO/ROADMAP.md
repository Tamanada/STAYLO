# 🗺️ STAYLO — Master Roadmap

> **La ligne à suivre**, du jour 1 au lancement public à 500 hôtels et au-delà.
> Aligné sur le **STAYLO IP Protection Document** (STAYLO-IP-2025-001),
> SHA-256 anchored to Bitcoin blockchain via originstamp.org on **2026-04-25**.
> Dernière mise à jour : **2026-04-28**.

---

## 🎯 Vision en 1 phrase

Plateforme de réservation **coopérative** détenue par les hôteliers,
**Bitcoin-native** pour les paiements et la treasury, **gouvernée via DAO
sur Solana**, qui plafonne la commission à **10%** et paie l'hôtelier
dans **l'heure** suivant le check-out.

---

## 📍 Snapshot actuel (2026-04-28)

```
████████████████████████████░░░░░░░░░░  ~78% MVP-launchable
                            ▲
                       (you are here)
```

| Domaine | Statut |
|---|---|
| Pages marketing publiques | 80% |
| Auth + base utilisateur | 75% (manque OAuth ?next + email verif) |
| Inscription hôtels (`/submit`) | 80% (multi-currency + 17 colonnes) |
| Booking engine public (`/ota`) | 75% (search avec region aliases) |
| Paiement entrant Stripe | **100%** ✅ chantier #1 |
| Guest pays processing fees | **100%** ✅ chantier #1.5 |
| Booking refs STY-XXXXXX | **100%** ✅ |
| Lightning crypto (MockProvider) | **100%** ✅ chantier #9 |
| Ambassador 2% BTC commission | **100%** ✅ chantier #10 (DB-backed, on-chain prévu #12.4) |
| Real data (mocks remplacés) | **100%** ✅ chantier #3 |
| Region aliases search | **100%** ✅ |
| Payout aux hôtels (T+1h via questionnaire) | 50% (rails posés, trigger questionnaire à venir) |
| Reviews / questionnaire post-checkout | 0% (chantier #2) |
| Email transactionnel | 0% (chantier #4) |
| KYC / docs upload | 5% (chantier #5 partiel) |
| **$STAY token sur Solana** | **0%** (chantier #12, gros morceau) |
| **DAO governance Solana** | **0%** (chantier #13) |
| **Member→Member referral** | **0%** (chantier #14) |
| **NFT booking proof** | **0%** (chantier #15) |

---

## 🛣️ Liste complète des chantiers

### ✅ Chantiers MVP (terminés ou en cours)

| # | Chantier | Statut | Effort | Dépend de |
|---|---|---|---|---|
| **#1** | Pipeline paiement Stripe Connect + escrow | ✅ DONE | 3-4 sem | — |
| **#1.5** | Guest pays processing fees model | ✅ DONE | 1 j | #1 |
| Ref | Booking refs STY-XXXXXX | ✅ DONE | 1 j | — |
| UX | MyBookings tabs guest/hôtelier | ✅ DONE | 1 j | — |
| **#2** | Questionnaire post-checkout + release escrow trigger | ⏳ À faire | 2 sem | #1 |
| **#3** | Remplacer les mocks (HotelGrid, Splash, Testimonials) | ✅ DONE | 1 sem | — |
| **#4** | Email transactionnel (Resend) | ⏳ À faire | 4-5 j | — |
| **#5** | Audit sécurité + RLS strict + email verification | ⏳ À faire | 3 j | — |
| **#6** | Channel Manager universel gratuit | 🔮 Post-MVP | 6-8 sem | #1, #2 |
| **#7** | Media Management (photos/videos upload, reorder) | ⏳ À faire | 1 sem | — |
| **#8** | Social Media Auto-Share (Instagram, TikTok) | 🔮 Post-MVP | 2-3 sem + delays Meta | — |
| **#9** | Crypto Lightning payments (MockProvider) | ✅ DONE | 5-7 j | — |
| **#10** | Ambassador 2% BTC commissions (DB-backed) | ✅ DONE | 2 j | #9 |
| Doc | CLAUDE.md + ROADMAP alignés sur IP doc | ✅ DONE | 30 min | — |

### 🆕 Chantiers Solana (post-IP doc, gros morceau)

| # | Chantier | Statut | Effort | Dépend de |
|---|---|---|---|---|
| **#11** | Doc alignment (this commit) | ✅ DONE | 30 min | IP doc |
| **#12** | $STAY SPL token (10B fixed, halving 4y, Raydium DEX) | 🔮 Post-MVP | 3 sem | Singapore Pte Ltd |
| **#13** | DAO Governance on Solana (Realms, 1 prop = 1 vote) | 🔮 Post-MVP | 2 sem | #12 |
| **#14** | Member→Member referral ($STAY reward) | ⏳ À faire | 3 j | #12 |
| **#15** | NFT booking proof (Metaplex Solana) | 🔮 Post-MVP | 5 j | #12 |

### 🛠️ Détails du chantier #12 — $STAY token

| Sous-commit | Effort |
|---|---|
| 12.1 — Solana program (Anchor) : SPL token mint avec 10B fixed supply | 5-7 j |
| 12.2 — Earn pool logic (10 STAY/night avec halving every 4y) | 3 j |
| 12.3 — Burn mechanism (10-15% commission revenue → buy & burn) | 2 j |
| 12.4 — Migrate ambassador rewards on-chain (chantier #10 → SPL) | 2 j |
| 12.5 — Frontend: $STAY balance widget partout | 3 j |
| 12.6 — Raydium DEX listing (TGE M07) | 2 j setup |
| **Total #12** | **~3 sem** |

### 🛠️ Détails du chantier #13 — DAO

| Sous-commit | Effort |
|---|---|
| 13.1 — SPL Governance program (Realms framework) | 3-4 j |
| 13.2 — 1 property = 1 vote logic (eligibility ≥1k $STAY) | 2 j |
| 13.3 — Quorum 30% + supermajority 90% rules | 2 j |
| 13.4 — Frontend voting UI | 5 j |
| **Total #13** | **~2 sem** |

---

## 📅 Séquençage recommandé (chronologique)

```
SEMAINE 1 (now)              SEMAINE 2-3              MOIS 2
├─ Doc alignment ✅          ├─ #5 Sécurité (3 j)     ├─ #2 Questionnaire post-checkout (2 sem)
├─ #5 Sécurité  (3 j)        ├─ #4 Email Resend (5 j) │  → débloque vrai T+1h payout
└─ Test E2E sur prod         └─ #7 Media Management    │
                                  (photos/videos, 1 sem)

MOIS 3                       MOIS 4-5                 MOIS 6+
├─ Outreach 100 hôtels KP    ├─ Singapore Pte Ltd     ├─ #12 $STAY token (3 sem)
├─ Iteration feedback        │  incorporation         │  → TGE M07
├─ Cron release-escrow setup ├─ BTCPay self-hosted    ├─ #13 DAO governance (2 sem)
└─ Cron ambassador-payout    │  (remplace MockProvider)├─ Lancement public 500 hôtels
                             └─ Migration vers prod    └─ #6 Channel Manager
                                  Stripe Live          
```

**Cible MVP launchable** : **Sem 3-4** (~3 semaines de travail solo focused).
**Cible 500 hôtels Thailand** (= condition lancement public) : **M5-M6**.
**Cible $STAY TGE** (M07 post-Alpha funding) : **~M8 réel**.

---

## 🏁 Milestones / KPIs

| Milestone | Critère de succès | Date cible |
|---|---|---|
| **M1 — Beta privée** | 5 hôtels onboardés + 1 vraie réservation E2E | Sem 4 |
| **M2 — 100 hôtels Koh Phangan** | 100 fiches `live` + 50 ayant complété Stripe Connect | M3 |
| **M3 — 400 Founding Partners KP** *(per IP doc)* | 400 FP signés sur Koh Phangan | M6 |
| **M4 — 2,000 hôtels** | Expansion TH (Samui, Phuket, Krabi, Chiang Mai) | M12 |
| **M5 — $STAY TGE** | Token live sur Raydium, DEX liquidity 500M $STAY | M07 post-Alpha funding |
| **M6 — DAO live** | Premier vote on-chain | M10 |
| **M7 — Channel Manager v1** | 6 OTAs synchronisées | M12 |
| **M8 — 5,000 hôtels SEA** | Thailand + 6 SEA countries | M24 |
| **M9 — World Round** | 16,649 hôtels mondialement, BTC treasury ~$149.7M | M36 |

---

## 🚨 Risques structurels

À adresser AVANT ouverture publique des 500 hôtels :

1. **Crédibilité** — résolu par chantier #3 ✅
2. **Sécurité** — RLS + email verif + OAuth → chantier #5 (3 j)
3. **Légal** — pas de CGU/CGV/Privacy Policy publiques → bloquant légal
4. **Operations** — pas d'email = pas de notifs → chantier #4
5. **Cron** — auto-release escrow + ambassador payout pas encore configurés
6. **Singapore Pte Ltd** — incorporation pendante (M01-M02 dans IP doc)

---

## 🔗 Documents de référence (canonical sources of truth)

| Document | Usage |
|---|---|
| **IP Protection Document** (originstamp.org, 2026-04-25) | Constitutional source — tokenomics, governance, share structure, brand identity |
| [`CLAUDE.md`](../CLAUDE.md) | Tech-side reference — stack, patterns, schema |
| [`STAYLO/STRIPE_SETUP.md`](STRIPE_SETUP.md) | Setup Stripe Connect step-by-step |
| [`STAYLO/CRYPTO_SETUP.md`](CRYPTO_SETUP.md) | Setup Lightning provider (Mock → BTCPay) |
| [`STAYLO/PITCH_HOTELIER_*.pdf`](.) | Pitch one-pager FR/EN/TH |
| [`STAYLO/staylo_letter_of_intent.docx`](.) | LOI à signer |
| [`STAYLO/staylo_founding_partner_contract.docx`](.) | Contrat Founding Partner |

---

## 🎬 Prochaine action immédiate

- [x] ✅ Chantier #1 Stripe Connect
- [x] ✅ Chantier #1.5 Guest pays fees
- [x] ✅ Chantier #3 Remplacer mocks
- [x] ✅ Chantier #9 Lightning crypto
- [x] ✅ Chantier #10 Ambassador BTC rewards
- [x] ✅ Doc alignment sur IP doc (chantier #11)
- [ ] 🟢 **Chantier #5 — Sécurité (3 jours)** ← **EN COURS**
- [ ] Chantier #4 — Email Resend (4-5 jours)
- [ ] Chantier #2 — Questionnaire post-checkout (2 sem)
- [ ] *Singapore Pte Ltd incorporation*
- [ ] Chantier #12 — $STAY token sur Solana (3 sem, post-incorporation)
- [ ] Chantier #13 — DAO Governance (2 sem)

---

## 📊 Progression session du 26-28 avril 2026

**+18 commits** poussés. **MVP score : 35% → 78%**. Stack hybride
**Bitcoin + Solana** documentée et alignée sur IP. STAYLO est passé
de "vitrine marketing" à "vraie plateforme avec paiements live".

Prochain palier : **sécurité production** → **emails** → **incorporation
Singapore** → **$STAY TGE**.
