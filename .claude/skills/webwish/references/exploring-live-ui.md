# Exploring the live WebWish UI

> Part of the central [webwish](../SKILL.md) skill.

Look at the real DOM before writing locators. Don't guess them: guessed page objects
(e.g. the revise methods in `ManagerFunction/AvailabilityManagementPage.ts`) fail.

## Why not plain Playwright MCP

The Playwright MCP server (`.mcp.json`) is fine for pages that need no login, but:
- `browser_run_code_unsafe` has no `require`, so it can't read `test-data/users.xlsx`.
- Printing credentials so they can be typed into MCP is blocked, and should be: never echo
  secrets from `users.xlsx`, `test-data.json` or `config/.env.*`.

## Approach that works: long-lived logged-in browser + CDP probes

Keep these scripts in the session scratchpad, **not** in the repo.

1. **session.ts**: launch Chromium with a debugging port, log in with the framework, and stay alive:
   ```ts
   import { chromium } from 'E:/Automation Project/WebWish 2/node_modules/@playwright/test';
   import { LoginPage } from 'E:/Automation Project/WebWish 2/src/pages/LoginPage';
   import { getUserByIndexFromExcel } from 'E:/Automation Project/WebWish 2/src/utils/UserDataProvider';
   import { getPropertyByIndexFromExcel } from 'E:/Automation Project/WebWish 2/src/utils/PropertyDataProvider';
   (async () => {
     const browser = await chromium.launch({ headless: false, args: ['--remote-debugging-port=9333'] });
     const context = await browser.newContext({ viewport: { width: 1440, height: 800 } });
     const page = await context.newPage();
     const user = getUserByIndexFromExcel(1)!, property = getPropertyByIndexFromExcel(3)!;
     await new LoginPage(page, context).loginWithPropertySelection(user.username, user.password, property.index);
     console.log('LOGGED_IN', page.url());
     await new Promise(() => {});
   })();
   ```
   Run it detached from the repo root, with `BASE_URL` set to the QC login URL
   (`LoginPage` navigates to `BASE_URL`, and the bare host doesn't show the login form):
   ```bash
   BASE_URL='https://qc2webwish.prologicfirst.in/Webwish_APP/login/z6cQJcxmrEbhhFXqdoj64Q%3D%3D' \
     npx ts-node -T -P tsconfig.json <scratch>/session.ts > <scratch>/session.log 2>&1 &
   ```
   - `-P tsconfig.json` is required (otherwise you get TS5109 moduleResolution errors).
   - Outside the repo, import `@playwright/test` by **absolute path** (otherwise MODULE_NOT_FOUND).
2. **probe.js**: connect and run one snippet file:
   ```js
   const { chromium } = require('E:/Automation Project/WebWish 2/node_modules/@playwright/test');
   (async () => {
     const browser = await chromium.connectOverCDP('http://localhost:9333');
     const page = browser.contexts()[0].pages()[0];
     const fn = require(require('path').resolve(process.argv[2]));
     try { const r = await fn(page); console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 1)); }
     catch (e) { console.log('ERR', e.message); }
     process.exit(0);
   })();
   ```
   Each snippet is `module.exports = async (page) => { …; return data; }`. Dump `outerHTML`
   (strip `_ngcontent-*` attributes and `<!---->`), aria-labels, dropdown option texts, or
   `page.on('response')` XHR lists to find the API calls to wait on.
3. You can also drive real page objects over CDP from a ts-node script to test a method on its own.
4. **Kill the session before running specs** (PowerShell):
   `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ? { $_.CommandLine -like '*session.ts*' } | % { Stop-Process -Id $_.ProcessId -Force }`

## Tips

- Write snippets with the Write tool. Editing JS regexes with `sed` breaks the escaping.
- A failed probe can leave panels or modals open (e.g. two stacked Quick Access offcanvas
  panels give a "strict mode violation" on the Availability button). Reset with Escape or
  `.offcanvas-backdrop` / modal Close clicks before the next probe.
- Mutating probes change shared QC data. Undo them (e.g. reset revisions to 0) when you're done.
- Screenshots: `page.screenshot({ path: '<scratch>/shot.png' })`, then Read the PNG.
