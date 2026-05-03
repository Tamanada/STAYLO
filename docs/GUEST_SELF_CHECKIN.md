# Guest Self Check-In — Vision & Roadmap

> One QR per booking. Each guest scans, fills their own info, joins
> STAYLO, becomes part of the community. Receptionist barely touches a
> keyboard. TM30 is filled correctly because the guest typed it.
> Birthday wishes, group reviews, and post-stay engagement become
> automatic side-effects.

---

## Why this matters

Today's reality at every Thai hotel:
- Receptionist asks 5 guests for 5 passports
- Manually retypes everything (errors, slow)
- Foreign guest data is required by TM30 within 24h — often skipped or sent late
- Only the lead booker shows up in any post-stay communication
- Reviews come from <10% of bookings, only from the booker
- Birthdays are missed entirely — huge missed hospitality moment

What we're building instead:
- One QR code per booking, valid until check-out
- Every guest in the room scans it, sees a 30-second mobile form
- Their data lands directly in `booking_guests` (no retyping)
- They become a STAYLO user (lightweight account, optional)
- We detect birthdays and surface them to the hotelier in advance
- We invite EVERY guest (not just the lead) to leave a review

---

## Phase 1 — QR self-check-in (this commit)

### Data model
Add to `bookings`:
```sql
check_in_token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid()
```

Auto-generated on booking creation. Rotatable if leaked
(`UPDATE bookings SET check_in_token = gen_random_uuid()`).

### Public URL
`https://staylo.app/checkin/<token>`

No auth required to access. The token IS the access control — anyone
holding it can register themselves on this booking. Token is invalid
once `bookings.check_out` has passed.

### Cap
Max guests that can register = `bookings.adults + bookings.children
 + bookings.extra_beds_count`. Once reached, the form refuses new
entries with "All N guests already checked in. Ask the front desk."

### How it bypasses RLS
The `booking_guests` RLS policy requires the inserter to be a property
member (RBAC). An anonymous mobile visitor with a token is NOT a
member — so we expose a SECURITY DEFINER function:

```sql
register_booking_guest_via_token(
  p_token uuid,
  p_first_name text, p_last_name text,
  p_sex text, p_date_of_birth date,
  p_nationality text, p_passport_number text,
  p_travel_doc_type text,
  p_thailand_arrival_date date,
  p_thailand_port_of_entry text,
  p_visa_type text, p_visa_number text,
  p_user_id uuid    -- nullable; set if guest also created a STAYLO account
) RETURNS uuid
```

The function validates:
- Token exists and matches a booking
- Booking is not yet past check-out
- Guest count won't exceed the booking's capacity
- Inserts the row, returns the new guest id

### Front Desk display
Each booking row in the receptionist's view gets:
- "📱 X / N registered" badge (live count)
- Click → opens modal with the QR code (big, scannable from across the room)
- Print button for laminated table-tents

### Mobile form (public route)
- Mobile-first responsive layout
- Hero: "Welcome to [hotel name] · check-in for [lead booker]"
- Required: First name, Last name, Nationality, DOB, Passport (auto-skip for kids)
- Optional: TM30 immigration details (auto-prompted for non-Thai)
- Two paths at the end:
  - "Just register" (anonymous to STAYLO, info only)
  - "Create STAYLO account to track my booking" (becomes a real user_id, gets the booking history)

---

## Phase 2 — Birthday detector (next iteration)

Once `booking_guests.date_of_birth` has data:
- Daily cron job (Supabase pg_cron OR a Vercel cron) scans for
  bookings currently in-stay where any guest's birthday is within
  ±3 days
- Surfaces on the Front Desk dashboard:
  ```
  🎂 BIRTHDAYS THIS WEEK
  • Marie Dupont (Jungle Room) — 5 May
  • Som Sak (Breath Room) — 7 May
  ```
- Optional: send the hotelier an email summary every Monday
- Hotelier can mark "attention prepared" so it doesn't re-show

Estimated build: 1.5h

---

## Phase 3 — Paper check-in template (separate)

For guests without phones / older travellers / power outages.

Feature:
- `/dashboard/property/{id}/print/check-in/:bookingId` route
- Renders a printable A4 form with:
  - Hotel logo + name + TM30 license number
  - One section per guest (uses `bookings.adults + children + extra_beds`)
  - All fields a TM30 needs
  - Signature line
- Receptionist gives the printed form to the guest, types data back
  in afterward (or photo + AI extraction in a future-future-future
  iteration)

Estimated build: 1h (mostly print CSS).

---

## Phase 4 — Group review collection (separate)

After check-out:
- Each registered guest in `booking_guests` (with email or app account)
  gets a review prompt
- Multi-channel: email if `email`, push if has STAYLO app, SMS as
  last resort if `phone`
- Review form is per-aspect (cleanliness, location, vibe, value, would
  recommend)
- Reviews aggregate on the hotel's listing page

Critical insight: every other platform asks ONLY the lead booker.
We ask everyone → 5-7× the review volume → much richer signal.

Estimated build: 3h (form + email templates + aggregation).

---

## Phase 5 — Post-stay engagement (later)

Once a guest has a STAYLO account from a self-checkin:
- Their booking history is theirs
- They get a personal "$STAY tokens earned" tally
- They can refer friends back to the hotel they loved
- They can see other STAYLO-affiliated hotels in their next destination
- Loyalty layer that's truly direct (vs Booking Genius which only
  benefits Booking)

This is what turns a single booking into a STAYLO ecosystem flywheel.

---

## Why we ship Phase 1 first

- It's the foundation. The token + public route + database hook
  unlocks Phases 2-5.
- It immediately solves a real receptionist pain (5 passports retyped).
- The QR display alone is a wow moment for hoteliers seeing the demo.
- We can validate the UX before investing in birthday/reviews.

Phase 2 ships in the same week (small build).
Phases 3-5 are scheduled around real hotelier feedback.
