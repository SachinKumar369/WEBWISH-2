# Test Run Summary

- Status: failed
- Total: 1
- Passed: 0
- Failed: 1
- Skipped: 0
- Timed Out: 0
- Interrupted: 0
- Retried Passed: 0

## Report Paths

- HTML: `reports/html-report/index.html`
- Allure Results: `allure-results`
- Allure HTML: `allure-report/index.html`
- JUnit: `test-results/junit.xml`
- JSON: `test-results/test-results.json`

## Failed Tests

-  > chromium > Login\LoginDemo.spec.ts > TC_LOGIN_POS_001 — Successful Login with Valid Credentials > TC_LOGIN_POS_001: Should login successfully with valid credentials and land on property selection
  - Error: Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

Locator: getByText('Password')
Expected: visible
Error: strict mode violation: getByText('Password') resolved to 2 elements:
    1) <label _ngcontent-ng-c505831083="" class="form-label lbl-sm-b">Password</label> aka getByText('Password', { exact: true })
    2) <a href="javascript:void(0)" class="text-muted link-n" _ngcontent-ng-c505831083="">Forgot password?</a> aka getByRole('link', { name: 'Forgot password?' })

Call log:
[2m  - Expect "toBeVisible" with timeout 5000ms[22m
[2m  - waiting for getByText('Password')[22m

  - Attachments: E:\Automation Project\WebWish 2\test-results\Login-LoginDemo-TC-LOGIN-P-38424--land-on-property-selection-chromium\test-failed-1.png, E:\Automation Project\WebWish 2\test-results\Login-LoginDemo-TC-LOGIN-P-38424--land-on-property-selection-chromium\video.webm, E:\Automation Project\WebWish 2\test-results\Login-LoginDemo-TC-LOGIN-P-38424--land-on-property-selection-chromium\error-context.md
