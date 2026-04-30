import { BrowserContext, Locator, Page, expect } from '@playwright/test';
import logger from '../../../core/Logger';
import { BaseCrudPage } from '../ClientParameters/BaseCrudPage';

interface CityStateMasterRecord {
  countrySearch: string;
  stateSearch: string;
  cityCode: string;
  cityDescription: string;
}

export class CityStateMasterPage extends BaseCrudPage {

  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: ' FrontOffice Setup' });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: 'Parameter Setup' });
  private readonly cityStateMasterLink = this.page.getByRole('link', { name: 'City State Master' });
  private readonly cityMasterLink = this.page.getByRole('link', { name: 'City Master' });

  private readonly screenName: string;
  private isFirstTime = true;

  constructor(page: Page, context: BrowserContext, screenName: string = 'City Master') {
    super(page, context);
    this.screenName = screenName;
  }

  private getModal(): Locator {
    return this.page.locator('ngb-modal-window').last();
  }

  private getNgSelectInput(index: number): Locator {
    return this.getModal().locator('ng-select').nth(index).getByRole('textbox').first();
  }

  private getCityCodeInput(): Locator {
    return this.getModal().getByRole('textbox').nth(2);
  }

  private getCityDescriptionInput(): Locator {
    return this.getModal().getByRole('textbox').nth(3);
  }

  private async selectDropdownBySearch(index: number, searchText: string, fieldName: string): Promise<void> {
    const input = this.getNgSelectInput(index);
    await input.waitFor({ state: 'visible', timeout: 10000 });

    await this.elementActions.click(input, `${fieldName} dropdown textbox`);
    //await input.fill(searchText);
    await input.click({ clickCount: 3 }); // Select all existing text
    await input.press('ArrowDown');
    await input.press('Enter');
  }

  protected async openPage(): Promise<void> {

    if (this.isFirstTime) {

      await this.page.mouse.move(0, 300);

      await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup');
      await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup');
      await this.elementActions.click(this.cityStateMasterLink, 'City State Master');
      await this.elementActions.click(this.cityMasterLink, 'City Master');
            //await this.page.mouse.move(0, 300);


      this.isFirstTime = false;
    } else {
      await this.page.mouse.move(0, 300);
    }

    await expect(this.page.getByRole('heading', { name: this.screenName, level: 3 })).toBeVisible();
  }

  protected async fillForm(data: CityStateMasterRecord): Promise<void> {

    await this.selectDropdownBySearch(0, data.countrySearch, 'Country');
    await this.selectDropdownBySearch(1, data.stateSearch, 'State');

    const cityCodeInput = this.getCityCodeInput();
    await this.elementActions.click(cityCodeInput, 'City Code');
    await cityCodeInput.fill(data.cityCode);

    const cityDescriptionInput = this.getCityDescriptionInput();
    await this.elementActions.click(cityDescriptionInput, 'City Description');
    await cityDescriptionInput.fill(data.cityDescription);
  }

  async deleteAll(searchText: string): Promise<void> {

    const searchInput = await this.resolveSearchInput();

    await this.elementActions.click(searchInput, 'Search');
    await searchInput.fill('');
    await searchInput.fill(searchText);

    await this.page.waitForTimeout(500);

    const checkAll = this.page.locator('#checkAll');
    const bulkDeleteButton = this.page.locator('.btn.btn-sm.waves-effect.waves-light.py-0.px-2.btn-soft-danger');

    if ((await checkAll.count()) > 0) {
      await this.elementActions.click(checkAll, 'Select All Checkbox');
      await this.elementActions.click(bulkDeleteButton, 'Bulk Delete Button');

      await this.expectAndConfirmPopup('Do you want to delete the selected record?', 'Yes');
      await this.expectAndConfirmPopup('Data Deleted Successfully.', 'OK');
      return;
    }

    logger.info('Bulk delete controls not found, falling back to row-by-row deletion');
    await super.deleteAll(searchText);
  }

  async runFlow(): Promise<void> {

    const data: CityStateMasterRecord[] = [
      {
        countrySearch: 'india',
        stateSearch: 'uttar',
        cityCode: this.generateUniqueCode(),
        cityDescription: 'automation'
      },
      {
        countrySearch: 'andorra',
        stateSearch: 'alb',
        cityCode: this.generateUniqueCode(),
        cityDescription: 'automation'
      },
      {
        countrySearch: 'andorra',
        stateSearch: 'bost',
        cityCode: this.generateUniqueCode(),
        cityDescription: 'automation'
      }
    ];

    logger.info('Executing City State Master create/delete flow');
    await this.runCrudFlow(data, 'automation');
  }
}