# TM30 — Thai Immigration Reporting

> Notification of staying in Thailand (TM30) — required by every accommodation
> housing foreign nationals, within 24 hours of arrival.

Legal basis: Immigration Act B.E. 2522 (1979), Section 38.

---

## Is automated submission to the Immigration site possible?

**Short answer: yes, in three phases, the first of which we ship today.**

### Phase 1 — CSV export (now, manual portal upload)

The Immigration Bureau's TM30 portal accepts **batch CSV uploads** from
hoteliers via:
- Web portal: https://extranet.immigration.go.th/
- Hotelier logs in once with their establishment account
- Uploads a CSV with one row per guest-night
- Submission is acknowledged within minutes; receipt downloadable

**STAYLO's role today**: collect ALL the required fields per guest, then
generate a TM30-compatible CSV on demand. Hotelier downloads + uploads
manually. No API integration — nothing risky, no legal exposure.

This is what the present commit enables.

### Phase 2 — Browser automation (3-6 months)

Once we have 10+ live hotels actively submitting daily TM30s, build a
Playwright/Puppeteer-based agent that:
1. Logs into the TM30 portal as the hotelier (using stored credentials,
   user-supplied + per-property)
2. Uploads the CSV programmatically
3. Captures the receipt PDF and stores it in `bookings.tm30_receipt_url`

Pros: no API approval needed, ships in days.
Cons: fragile (any portal UI change breaks it), credentials-in-DB risk
(mitigated by encryption + per-property hotelier consent).

### Phase 3 — Official API access (6-18 months)

The Immigration Bureau has a private API (the same one big chains and
established PMS like Cloudbeds and SiteMinder use). To get access:

1. STAYLO must be registered as a **legal entity in Thailand** (a Thai
   limited company or branch — David is launching there, so this is
   coming anyway)
2. Apply through the Immigration Bureau's IT division (Bangkok HQ)
3. Demonstrate volume: 50+ active properties, signed compliance
   undertaking, security audit
4. Sign the data-handling MOU
5. Get production API credentials

Once obtained: each guest registration in STAYLO triggers an
edge function that POSTs the TM30 record straight to Immigration —
zero-touch for the hotelier. The receipt is stored automatically.

This is the holy grail: STAYLO becomes the only OTA-replacement in
Thailand with native immigration compliance built in. Massive
differentiator + reason for existing PMS users to switch.

---

## What the Immigration Bureau requires per guest-stay

Mandatory:
- **Family name** (last_name) — Latin script
- **Given name** (first_name) — Latin script
- **Sex** — M / F
- **Date of birth** — YYYY-MM-DD
- **Nationality** — ISO 3166-1 alpha-2 (FR, GB, DE, US, JP...)
- **Passport number** — exact characters, no spaces
- **Type of travel document** — usually "passport" but can be national ID for ASEAN
- **Date of arrival in Thailand** (passport entry stamp)
- **Date of arrival at the establishment** (= booking.check_in)
- **Date of departure from the establishment** (= booking.check_out)
- **Establishment ID** — the hotel's TM30 license number

Recommended (avoids follow-up questions from Immigration):
- **Visa type** (TR / NON-B / Education / Retirement / TR-VOA)
- **Visa number**
- **Port of entry** (BKK / DMK / HKT / CNX / KBV...)
- **Phone number**

NOT required:
- Email
- Address in home country (used to be, no longer enforced for short stays)
- Photo of passport

---

## What we collect today (post-commit)

| Field | Source | Status |
|---|---|---|
| Family name | `booking_guests.last_name` | ✓ |
| Given name | `booking_guests.first_name` | ✓ |
| Sex | `booking_guests.sex` | ✓ NEW |
| Date of birth | `booking_guests.date_of_birth` | ✓ existing, now surfaced in UI |
| Nationality | `booking_guests.nationality` | ✓ |
| Passport number | `booking_guests.passport_number` | ✓ |
| Travel doc type | `booking_guests.travel_doc_type` | ✓ NEW (default 'passport') |
| Arrival in Thailand | `booking_guests.thailand_arrival_date` | ✓ NEW |
| Port of entry | `booking_guests.thailand_port_of_entry` | ✓ NEW |
| Visa type | `booking_guests.visa_type` | ✓ NEW |
| Visa number | `booking_guests.visa_number` | ✓ NEW |
| Phone | `bookings.guest_phone` | ✓ existing |
| Check-in / out | `bookings.check_in` / `check_out` | ✓ existing |
| Establishment ID | `properties.tm30_license_number` | ✓ NEW |

**Coverage = 100%** of the mandatory fields + 100% of the recommended ones.

---

## CSV format (when we ship the export)

The Immigration Bureau publishes a sample CSV template — column order
matters. Approximate spec:

```
HotelID,GuestSeq,FamilyName,GivenName,Sex,DOB,Nationality,PassportNo,
DocType,ThailandArrival,PortOfEntry,VisaType,VisaNo,CheckIn,CheckOut,Phone
```

One row per guest-night-stay. We'll build the export endpoint at
`/admin/tm30/export?property_id=X&date=Y` returning a CSV ready to
upload.

---

## What the hotelier does daily (Phase 1 workflow)

1. End of day: visit `/dashboard/property/{id}/tm30`
2. Click "Generate today's TM30 report"
3. STAYLO produces a CSV with all foreign guests checked in today
4. Hotelier opens the Immigration portal in another tab
5. Logs in, clicks "Bulk upload", selects the CSV
6. Submits → receipt
7. (Optional) drops the receipt PDF back into STAYLO so it's archived
   alongside the bookings

Total time: ~3 minutes per day, regardless of how many guests.

Once Phase 2 ships, this becomes 1 click. Once Phase 3 ships, it's
zero clicks (auto-submitted at check-in).
