import {
  test,
  expect
} from '@playwright/test';

import { LoginPage }
  from '../../src/pages/LoginPage';

import {
  NoShowGuestDetailsPage
} from '../../src/pages/FrontDesk/NoShowGuestDetailsPage';

import {
  testDataManager
} from '../../src/utils/TestDataManager';

import logger
  from '../../src/core/Logger';

test.describe(
  'FrontDesk - NoShow Guest',
  () => {

    let loginPage: LoginPage;
    let noShowGuestPage: NoShowGuestDetailsPage;

    test.beforeEach(
      async ({
        page,
        context
      }) => {

        await page.setViewportSize({
          width: 1280,
          height: 720
        });

        loginPage =
          new LoginPage(
            page,
            context
          );

        noShowGuestPage =
          new NoShowGuestDetailsPage(
            page,
            context
          );

        logger.info(
          `Starting test: ${test.info().title}`
        );
      }
    );

    test.afterEach(
      async ({ page }) => {

        logger.info(
          `Test finished: ${test.info().title}`
        );

        if (
          test.info().status === 'failed'
        ) {

          logger.error(
            'Test failed.'
          );
        }

        const keepBrowserOpen =
          process.env
            .KEEP_BROWSER_OPEN === 'true';

        if (keepBrowserOpen) {

          logger.info(
            'KEEP_BROWSER_OPEN enabled'
          );

          await page.pause();
        }
      }
    );

    test(
      'FD_NOSHOW_001 : Make Guest NoShow',
      async ({
        page,
        context
      }) => {

        try {

          logger.info(
            '===== Starting Test ====='
          );

          const user =
            await testDataManager
              .getUserCredentials(
                'all'
              );

          await loginPage
            .loginWithPropertySelection(
              user.username,
              user.password,
              2
            );

          logger.info(
            'Navigating To Front Desk'
          );

          await page.mouse.move(
            0,
            400
          );

          await page.getByRole(
            'link',
            {
              name:
                /Front Desk/i
            }
          ).click();

          logger.info(
            'Navigating To Guest Management'
          );

          await page.getByRole(
            'link',
            {
              name:
                /Guest Management/i
            }
          ).click();

          await page.waitForLoadState(
            'networkidle'
          );

          await noShowGuestPage
            .openFirstAvailableGuest();

          const reservationNumber =
            await noShowGuestPage
              .updateGuestDetails({

                firstName:
                  'Sachin',

                lastName:
                  'Kumar',

                email:
                  'abc@gmail.com',

                primaryContact:
                  '9876543210'
              });

          await noShowGuestPage
            .markGuestAsNoShow(
              reservationNumber
            );

          const status =
            await noShowGuestPage
              .getStayStatus();

          expect(status)
            .toContain(
              'NO SHOW'
            );

          logger.info(
            '===== Test Completed ====='
          );

        } catch (error) {

          logger.error(
            `Test failed : ${error}`
          );

          throw error;
        }
      });
  });