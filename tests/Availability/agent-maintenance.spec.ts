import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { AgentMaintenancePage } from '../../src/pages/Availability/AgentMaintenancePage';
import { getUserByIndexFromExcel } from '../../src/utils/UserDataProvider';
import { getPropertyByIndexFromExcel } from '../../src/utils/PropertyDataProvider';

/**
 * Availability – Agent Maintenance (create agent).
 *
 * Flow (verified on QC env, property WEBMI):
 *   1. Login with user + property selected from Excel.
 *   2. Hover the collapsed left sidebar → Marketing → Agent Maintenance.
 *   3. Click "New Account" → fill the "Profile Details" dialog.
 *   4. Save → confirm "Details created/updated successfully."
 *   5. Verify the new agent appears in the grid.
 *
 * Note: Country* is labelled required but is NOT enforced by the app on QC
 * (the country master API returns 204), so it is intentionally omitted.
 */
test.describe.serial('Availability - Agent Maintenance (Create Agent)', () => {

  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('AGENT_CREATE_001: Create a new agent via Marketing > Agent Maintenance', async ({ page, context }) => {
    test.setTimeout(10 * 60 * 1000); // 10 minute timeout

    const loginPage = new LoginPage(page, context);
    const agentPage = new AgentMaintenancePage(page, context);

    // ── Pick user from Excel by index ──
    const user = getUserByIndexFromExcel(0);
    expect(user).toBeDefined();
    logger.info(`User from Excel: ${user!.username} (index ${user!.index})`);

    // ── Pick property from Excel by index ──
    const property = getPropertyByIndexFromExcel(3); // WEBMI
    expect(property).toBeDefined();
    logger.info(`Property from Excel: ${property!.code} (index ${property!.index})`);

    // ── Step 1: Login with user + property from Excel ──
    await test.step('Login with user + property from Excel', async () => {
      logger.info('Step 1: Logging in with user and property selection');
      await loginPage.loginWithPropertySelection(user!.username, user!.password, property!.index);
    });

    // ── Step 2: Navigate to Marketing > Agent Maintenance ──
    await test.step('Navigate to Marketing > Agent Maintenance', async () => {
      logger.info('Step 2: Navigating to Agent Maintenance via sidebar');
      await agentPage.navigateToAgentMaintenance();
      const loaded = await agentPage.verifyPageLoaded();
      expect(loaded).toBeTruthy();
    });

    // Capture the baseline total before creating the agent
    const totalBefore = await agentPage.getTotalCount();
    logger.info(`Agents in grid before creation: ${totalBefore}`);

    // ── Step 3: Create a new agent with a unique code ──
    const timestamp = Date.now().toString().slice(-6);
    const agentCode = `AGT${timestamp}`;
    const agentName = `Agent_${timestamp}`;
    const legalName = `${agentName} Legal`;

    await test.step('Create new agent via New Account dialog', async () => {
      logger.info(`Step 3: Creating agent ${agentCode} (${agentName})`);
      await agentPage.createAgentAndConfirm({
        agentCode,
        agentName,
        legalName,
        address: '123 Test Street',
        // Country* is mandatory — the app rejects the save without it.
        country: 'United Arab Emirates',
        mainHeadOption: 'OT Others',
      });
    });

    await page.screenshot({
      path: `screenshots/agent-created-${agentCode}.png`,
      fullPage: true,
    });

    // ── Step 4: Verify the total count increased by 1 (grid still unfiltered) ──
    await test.step('Verify total agent count increased by 1', async () => {
      const totalAfter = await agentPage.getTotalCount();
      logger.info(`Agents in grid after creation: ${totalAfter} (was ${totalBefore})`);
      expect(totalAfter).toBe(totalBefore + 1);
    });

    // ── Step 5: Verify the agent appears in the grid (uses the search box) ──
    await test.step('Verify the new agent appears in the grid', async () => {
      logger.info('Step 5: Verifying the agent appears in the grid');
      const visible = await agentPage.verifyAgentInGrid(agentCode, agentName);
      expect(visible, `Agent ${agentCode} should be visible in the grid`).toBeTruthy();
    });

    await page.screenshot({
      path: `screenshots/agent-maintenance-verified-${agentCode}.png`,
      fullPage: true,
    });

    logger.info(`AGENT_CREATE_001 completed: agent ${agentCode} created and verified`);
  });
});
