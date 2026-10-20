import { BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import logger from '../../core/Logger';
import { RecreateAvailabilityPage } from './RecreateAvailabilityPage';
import { ReservationCancelAvailabilityPage } from './ReservationCancelAvailabilityPage';
import { FutureReservationAvailabilityPage } from './FutureReservationAvailabilityPage';
import { MultiNightReservationPage } from './MultiNightReservationPage';

const UPDATE_STAY_API = '/GuestReservationSectional/Update_GuestStayDetails';

// ──────────────────────────────────────────────────────────────
//  Page Object – Change the arrival date of an existing reservation
// ──────────────────────────────────────────────────────────────

/**
 * Changes the arrival date of an existing single-stay reservation from Reservation Details.
 * Booking comes from {@link FutureReservationAvailabilityPage}, reading the stay back from
 * {@link MultiNightReservationPage}, and cancelling from {@link ReservationCancelAvailabilityPage}.
 *
 * UI flow and quirks (verified live on QC2 / WEBMI, 2026-10-19):
 * - Reservation Details (`…/SE/<conf no>`) → the pencil (`button:has(i.mdi-pencil)`) beside the stay's status badge opens
 *   an NGB modal "Stay Details" (`app-stay-edit`) and POSTs `GuestReservationSectional/Get_GuestStayDetails`.
 * - The modal has separate flatpickr fields: Arrival = `date-control[formcontrolname="startDate"]`,
 *   Departure = `date-control[formcontrolname="endDate"]` (hidden input `Y-m-d`, visible text input `d/m/Y`).
 *   Typing `DD/MM/YYYY` into the visible Arrival input and pressing Enter commits it. "Expected arrival" follows it.
 * - **Departure does not move with Arrival**: changing the arrival changes the number of nights (later = shorter
 *   stay, earlier = longer stay). Arrival = Departure is a 0-night stay, so don't do that.
 * - Update → POST `GuestReservationSectional/Update_GuestStayDetails` → SweetAlert "Details created/updated
 *   successfully." (OK) → the modal closes and the stay card shows the new Arrival/Departure and Nights. There is no
 *   confirm prompt either way (later or earlier arrival), and availability is updated immediately.
 */
export class ChangeArrivalDatePage extends BasePage {
  private readonly elementActions: ElementActions;
  /** Stay details (dates, nights, status, room type code) on Reservation Details. */
  readonly stayDetails: MultiNightReservationPage;
  /** Stay date entry + booking + availability grid with header days. */
  readonly future: FutureReservationAvailabilityPage;
  /** Open / cancel a reservation. */
  readonly reservations: ReservationCancelAvailabilityPage;
  /** Shared Quick Access availability grid + booking steps. */
  readonly availability: RecreateAvailabilityPage;

  /* ── Reservation Details (single stay) ── */
  private readonly stayEditButton: Locator;

  /* ── Stay Details modal ── */
  private readonly stayEditModal: Locator;
  private readonly arrivalInput: Locator;
  private readonly arrivalValue: Locator;
  private readonly departureInput: Locator;
  private readonly departureValue: Locator;
  private readonly updateButton: Locator;

  /* ── SweetAlert ── */
  private readonly swalPopup: Locator;
  private readonly swalMessage: Locator;
  private readonly swalConfirmButton: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
    this.stayDetails = new MultiNightReservationPage(page, context);
    this.future = this.stayDetails.future;
    this.reservations = this.stayDetails.reservations;
    this.availability = this.stayDetails.availability;

    // Reservation Details: the heading row of "Stay #1" holds the status badge and the pencil
    this.stayEditButton = this.page
      .locator('div.row')
      .filter({ has: this.page.locator('h5', { hasText: /^\s*Stay #1\b/ }) })
      .filter({ has: this.page.locator('span.badge') })
      .last()
      .locator('button:has(i.mdi-pencil)')
      .first();

    // Stay Details modal
    this.stayEditModal = this.page.locator('ngb-modal-window').filter({ has: this.page.locator('app-stay-edit') }).last();
    this.arrivalInput = this.stayEditModal.locator('date-control[formcontrolname="startDate"] input.flatpickr-input[type="text"]');
    this.arrivalValue = this.stayEditModal.locator('date-control[formcontrolname="startDate"] input[type="hidden"]');
    this.departureInput = this.stayEditModal.locator('date-control[formcontrolname="endDate"] input.flatpickr-input[type="text"]');
    this.departureValue = this.stayEditModal.locator('date-control[formcontrolname="endDate"] input[type="hidden"]');
    this.updateButton = this.stayEditModal.locator('button').filter({ hasText: /^\s*Update\s*$/ });

    // SweetAlert
    this.swalPopup = this.page.locator('.swal2-popup');
    this.swalMessage = this.page.locator('.swal2-popup .swal2-html-container');
    this.swalConfirmButton = this.page.locator('.swal2-popup .swal2-confirm');
  }

  /** DD/MM/YYYY → YYYY-MM-DD (the flatpickr hidden-input format). */
  private static toIso(ddmmyyyy: string): string {
    return ddmmyyyy.split('/').reverse().join('-');
  }

  // ──────────────────────────────────────────────────────────────
  //  Stay Details modal (shared by every stay-date change)
  // ──────────────────────────────────────────────────────────────

  /**
   * Open `confirmationNo` and its Stay Details modal (single-stay reservations only), and wait until the form holds
   * the current dates.
   * @returns the current Arrival and Departure (YYYY-MM-DD)
   */
  async openStayEdit(confirmationNo: string): Promise<{ arrival: string; departure: string }> {
    await this.reservations.openReservation(confirmationNo);
    await this.elementActions.click(this.stayEditButton, 'Stay #1 edit (pencil)');
    await this.arrivalInput.waitFor({ state: 'visible', timeout: 30000 });

    // The form is filled from Get_GuestStayDetails; wait until Arrival holds a date before changing anything
    let arrival = '';
    for (let i = 0; i < 30 && !/^\d{4}-\d{2}-\d{2}$/.test(arrival); i++) {
      if (i > 0) await this.page.waitForTimeout(1000);
      arrival = await this.arrivalValue.inputValue();
    }
    if (!arrival) throw new Error('Stay Details modal never loaded the current Arrival date');
    return { arrival, departure: await this.departureValue.inputValue() };
  }

  /**
   * Type `date` (DD/MM/YYYY) into the Arrival or Departure flatpickr of the open Stay Details modal and check that it
   * was committed and that the OTHER date did not change.
   */
  async setStayDate(field: 'arrival' | 'departure', date: string): Promise<void> {
    const [input, value, other] =
      field === 'arrival'
        ? [this.arrivalInput, this.arrivalValue, this.departureValue]
        : [this.departureInput, this.departureValue, this.arrivalValue];
    const otherBefore = await other.inputValue();

    await input.click();
    await input.fill('');
    await input.pressSequentially(date, { delay: 20 });
    await input.press('Enter'); // commits the flatpickr date

    const applied = await value.inputValue();
    if (applied !== ChangeArrivalDatePage.toIso(date)) {
      throw new Error(`${field} not applied: expected "${ChangeArrivalDatePage.toIso(date)}", field holds "${applied}"`);
    }
    const otherAfter = await other.inputValue();
    if (otherAfter !== otherBefore) {
      throw new Error(`Changing the ${field} also changed the other date: "${otherBefore}" → "${otherAfter}"`);
    }
  }

  /**
   * Update → wait for Update_GuestStayDetails → SweetAlert OK → modal closed.
   * @returns the SweetAlert message
   */
  async saveStayEdit(): Promise<string> {
    const updateResponse = this.page.waitForResponse(r => r.url().includes(UPDATE_STAY_API), { timeout: 60000 });
    await this.elementActions.click(this.updateButton, 'Update (Stay Details)');
    const response = await updateResponse;
    if (!response.ok()) {
      throw new Error(`Update_GuestStayDetails returned HTTP ${response.status()}`);
    }

    await this.swalPopup.waitFor({ state: 'visible', timeout: 30000 });
    const message = ((await this.swalMessage.textContent()) ?? '').trim();
    await this.elementActions.click(this.swalConfirmButton, 'SweetAlert OK');
    await this.swalPopup.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await this.stayEditModal.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    return message;
  }

  // ──────────────────────────────────────────────────────────────
  //  Change arrival date
  // ──────────────────────────────────────────────────────────────

  /**
   * Open `confirmationNo`, edit its stay and set the Arrival to `newArrival` (DD/MM/YYYY), leaving Departure as it is.
   * Only for single-stay reservations (one room).
   * @returns the SweetAlert message after Update
   */
  async changeArrivalDate(confirmationNo: string, newArrival: string): Promise<string> {
    const current = await this.openStayEdit(confirmationNo);
    logger.info(
      `Reservation ${confirmationNo}: changing arrival ${current.arrival} → ${ChangeArrivalDatePage.toIso(newArrival)} (departure ${current.departure})`
    );
    await this.setStayDate('arrival', newArrival);
    const message = await this.saveStayEdit();
    logger.info(`✅ Arrival changed to ${newArrival}: ${message}`);
    return message;
  }
}
