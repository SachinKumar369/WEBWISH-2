import { Page, BrowserContext } from '@playwright/test';
import { expect } from '@playwright/test';

import logger from '../../core/Logger';
import { WaitUtils } from '../../utils/WaitUtils';
import { ElementActions } from '../../utils/ElementActions';

export class BookingCalendarPage {
  page: Page;
  context: BrowserContext;
  private elementActions: ElementActions;

   private readonly LOADING_SPINNER = '[data-testid=\'loading\'], .spinner, .loader, .loading';


  constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;
  }

  // Locator for the global search input used earlier for Note Templates
  get searchInput() {
    return this.page.locator('input[placeholder="Search..."]');
  }

  // Locator for items in the search result dropdown (example style)
  get searchResults() {
    return this.page.locator('//li[@tabindex="0"]');
  }


  get heading() {
  return this.page.getByRole('heading', { name: 'Booking Calendar' });
}

get filterButton() {
  return this.page.locator('button:has(i.mdi-filter)');
}

get selectedHotelBlock() {
  return this.page.getByText('WEBWE Webwish Hotel');
}


get selectedHotel() {
  return this.page.locator('.ng-value-label:has-text("Webwish Hotel")');
}


get customDropdown() {
  return this.page.locator('ng-select.custom-dropdown').first();
}

get customDropdown1() {
  return this.page.locator('ng-select.custom-dropdown').nth(4);
}

get hotelName() {
  return this.page.locator('span', { hasText: 'WEBWISHINDIA' });
}


get webwishIndiaLabel() {
  return this.page.getByText('WEBWISHINDIA', { exact: true });
}

get loaderOverlay() {
  return this.page.locator('.loader-overlay');
}

get searchButton() {
  return this.page.getByRole('button', { name: 'Search' });
}

get closeButton() {
  return this.page.getByRole('button', { name: 'Close' });
}


async customWait(seconds: number) {
  await this.page.waitForTimeout(seconds * 1000);
}

  //private readonly searchResults = this.page.locator('//li[@tabindex="0"]');

  async searchAndOpenBookingCalendar(searchText: string) {
    logger.info(`Searching for: ${searchText}`);
    await this.searchInput.fill('');
    await this.searchInput.type(searchText);
    await this.page.waitForTimeout(1000); // small wait for dropdown to populate

    // Find the first matching result that contains 'Booking' and click it
    const count = await this.searchResults.count();
    logger.info(`Found ${count} search result items`);

    for (let i = 0; i < count; i++) {
      const item = this.searchResults.nth(i);
      const text = (await item.innerText()).trim().toLowerCase();
      logger.debug(`Search result [${i}]: ${text}`);
      if (text.includes('booking') && text.includes('calendar')) {
        logger.info(`Clicking search result at index ${i} -> ${text}`);
        await item.click();
        return true;
      }
    }

    logger.warn('Booking Calendar not found in search results');
    return false;
  }


// async searchAndOpenBookingCalendar(searchText:string) {
//   logger.info(`Searching for: ${searchText}`);

//   await this.searchInput.fill(searchText);

//   const item = this.searchResults
//     .filter({ hasText: /booking calendar/i })
//     .first();

//   await Promise.all([
//     this.page.waitForLoadState('networkidle'),
//     item.click()
//   ]);

//   await expect(this.heading).toBeVisible();

//   return true;
// }

  async waitForBookingCalendarPage(timeout = 5000) {
    // Example: wait for a heading or some unique element on Booking Calendar page
    //const heading = this.page.locator('text=Booking Calendar');
    await this.heading.waitFor({ state: 'visible', timeout });
  }



 async waitForLoaderToDisappear(timeout = 10000) {
  const loader = this.page.locator('.loader-overlay');

  if (await loader.count()) {
    await loader.waitFor({ state: 'hidden', timeout });
  }
}


async openFilter() {

    await this.page.waitForTimeout(2000);

  await this.waitForLoaderToDisappear();

  await this.filterButton.click();

  await this.waitForLoaderToDisappear();

  //await expect(this.selectedHotelBlock).toBeVisible();
  await this.customDropdown.click();
  await this.customDropdown.press('ArrowDown');
  await this.customDropdown.press('Enter');

  await this.customDropdown1.click();



  await this.customDropdown1.press('ArrowDown');
await this.customDropdown1.press('Enter');
  await this.searchButton.click();
    await this.filterButton.click();
    
    await this.closeButton.click();


  await this.customWait(10);

  //await this.elementActions.click(this.selectedHotelBlock, 'Selected Hotel Block');

  await this.waitForLoaderToDisappear();

  await expect(this.webwishIndiaLabel).toBeVisible();
  await this.webwishIndiaLabel.click();
}


async taskManagement(searchText: string) {
  try {
     await this.page.getByRole('textbox', { name: 'Search...' }).fill(searchText);
         await this.waitForBookingCalendarPage(2000);

  await this.page.locator('#page-topbar').getByText('Task Management').click();
  await this.page.getByRole('button', { name: '󰐗' }).click();
  await this.page.locator('div').filter({ hasText: /^Date From\*$/ }).getByRole('textbox').click();
  await this.page.getByLabel('May 24,').first().click();
  await this.page.locator('div').filter({ hasText: /^Date To\*$/ }).getByRole('textbox').click();
  await this.page.getByLabel('May 24,').nth(1).click();
  await this.page.locator('div').filter({ hasText: /^Status\*--select--$/ }).getByRole('textbox').click();
  await this.page.getByLabel('Options list').getByText('Completed').click();
  await this.page.locator('ng-select').filter({ hasText: /^--select--$/ }).getByRole('textbox').click();
  await this.page.getByText('Balcony').click();
  await this.page.locator('input-control').getByRole('textbox').click();
  await this.page.locator('input-control').getByRole('textbox').fill('Description');
  await this.page.getByRole('button', { name: 'Save', exact: true }).click();
  await this.page.getByRole('button', { name: 'OK' }).click();
  } catch (error) {
    
  }
}



}

