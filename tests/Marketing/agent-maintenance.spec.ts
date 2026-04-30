import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { AgentMaintenancePage } from '../../src/pages/Marketing/AgentMaintenancePage';
import { testDataManager } from '../../src/utils/TestDataManager';

test.describe.serial('Marketing - Agent Maintenance', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('MKT_AGENT_MAIN_001: complete agent maintenance operations', async ({ page, context }) => {
    test.setTimeout(120 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const agentMaintenancePage = new AgentMaintenancePage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for agent maintenance flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    // Generate unique agent identifier
    const timestamp = Date.now().toString().slice(-4);
    const agentCode = `MKT${timestamp}`;
    const agentName = `Agent_${timestamp}`;

    // Run complete agent maintenance flow
    await agentMaintenancePage.runCompleteAgentMaintenanceFlow(agentCode, agentName);

    await page.screenshot({
      path: `screenshots/agent-maintenance-completed-${Date.now()}.png`,
      fullPage: true,
    });
  });
});
