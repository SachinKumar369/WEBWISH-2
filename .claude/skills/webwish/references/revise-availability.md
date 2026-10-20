# Revise Availability (Over/Under Booking)

> Part of the central [webwish](../SKILL.md) skill. Read that first for framework conventions.

Covers the flow: login → watch/eye Quick Access → Availability grid (capture) → close →
header search "Availability Management" → filter (room type) → Apply → drag-select business
date → 31 Dec → "select more days?" **No** → Set Restrictions → **Revise Availability** →
Type **Over Booking** / **Under Booking** → value → Save → OK → re-check availability grid.

All facts below were verified live against QC2 (`qc2webwish.prologicfirst.in`) on 2026-10-18.

## Files

| File | Role |
|---|---|
| [src/pages/Availability/ReviseAvailabilityPage.ts](../../../../src/pages/Availability/ReviseAvailabilityPage.ts) | Page object (navigation, filter, calendar drag, Set Restrictions dialog, reset) + date helpers `parseDdMmYyyy`, `toIsoDate`, `addDays`, `daysInclusive` |
| [tests/Availability/revise-availability.spec.ts](../../../../tests/Availability/revise-availability.spec.ts) | Serial spec REV_AVAIL_001/002/003 sharing one live session |
| [src/pages/Availability/RecreateAvailabilityPage.ts](../../../../src/pages/Availability/RecreateAvailabilityPage.ts) | **Reused** for the watch/eye grid: `openQuickAccessPanel()`, `clickAvailabilityQuickLink()`, `captureAvailabilityGrid()`, `closeAvailabilityModal()` |
| `src/pages/ManagerFunction/AvailabilityManagementPage.ts` | Older page object; its revise methods (`clickReviseAvailability`, `selectReviseTypeAndEnterValue`, …) are **unverified guesses** — do not reuse them for this flow |

## Run

```bash
# headed (default config: HEADED/KEEP_BROWSER_OPEN = true → pauses at the end)
npx playwright test tests/Availability/revise-availability.spec.ts --project=chromium
# headless / CI
HEADED=false KEEP_BROWSER_OPEN=false npx playwright test tests/Availability/revise-availability.spec.ts --project=chromium
# PowerShell: $env:HEADED='false'; $env:KEEP_BROWSER_OPEN='false'; npx playwright test ...
```

Test data: user `getUserByIndexFromExcel(1)`, property `getPropertyByIndexFromExcel(3)` (WEBWISHQCMI / WEBMI).
Runtime ≈ 1.2 min for all three. The suite is idempotent: REV_AVAIL_003 resets to 0 (cleanup).

## Test cases

- **REV_AVAIL_001** – capture grid → open Availability Management → pick a room type whose min availability > 2×10 → read existing revisions → drag business date→31 Dec → No → Over Booking 10 → Save → assert grid = base **+10** on every compared day.
- **REV_AVAIL_002** – same session → Under Booking 10 → assert base **−10**.
- **REV_AVAIL_003** – same session → reset (value 0) → assert back to **base**.

"Base" = availability with NO revision = `gridBefore[i] − existingRevision(date_i)`. Compared days = grid columns (grid starts at the business date, ~31 columns) that are ≤ 31 Dec.

## UI map & locators (verified)

**Navigation**
- Header search: `#search-options` → type `ava` → `#page-topbar` getByText `Availability Management`. URL `/pms/ManagerFunctions/FOMF_QMFN01`.
- If already on the page, re-selecting it does **not** reopen the filter → use toolbar `button.app-toolbar__btn[title="Filter"]:visible` (toolbar is rendered twice, take first visible). Other toolbar buttons: `Save`, `Advance Selection`, `Refresh`, `Log`.
- Filter chip after apply: `div.bg-light-blue` text `Room Type : Beachsuite` (and `Year : 2026`).

**Room Type Availability Filter** (side floating modal, `app-room-type-availability-filter`)
- Fields (`.col-md-6` + `label`): Year (pre-filled with business year), Room Type, Rate Code — all ng-select.
- Options read `"CODE  Name"` (e.g. `BEAC  Beachsuite`, `DLX  Deluxe Rooms`) → match name at the end: `ng-dropdown-panel .ng-option` filter `/\sBeachsuite\s*$/`.
- Buttons: `Apply`, `Close`.
- Calendar data arrives via `POST /Webwish_API/api/MgrFunctions/Availability/Get_RoomTypeAvailability` → `waitForResponse` before reading labels.

**Year calendar**
- Grid: `.yp-ygrid[role="grid"]` aria-label `Room Restrictions 2026`; rows `[role=row]`, month header `.yp-ymonth` (`Jan`, …, `Sept`, `Oct`, aria-label `October 2026`).
- Day cell: `[role="gridcell"].yp-cell` with aria-label like
  `Friday, 2 October 2026, business date, Over/Underbooking: 10`.
  - before business date: `is-disabled`, `aria-disabled="true"`, label ends `, unavailable`
  - business date: class `is-business`; weekends `is-weekend`; selected `is-sel`; filler cells `yp-filler` (no label)
- Locate a day with CSS `[role="gridcell"][aria-label*=", 2 October 2026"]` (leading `, ` keeps 2 ≠ 12).
- Hover tooltip shows Availability, Restrictions, Saleable, Booked, Over/Underbooking.
- Existing revision per day = regex `/Over\/Underbooking:\s*(-?\d+)/` on the label.

**Drag selection**
- `mouse.move(startCenter)` → `mouse.down()` → `mouse.move(endCenter, { steps: 25 })` → `mouse.up()`.
- Business date 02/10 → 31/12 selects **91** cells (`.is-sel`). Always assert the count; retry once.
- On mouse-up a SweetAlert: **"Please Confirm — Do you want to select more days to update?"** buttons Yes / No / Cancel (`.swal2-popup`). **No** opens Set Restrictions.

**Set Restrictions dialog** (`app-availability-restriction-popup`, NGB modal)
- "Set Restrictions" ng-select (default `N Remove Restriction`).
- Checkboxes (ids on `checkbox-control`): `#chkReviseAvailability` "Revise Availability (To reset save as 0)", `#chkLengthofstay`, `#chkbookingDays` "Set Booking Days", "Apply above restrictions on all room types" (leave unchecked).
- After ticking Revise Availability: `div.col-6` **Type** ng-select (`O Over Booking`, `U Under Booking`) and **Revise Availability By** `input[type=number]` (maxlength 2).
- Save → SweetAlert `Details created/updated successfully.` → `.swal2-confirm` OK. Buttons: `Save`, `Close`.

**Availability grid (watch/eye)** — `.side-button.shadow-lg` (JS click) → offcanvas `button.action-btn` with `.btn-label` "Availability" → `ngb-modal-window.show app-data-grid .dg-row` rows `[roomType, day1, day2, …]` + pinned Total Saleable / Total Booked / Occupancy % / Total Available. Column 0 = business date. Close via `getByRole('button', { name: 'Close' })`.

## Behaviour & quirks (must know)

1. **Value is ABSOLUTE, not cumulative.** +10 then Under Booking 10 → −10 vs base (not 0). Under Booking is stored as a negative number.
2. **Reset**: saving 0 with a Type selected → `Booking Level Cannot be 0`. Reset = clear Type (`.ng-clear-wrapper` + Escape) and enter 0 → success; labels lose the Over/Underbooking part.
3. **Dialog pre-fills from the FIRST selected day**: checkbox may already be checked, Type/value pre-filled (e.g. Under Booking 10). Only `check()` when unchecked. With a mixed range it can open unchecked.
4. **Labels load late**: cells render ~1 s before their Over/Underbooking labels. Reading too early gives "no revision" → wrong base → test fails with an off-by-10. Wait for `Get_RoomTypeAvailability`.
5. **`app-root` stays `aria-hidden="true"` after a SweetAlert closes** → `getByRole`/`getByLabel` stop finding page content (calendar, header search textbox). Use CSS locators (`#search-options`, `[role=gridcell][aria-label*=…]`). Elements inside modals/swal are unaffected.
6. **Drag right after a modal closes selects only the first day** (fade-out still running) → wait for `ngb-modal-window` to be detached, then verify selected count.
7. **Year grid needs a wide window.** At 800×600 (headless default; `--start-maximized` is ignored headless) the page renders per-month cards ("January 2026", Su Mo Tu…) and the `.yp-ygrid` never appears. Spec uses `viewport: null` headed, `{ width: 1920, height: 1080 }` headless.
8. **Login**: deep links / storageState don't work ("Invalid Login Url!") → one shared `BrowserContext/Page` across serial tests, created in `getSharedSession()`; `afterAll` pauses (if `KEEP_BROWSER_OPEN`) and closes it.
9. `BasePage.waitForNetworkIdle()` (`waitForLoadState('networkidle')`) does nothing useful in this SPA after initial load — wait on specific responses instead.
10. Repo tsconfig has no DOM lib → avoid `document` inside `page.evaluate` in page objects (tsc/eslint error); prefer locators (`textContent`, `evaluateAll`).
11. The `debug: Error processing property … "@class"` log spam comes from the existing property-selection code, not this flow — harmless.

## Page-object API (ReviseAvailabilityPage)

```ts
openAvailabilityManagement()                 // header search → waits for filter panel
selectRoomTypeAndApply(name)                 // filter → Apply → waits for API + calendar
ensureRoomTypeCalendar(name)                 // reuse if chip matches, else Filter button / search
getBusinessDate(): Date                      // footer "Business Date: DD/MM/YYYY"
getRevisionByDate(): Map<iso, number>        // existing Over/Underbooking per day
selectDateRangeByDrag(from, to): number      // drag + verify count (+1 retry)
getMoreDaysPromptText() / answerMoreDaysPrompt(selectMore)
enableReviseAvailability() / selectReviseType(type) / enterReviseBy(n)
saveRestrictions(): message / confirmResultPopup()
reviseAvailability(type, n) / resetReviseAvailability() / closeRestrictionDialog()
reviseAvailabilityForRange(from, to, type, value)   // value 0 = reset
```

## Extending

- Another room type: change selection in REV_AVAIL_001 Step 2 (grid name must match filter option name).
- Other restrictions (Length of Stay, Booking Days, Closed for Arrival…): same drag → No → dialog; add checkbox handling in the page object; explore DOM first.
- Different range: pass any `from`/`to` within the business year to `selectDateRangeByDrag`; expected count = `daysInclusive(from, to)`.
- Always end a mutating suite with a reset so QC data stays clean.

## Exploring the live UI

See [exploring-live-ui.md](exploring-live-ui.md).
