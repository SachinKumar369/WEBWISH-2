# Availability module

> Part of the central [webwish](../SKILL.md) skill.

Specs live in `tests/Availability/`, page objects in `src/pages/Availability/`. Almost every test
follows the same pattern: **capture availability → change something → capture again → assert
the exact delta per room type/day.**

## Specs

| Spec | Test IDs | What it does | Page objects |
|---|---|---|---|
| `recreate-availability.spec.ts` | SU_AVAIL_001…006 | System Utilities → Recreate Availability; book 1 / all rooms; zero-availability and overbooking attempts blocked; SU_AVAIL_006 overbooking via Availability Management | `RecreateAvailabilityPage`, `ManagerFunction/AvailabilityManagementPage` |
| `revise-availability.spec.ts` | REV_AVAIL_001…003 | Over Booking +10 / Under Booking 10 / reset via Availability Management. See [revise-availability.md](revise-availability.md) | `ReviseAvailabilityPage` + `RecreateAvailabilityPage` |
| `agent-allotment.spec.ts` | AGENT_ALLLOT_001, AGENT_MODIFY_002, AGENT_DECREASE_003 | Create agent → Allotment blocks 5 rooms → edit to 10 → reduce to 5; availability must drop/rise by the delta | `AgentMaintenancePage`, `AgentAllotmentPage` |
| `agent-maintenance.spec.ts` | — | Marketing → Agent Maintenance create | `AgentMaintenancePage` |
| `group-availability.spec.ts` | — | Group Management: create group, fetch availability, group block, rooming list | `GroupAvailabilityPage` (delegates to `FrontDesk/GroupManagementPage`) |
| `reservation-cancel-availability.spec.ts` | AVAIL_CXL_001…003 | Capture → book 3 rooms (1 night, one multi-guest reservation) → availability −3 on business date → cancel every stay → back to baseline (room type + Total Available, all ~31 days) | `ReservationCancelAvailabilityPage` (+ `RecreateAvailabilityPage`) |
| `cancel-reservation-room-count-availability.spec.ts` | CXL_RM_001…006 | Book a 1-room reservation BD+1 → BD+3 (−1 on cols 1–2, 1 stay CONFIRMED) → cancel → baseline; then a 5-room reservation (5 stays, distinct ids, −5) → cancel Stay #1 only (`cancelStays`, −4: exactly 1 room released) → cancel the other 4 → baseline | `ReservationCancelAvailabilityPage` + `FutureReservationAvailabilityPage` |
| `future-reservation-availability.spec.ts` | FUT_AVAIL_001…003 | Capture → book 2 rooms arriving business date +5 for 3 nights → −2 on the 3 stay nights only (not the departure day) → cancel both stays → back to baseline | `FutureReservationAvailabilityPage` (+ `ReservationCancelAvailabilityPage`) |
| `multi-night-reservation-availability.spec.ts` | MULTI_NIGHT_001…004 | Capture → book 1 room arriving on the business date for 4 nights → −1 on the 4 nights only → reservation shows Arrival/Departure, Nights = 4, CONFIRMED → cancel → baseline | `MultiNightReservationPage` (wraps `FutureReservationAvailabilityPage`) |
| `multi-room-type-reservation-availability.spec.ts` | MULTI_RT_001…004 | Capture ALL room types → book 3 room types × 1 room, 2 nights, in ONE reservation → each booked type −1 on the stay nights, unbooked types unchanged, Total Available −3 → Reservation Details (3 CONFIRMED stays, 3 distinct type codes, Bill Summary Future Postings = selection) → cancel all stays → baseline | `MultiRoomTypeReservationPage` (wraps `MultiNightReservationPage` + `FutureReservationAvailabilityPage`) |
| `change-arrival-date-availability.spec.ts` | CHG_ARR_001…005 | Book 1 room BD+1 → BD+4 (−1 on cols 1–3) → postpone arrival to BD+2 (col 1 restored, 2 nights) → bring arrival forward to BD (cols 0–3 taken, 4 nights) → cancel → baseline. Departure stays fixed | `ChangeArrivalDatePage` (+ `MultiNightReservationPage`) |
| `extend-departure-date-availability.spec.ts` | EXT_DEP_001…004 | Book 1 room BD+1 → BD+2 (−1 on col 1, charge = rate × 1) → extend departure to BD+4 (cols 2–3 also −1, col 4 untouched, 3 nights, charge = rate × 3) → cancel → baseline. Arrival stays fixed | `ExtendDepartureDatePage` (+ `ChangeArrivalDatePage` modal steps) |
| `shorten-departure-date-availability.spec.ts` | SHORT_DEP_001…004 | Book 1 room BD+1 → BD+5 (−1 on cols 1–4, charge = rate × 4) → shorten departure to BD+3 (cols 3–4 back to baseline, cols 1–2 still −1, 2 nights, charge = rate × 2) → cancel → baseline. Arrival stays fixed | `ShortenDepartureDatePage` (wraps `ExtendDepartureDatePage`) |
| `change-room-type-availability.spec.ts` | CHG_RT_001…004 | Pick 2 room types with headroom → book 1 room of type A BD+1 → BD+3 (A −1 on cols 1–2, B unchanged) → change room type to B (A back to baseline, B −1, Total Available still −1; card code, Future Postings = B, dates/nights/agreed rate unchanged) → cancel → both baseline | `ChangeRoomTypePage` (wraps `ExtendDepartureDatePage` + `MultiRoomTypeReservationPage`) |
| `cancel-after-room-type-change-availability.spec.ts` | CXL_RTC_001…004 | Capture the whole grid → book 1 × type A BD+1 → BD+3 → change to type B (A on the baseline, B −1) → cancel → stay CANCELLED, card still shows B's code → EVERY room type + Total Available + Total Booked on the baseline (A not released twice) | `CancelAfterRoomTypeChangePage` (wraps `ChangeRoomTypePage`) |
| `inhouse-cancel-after-room-type-change-availability.spec.ts` | IH_CXL_RTC_001…006 | Book 1 × type A BD → BD+2 → change to B → check in (room of B) → IN-HOUSE, availability unchanged → Cancel Checkin → CONFIRMED, unchanged → cancel → every room type on the baseline | `InHouseCancelAfterRoomTypeChangePage` (wraps `CancelAfterRoomTypeChangePage`) |
| `housekeeping-ooo.spec.ts` | — | Set 5 rooms Permanent Out of Order → availability −5; release 1 → +1; occupied room is rejected | `HousekeepingOperationsPage` |
| `AgentAllocate.spec.ts`, `group-availability-seed.spec.ts` | — | Empty/placeholder files | — |

⚠ `recreate-availability.spec.ts` has `test.only` on SU_AVAIL_002 (left over), so running the
file runs only that test. SU_AVAIL_006 uses the old, unverified revise methods in
`AvailabilityManagementPage`. Prefer `ReviseAvailabilityPage` for that flow.

## The watch/eye availability grid (shared building block)

- Button: `.side-button.shadow-lg` (bottom-right, mdi-clock-fast). It can be overlaid, so it's
  **JS-clicked** (`RecreateAvailabilityPage.openQuickAccessPanel()`).
- It opens an NGB offcanvas (`.offcanvas.show`) with "Quick Links" tiles:
  `button.action-btn` + `.btn-label` (Global Search, Availability, Cashier Scroll, House
  Position, Rate Inquiry, Room Block, …). Match the label exactly: `/^\s*Availability\s*$/`.
- The Availability grid is an `<app-data-grid>` (div-based, no `<table>`) inside an
  `ngb-modal-window.show`:
  - rows: `.dg-row`, cells: `.dg-cell` → `[roomType, day0, day1, …]`; header dates in
    `.dg-header-cell` ("2\nFri"). **Column 0 = business date**, about 31 columns.
  - pinned rows at the end: Total Saleable, Total Booked, Occupancy %, Total Available.
  - `AgentAllotmentPage` parses the same grid via `app-availability-enquiry .dg-body-row /
    .dg-cell-text`. Both work.
- Close: `getByRole('button', { name: 'Close' })` (falls back to Escape).
- Reuse `RecreateAvailabilityPage`: `openQuickAccessPanel()`, `clickAvailabilityQuickLink()`,
  `captureAvailabilityGrid(): AvailabilityGridData`, `closeAvailabilityModal()`, `getBusinessDate()`.
  (`RoomAvailability.availableRooms` index 0 is the business date, despite its old comment.)

## Cancel a reservation (verified 2026-10-19)

- Confirmation page after booking (`app-guest-confirmation`): heading `Guest Details <conf no>` gives the
  confirmation number. Buttons: Open Booking / Print Registration / Back.
- A multi-room booking is ONE Guest Management row with a green **M** badge and N stays ("Stay #1…N", each
  with its own 12-digit reservation id). It can't be cancelled from the grid. Cancel each stay: Stay card ⋮ →
  Reservation Details (`…/DE/<reservation id>`) → red **Cancel** (`.card.hstack button.btn-soft-danger`).
  "View all bookings" (`button[title="View all bookings"]`) goes back to `…/SE/<conf no>`. According to the
  user, single-guest bookings can be cancelled straight from the grid, but that path hasn't been verified.
- Cancel dialog (`ngb-modal-window` "Cancel Reservation"): Cancellation Reason ng-select (required;
  `****  No Reason Specified`, `R001…R010`) + Remarks textarea (required) → Ok → POST
  `ReservationActions/CancelationReservation` → swal `Details created/updated successfully.` → badge CANCELLED.
- Availability updates immediately: +1 per cancelled stay.
- Partial cancellation (verified 2026-10-20 with 5 stays): cancelling one stay leaves the others CONFIRMED, and the stay numbers
  and ids don't change. `cancelStays(confNo, expectedStays, [stayNos])` cancels only the listed stays. `cancelReservation()` skips
  stays that are already CANCELLED, so it finishes a partially cancelled reservation.
- Guest Management grid: search `input.search` (type + Enter), rows `app-data-grid .dg-row`, open `[title="Open"]`.
  A right-click opens only the layout context menu. Header search needs typed keys (`pressSequentially`); `fill` shows no results.
- Two CDP clients on one page both auto-handle native dialogs and crash (`No dialog is showing`). In probes,
  register `page.on('dialog', …)` so that client doesn't auto-dismiss.

## Future-dated booking (verified 2026-10-19)

- New Reservation → Stay Details has ONE "Check In/ Check Out Date" field: `<date-range-control>` wrapping a flatpickr
  `mode: "range"` (hidden input `Y-m-d`, visible alt input `d/m/Y`, `allowInput: true`, `minDate` = business date).
  There is no Nights field. Type `DD/MM/YYYY to DD/MM/YYYY` into `date-range-control input.flatpickr-input[type="text"]`
  and press Enter; the hidden input then holds `YYYY-MM-DD to YYYY-MM-DD`.
- Next → POST `GuestReservation/GetRoomRateAvailability` (`date_From`/`date_To`). The room selection page shows
  `Arrival : …` / `Departure : …` badges and a 10-day table starting at the arrival day; the stay nights are highlighted.
- Departure day is not a night: a stay arriving BD+5 for 3 nights consumes grid columns 5, 6, 7 only.
  Grid header cells (`.dg-header-cell`) read "<day> <weekday>", which can be used to check the column ↔ date mapping.
- **Guest Management hides future arrivals by default**: the chip "Quick Search : Expected Arrival (Today)".
  Its `button.btn-close` removes it (re-runs `FrontDesk/Advance/GetAdvanceSearchData`). `openReservation()` /
  `cancelReservation()` now do this via `ReservationCancelAvailabilityPage.clearQuickSearchFilter()`.
- Reuse `FutureReservationAvailabilityPage`: `buildFutureStay(businessDate, offset, nights)`, `setStayDates()`,
  `bookFutureRooms()`, `captureAvailability()` (adds `headerDays`).

## Single-stay reservation & stay details (verified 2026-10-19)

- A **single-stay** reservation opens straight into the stay details on `…/SE/<conf no>`: no Stay card ⋮ menu,
  and the red Cancel (`.card.hstack button.btn-soft-danger`) is already visible. `cancelReservation()` detects
  this (one "Stay #" heading, no visible `i.mdi-dots-vertical`) and cancels in place.
- Stay Details fields are `readonly-field` elements (`label` + `h6` value): "Arrival/Departure" =
  `DD/MM/YYYY to DD/MM/YYYY`, "Nights", "Rooms and No. of Guest" (`1-Rooms, 1-A, 0-Y, 0-C`), "Expected Arrival Date",
  "Expected Departure Date". The status badge (`span.badge`) is in the "Stay #1 - <name> <12-digit id>" heading row.
  Read them with `MultiNightReservationPage.getStayDetails(confNo)`. (Only verified on single-stay views.)
- Arrival on the business date works with `buildFutureStay(businessDate, 0, nights)` + `bookFutureRooms()`.

## Several room types in one reservation (verified 2026-10-19)

- Room selection: each room type row has its own "+ N −" counter. Clicking + in several rows (`selectRoomsByType` per type)
  keeps every selection, and Next → Guest Details → Confirm creates ONE reservation (green **M** badge, one stay per room).
- Stay cards show the room type as a **code** (`app-checkin-assign-room .room-type`: `BEAC`, `BTRM`, `DLX`), while the grid
  and the room selection page use **names**. For name-level checks, use the Bill Summary "Future Postings:" table (`h6`):
  one `tr` per room type, `<span>Beachsuite</span><small> (1 Room)</small>`. Tax/total rows have no `small`.
  `MultiRoomTypeReservationPage.getFuturePostings()` reads it.
- Booking steps are split for reuse: `FutureReservationAvailabilityPage.openRoomSelectionForStay(stay)` → select rooms →
  `completeBooking(lastName)` (returns the conf no). `bookFutureRooms()` is built from these two.

## Change a reservation's arrival date (verified 2026-10-19)

- Reservation Details (single stay) → pencil (`button:has(i.mdi-pencil)`) in the "Stay #1" heading row → NGB modal
  "Stay Details" (`app-stay-edit`, loads via POST `GuestReservationSectional/Get_GuestStayDetails`).
- Separate flatpickr fields: Arrival `date-control[formcontrolname="startDate"]`, Departure `…="endDate"` (hidden `Y-m-d`,
  visible `d/m/Y`). Type `DD/MM/YYYY` + Enter in the visible Arrival input. **Departure does not follow Arrival**, so nights
  change (later arrival = shorter stay, earlier = longer). Room Type / Rate Code here are `app-smart-dropdown` (not ng-select).
- Update → POST `GuestReservationSectional/Update_GuestStayDetails` → swal `Details created/updated successfully.` (OK), the
  modal closes and the card shows the new dates and Nights. No confirm prompt in either direction; availability updates immediately
  (released nights +1, new nights −1). Reuse `ChangeArrivalDatePage.changeArrivalDate(confNo, 'DD/MM/YYYY')`.
- Departure works the same way (Arrival doesn't follow it; Agreed Rate unchanged): `ExtendDepartureDatePage.extendDepartureDate()`.
  Shortening the departure behaves the same way (no confirm prompt; released nights +1 immediately, charge = rate × remaining
  nights, verified 2026-10-20): `ShortenDepartureDatePage.shortenDepartureDate()`.
- **Room type change** (verified 2026-10-20): Room Type in the same modal is `app-smart-dropdown[formcontrolname="room_Type"]`.
  Click `.sdd-control` → CDK overlay `.cdk-overlay-container [role="option"].sdd-option`, name in `.sdd-option__label`, code in
  `.sdd-option__secondary`; current value `.sdd-single__label` / `.sdd-single__secondary`. The list includes types not in the grid
  ("Manual Room Type" ABC). Selecting fires no API and doesn't change Rate Code / Agreed Rate. Update → the same save + swal. The card's
  `.room-type` code updates at once, but **the Bill Summary still names the old room type until the reservation is reopened**.
  Availability: old type +1, new type −1 per night, Total Available unchanged. `ChangeRoomTypePage.changeRoomType(confNo, name)`.
  Cancelling afterwards (verified 2026-10-20): the cancelled stay card still shows the NEW type's code, only the new type is
  released, and the original type stays on its baseline (it is not released a second time).
  For other stay edits, compose `ChangeArrivalDatePage.openStayEdit()` → `setStayDate('arrival' | 'departure', …)` → `saveStayEdit()`.
- After a save, the Bill Summary is reloaded (`Cashiering/GetBillingSummary`). Its "Future Postings" room row amount = agreed rate ×
  nights (before tax): `ExtendDepartureDatePage.getRoomCharge(roomTypeName)`. `StayDetails.agreedRate` reads the stay card's "Agreed Rate".

## Check in, and cancel an in-house guest (verified 2026-10-20)

- Only arrivals on the business date can be checked in (`buildFutureStay(bd, 0, nights)`). Reservation Details → green
  **Checkin** → `…/DC/<reservation id>`. The first load sometimes shows a swal "Unable to reach the server"; OK + reload fixes it.
  Page 1 → **Next** (`ReservationCheckin/Validate_ChekinMandatoryFields`) → room card **Assign Room** → modal "Choose Room (<code>)"
  listing rooms of the stay's CURRENT type (`button.room-btn`: `.room-number`, `.hk-status` IN/DI…, `.selling_Status` VA/OC). A click
  assigns the room at once (`Assign_CheckinRoom` + success swal). Final **Checkin** → swal "Encoder No. is not set… proceed?" Yes →
  `Checkin_MultiReservations` → "Guest(s) checked in successfully." Badge IN-HOUSE (Reservation Details shows "IH-HOUSE").
- Guest Management's default "Status : Reserved" filter hides in-house guests: click the **In-House** quick button first.
- An in-house stay has no red Cancel. **More → Cancel** opens **"Cancel Checkin"** (reason only, `CXCI`) →
  `ReservationActions/CancelCheckin_Reservation` (no swal) → CONFIRMED, room still assigned. Then cancel normally.
- Availability does not change on check-in or Cancel Checkin. Only the reservation cancel releases the nights. The room went back to
  IN/VA after Cancel Checkin + cancel, so re-runs reuse it. `InHouseCancelAfterRoomTypeChangePage`: `checkInGuest`,
  `openInHouseReservation`, `cancelCheckin`.

## Business date

Footer text: `Property Id: WEBMI,  User Id: …,  Shift: 1,  Business Date: 02/10/2026`
(`h6/h5/h4` containing "Business Date:"). Use `textContent` because a modal overlay may cover
it. QC business dates are not today's date. Always read them, never use `new Date()`.

## Availability Management (Manager Functions, FOMF_QMFN01)

Header search `ava` → "Availability Management". The filter panel opens automatically
(Year / Room Type / Rate Code). The year calendar is `.yp-ygrid`, drag-select a range →
"select more days?" → Set Restrictions dialog (Remove Restriction, Revise Availability,
Length of Stay, Booking Days, Apply to all room types). Full details and quirks are in
[revise-availability.md](revise-availability.md).

## Writing a new availability test

1. Shared live session + `test.describe.serial` when steps depend on each other
   (copy `getSharedSession()` from `revise-availability.spec.ts` / `agent-allotment.spec.ts`).
2. Capture "before" from the grid. Choose a room type with enough headroom on every
   compared day.
3. Compute the expected value per day. Account for any state a previous run left behind
   (read it from the UI) so the test is re-runnable.
4. Log a per-day table (base → expected → actual), then `expect(actualArray).toEqual(expectedArray)`.
5. End with a cleanup/reset step so shared QC data returns to its original state.
