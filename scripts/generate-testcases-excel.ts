/**
 * Test Case Excel Generator
 * 
 * Reads Playwright .ts test files and generates professional Excel test case documentation.
 * Used by the test-case-generator agent.
 * 
 * Usage: npx ts-node scripts/generate-testcases-excel.ts <path-to-spec-file-or-directory>
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';

// Types
interface TestStep {
    stepNumber: number;
    action: string;
    expectedResult: string;
}

interface TestCase {
    id: string;
    module: string;
    suite: string;
    title: string;
    priority: string;
    preconditions: string[];
    steps: TestStep[];
    sourceFile: string;
}

interface ParsedTest {
    describeName: string;
    tests: Array<{
        id: string;
        title: string;
        body: string;
    }>;
    beforeEach: string;
}

// Configuration
const PRIORITY_MAP: Record<string, string> = {
    'LOGIN': 'P1',
    'AUTH': 'P1',
    'BOOKING': 'P1',
    'CHECKIN': 'P1',
    'CHECKOUT': 'P1',
    'PAYMENT': 'P1',
    'BC': 'P1',
    'GM': 'P2',
    'GROUP': 'P2',
    'TASK': 'P2',
    'REPORT': 'P2',
    'SEARCH': 'P2',
    'MARKETING': 'P2',
    'NOTE': 'P3',
    'VISUAL': 'P3',
    'DB': 'P3',
};

const MODULE_FOLDER_MAP: Record<string, string> = {
    'frontdesk': 'FrontDesk',
    'FrontOfficeSetup': 'FrontOfficeSetup',
    'GlobalSearch': 'GlobalSearch',
    'Login': 'Login',
    'ManagerFunction': 'ManagerFunction',
    'Marketing': 'Marketing',
    'Reports': 'Reports',
    'SystemConfig': 'SystemConfig',
    'database': 'Database',
};

// Step translation patterns
const STEP_TRANSLATIONS: Array<{ pattern: RegExp; translate: (match: RegExpMatchArray) => string }> = [
    { pattern: /navigateToLoginPage\(\)/, translate: () => 'Navigate to the login page' },
    { pattern: /navigateTo\(([^)]+)\)/, translate: (m) => `Navigate to ${m[1]}` },
    { pattern: /loginWithPropertySelection\(([^,]+),\s*([^,]+),\s*(\d+)\)/, translate: () => 'Enter valid credentials and click Login → Select property from dropdown' },
    { pattern: /login\(([^,]+),\s*([^)]+)\)/, translate: () => 'Enter username and password → Click the Login button' },
    { pattern: /click\(['"]([^'"]+)['"]\)/, translate: (m) => `Click the "${m[1]}" element` },
    { pattern: /fill\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/, translate: (m) => `Enter "${m[2]}" in the ${m[1]} field` },
    { pattern: /type\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/, translate: (m) => `Type "${m[2]}" in the ${m[1]} field` },
    { pattern: /selectOption\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/, translate: (m) => `Select "${m[2]}" from the ${m[1]} dropdown` },
    { pattern: /waitForTimeout\((\d+)\)/, translate: (m) => `Wait for ${m[1]}ms` },
    { pattern: /waitForLoadState\(['"]([^'"]+)['"]\)/, translate: (m) => `Wait for page to reach "${m[1]}" state` },
    { pattern: /takeScreenshot\(['"]([^'"]+)['"]\)/, translate: (m) => `Take a screenshot: "${m[1]}"` },
    { pattern: /isLoginFormVisible\(\)/, translate: () => 'Verify the login form is visible' },
    { pattern: /isCalendarVisible\(\)/, translate: () => 'Verify the booking calendar is visible' },
    { pattern: /getCurrentURL\(\)/, translate: () => 'Get the current page URL' },
    { pattern: /getUserCredentials\(['"]([^'"]+)['"]\)/, translate: (m) => `Retrieve test user credentials for "${m[1]}"` },
];

function parseTestFile(filePath: string): ParsedTest {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract describe block
    const describeMatch = content.match(/test\.describe\(['"](.+?)['"]/);
    const describeName = describeMatch ? describeMatch[1] : path.basename(filePath, '.ts');

    // Extract beforeEach
    const beforeEachMatch = content.match(/test\.beforeEach\(async\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\}\);/);
    const beforeEach = beforeEachMatch ? beforeEachMatch[1] : '';

    // Extract individual tests
    const testRegex = /test\(['"](.+?)['"],\s*async\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\}\);/g;
    const tests: Array<{ id: string; title: string; body: string }> = [];
    let match;

    while ((match = testRegex.exec(content)) !== null) {
        const fullTitle = match[1];
        const body = match[2];

        // Extract TC ID and title
        const tcMatch = fullTitle.match(/^(TC_\w+_\d+):\s*(.+)/);
        if (tcMatch) {
            tests.push({
                id: tcMatch[1],
                title: tcMatch[2].trim(),
                body,
            });
        } else {
            tests.push({
                id: `TC_GEN_${String(tests.length + 1).padStart(3, '0')}`,
                title: fullTitle,
                body,
            });
        }
    }

    return { describeName, tests, beforeEach };
}

function extractModule(filePath: string): string {
    const parts = filePath.replace(/\\/g, '/').split('/');
    const testsIndex = parts.findIndex(p => p === 'tests');
    if (testsIndex !== -1 && parts[testsIndex + 1]) {
        const folder = parts[testsIndex + 1];
        return MODULE_FOLDER_MAP[folder] || folder;
    }
    return 'General';
}

function inferPriority(tcId: string, title: string): string {
    for (const [key, priority] of Object.entries(PRIORITY_MAP)) {
        if (tcId.toUpperCase().includes(key) || title.toUpperCase().includes(key)) {
            return priority;
        }
    }
    return 'P2';
}

function extractPreconditions(beforeEach: string): string[] {
    const preconditions: string[] = [];

    if (beforeEach.includes('loginWithPropertySelection') || beforeEach.includes('login(')) {
        preconditions.push('User is logged in with valid credentials');
        preconditions.push('Property is selected from the dropdown');
    }
    if (beforeEach.includes('setViewportSize')) {
        const viewportMatch = beforeEach.match(/setViewportSize\(\{[^}]*width:\s*(\d+)[^}]*height:\s*(\d+)/);
        if (viewportMatch) {
            preconditions.push(`Browser viewport is set to ${viewportMatch[1]}x${viewportMatch[2]}`);
        }
    }
    if (beforeEach.includes('getUserCredentials')) {
        preconditions.push('Test data credentials are available');
    }

    return preconditions;
}

function translateSteps(body: string, beforeEach: string): TestStep[] {
    const steps: TestStep[] = [];
    let stepNum = 1;

    // Add setup steps from beforeEach
    if (beforeEach.includes('loginWithPropertySelection') || beforeEach.includes('login(')) {
        steps.push({
            stepNumber: stepNum++,
            action: 'Navigate to the login page',
            expectedResult: 'Login page is displayed with username and password fields',
        });
        steps.push({
            stepNumber: stepNum++,
            action: 'Enter valid username and password, then click Login',
            expectedResult: 'User is authenticated successfully',
        });
        steps.push({
            stepNumber: stepNum++,
            action: 'Select property from the property dropdown',
            expectedResult: 'Property is selected and user is redirected to the dashboard',
        });
    }

    // Extract logger.info messages as context
    const loggerMatches = body.matchAll(/logger\.info\(['"](.+?)['"]\)/g);
    const logMessages: string[] = [];
    for (const m of loggerMatches) {
        logMessages.push(m[1]);
    }

    // Extract expect assertions for expected results
    const expectMatches = body.matchAll(/await\s+expect\((.+?)\)\.(.+?)\(/g);
    const assertions: Array<{ target: string; matcher: string }> = [];
    for (const m of expectMatches) {
        assertions.push({ target: m[1].trim(), matcher: m[2] });
    }

    // Extract try block content (main test logic)
    const tryMatch = body.match(/try\s*\{([\s\S]*?)\}\s*catch/);
    const testBody = tryMatch ? tryMatch[1] : body;

    // Parse action lines
    const lines = testBody.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && !l.startsWith('logger'));

    for (const line of lines) {
        // Skip non-action lines
        if (line.startsWith('const ') || line.startsWith('let ') || line.startsWith('if ')) continue;
        if (line.includes('expect(')) {
            // This is an assertion - convert to expected result
            const lastStep = steps[steps.length - 1];
            if (lastStep) {
                const assertionText = formatAssertion(line);
                lastStep.expectedResult = assertionText;
            }
            continue;
        }

        // Try to translate the action
        let translated = false;
        for (const { pattern, translate } of STEP_TRANSLATIONS) {
            const match = line.match(pattern);
            if (match) {
                steps.push({
                    stepNumber: stepNum++,
                    action: translate(match),
                    expectedResult: 'Action completed successfully',
                });
                translated = true;
                break;
            }
        }

        // Generic method call
        if (!translated) {
            const methodMatch = line.match(/await\s+\w+\.(\w+)\(/);
            if (methodMatch) {
                const methodName = methodMatch[1];
                const friendlyName = methodName
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, s => s.toUpperCase())
                    .trim();
                steps.push({
                    stepNumber: stepNum++,
                    action: friendlyName,
                    expectedResult: 'Action completed successfully',
                });
            }
        }
    }

    // Ensure at least one step
    if (steps.length === 0) {
        steps.push({
            stepNumber: stepNum++,
            action: 'Execute test automation script',
            expectedResult: 'All assertions pass successfully',
        });
    }

    // Update last step's expected result based on log messages
    if (logMessages.length > 0) {
        const lastStep = steps[steps.length - 1];
        if (lastStep && lastStep.expectedResult === 'Action completed successfully') {
            lastStep.expectedResult = logMessages[logMessages.length - 1];
        }
    }

    return steps;
}

function formatAssertion(assertion: string): string {
    const match = assertion.match(/expect\((.+?)\)\.(\w+)\((.+?)?\)/);
    if (!match) return 'Assertion passes';

    const target = match[1].trim();
    const matcher = match[2];
    const value = match[3]?.replace(/['"]/g, '').trim();

    switch (matcher) {
        case 'toBe':
            return `Verify ${target} equals "${value}"`;
        case 'toBeTruthy':
            return `Verify ${target} is truthy (not null/undefined/false)`;
        case 'toBeFalsy':
            return `Verify ${target} is falsy`;
        case 'toBeVisible':
            return `Verify ${target} is visible on the page`;
        case 'toBeHidden':
            return `Verify ${target} is hidden`;
        case 'toBeEnabled':
            return `Verify ${target} is enabled`;
        case 'toBeDisabled':
            return `Verify ${target} is disabled`;
        case 'toHaveText':
            return `Verify ${target} displays text "${value}"`;
        case 'toHaveValue':
            return `Verify ${target} has value "${value}"`;
        case 'toContainText':
            return `Verify ${target} contains text "${value}"`;
        case 'toHaveAttribute':
            return `Verify ${target} has the expected attribute`;
        default:
            return `Verify assertion: ${target}.${matcher}(${value || ''})`;
    }
}

function parseArgs(): { inputPath: string; outputPath: string } {
    const args = process.argv.slice(2);
    const inputPath = args[0] || 'tests';
    const outputPath = args[1] || 'testcases';
    return { inputPath, outputPath };
}

function collectTestFiles(inputPath: string): string[] {
    const files: string[] = [];
    const stat = fs.statSync(inputPath);

    if (stat.isFile() && (inputPath.endsWith('.ts') || inputPath.endsWith('.spec.ts') || inputPath.endsWith('.test.ts'))) {
        files.push(inputPath);
    } else if (stat.isDirectory()) {
        const entries = fs.readdirSync(inputPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(inputPath, entry.name);
            if (entry.isDirectory()) {
                files.push(...collectTestFiles(fullPath));
            } else if (entry.isFile() && (entry.name.endsWith('.spec.ts') || entry.name.endsWith('.test.ts'))) {
                files.push(fullPath);
            }
        }
    }

    return files;
}

async function generateExcel(testCases: TestCase[], outputPath: string, moduleName: string): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'WebWish QA Team';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(`${moduleName} Test Cases`, {
        views: [{ state: 'frozen', ySplit: 1 }],
    });

    // Define columns
    sheet.columns = [
        { header: 'Test Case ID', key: 'id', width: 20 },
        { header: 'Module', key: 'module', width: 15 },
        { header: 'Test Suite', key: 'suite', width: 25 },
        { header: 'Test Case Title', key: 'title', width: 40 },
        { header: 'Priority', key: 'priority', width: 10 },
        { header: 'Preconditions', key: 'preconditions', width: 35 },
        { header: 'Step #', key: 'stepNumber', width: 8 },
        { header: 'Test Step', key: 'testStep', width: 45 },
        { header: 'Expected Result', key: 'expectedResult', width: 45 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Source File', key: 'sourceFile', width: 35 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    headerRow.height = 30;

    // Add auto-filter
    sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 11 },
    };

    // Add data rows
    let currentRow = 2;
    for (const tc of testCases) {
        const startRow = currentRow;

        for (const step of tc.steps) {
            const row = sheet.getRow(currentRow);

            row.getCell('id').value = tc.id;
            row.getCell('module').value = tc.module;
            row.getCell('suite').value = tc.suite;
            row.getCell('title').value = tc.title;
            row.getCell('priority').value = tc.priority;
            row.getCell('preconditions').value = tc.preconditions.join('\n');
            row.getCell('stepNumber').value = step.stepNumber;
            row.getCell('testStep').value = step.action;
            row.getCell('expectedResult').value = step.expectedResult;
            row.getCell('status').value = 'Automated';
            row.getCell('sourceFile').value = tc.sourceFile;

            // Style alignment
            row.alignment = { vertical: 'top', wrapText: true };
            row.height = 30;

            currentRow++;
        }

        // Merge cells for multi-step test cases
        if (tc.steps.length > 1) {
            const mergeColumns = ['id', 'module', 'suite', 'title', 'priority', 'preconditions', 'status', 'sourceFile'];
            for (const col of mergeColumns) {
                const colNumber = sheet.getColumn(col).number;
                sheet.mergeCells(startRow, colNumber, currentRow - 1, colNumber);
                // Re-apply alignment after merge
                sheet.getCell(startRow, colNumber).alignment = {
                    vertical: 'top',
                    horizontal: 'left',
                    wrapText: true,
                };
            }
        }
    }

    // Add borders to all cells
    for (let row = 1; row < currentRow; row++) {
        for (let col = 1; col <= 11; col++) {
            const cell = sheet.getRow(row).getCell(col);
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
        }
    }

    // Priority color coding
    for (let row = 2; row < currentRow; row++) {
        const priorityCell = sheet.getRow(row).getCell('priority');
        const priority = priorityCell.value as string;
        if (priority === 'P1') {
            priorityCell.font = { bold: true, color: { argb: 'FFC00000' } };
        } else if (priority === 'P2') {
            priorityCell.font = { bold: true, color: { argb: 'FFED7D31' } };
        } else if (priority === 'P3') {
            priorityCell.font = { bold: true, color: { argb: 'FF70AD47' } };
        }
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    await workbook.xlsx.writeFile(outputPath);
    return outputPath;
}

async function main() {
    const { inputPath, outputPath } = parseArgs();

    console.log(`\n🔍 Scanning: ${inputPath}`);
    console.log(`📁 Output: ${outputPath}\n`);

    // Collect test files
    const testFiles = collectTestFiles(inputPath);

    if (testFiles.length === 0) {
        console.error('❌ No test files found. Please provide a valid .spec.ts file or directory.');
        process.exit(1);
    }

    console.log(`📄 Found ${testFiles.length} test file(s):\n`);

    const allTestCases: TestCase[] = [];

    for (const file of testFiles) {
        console.log(`  → ${file}`);
        const parsed = parseTestFile(file);
        const module = extractModule(file);
        const preconditions = extractPreconditions(parsed.beforeEach);

        for (const test of parsed.tests) {
            const steps = translateSteps(test.body, parsed.beforeEach);
            allTestCases.push({
                id: test.id,
                module,
                suite: parsed.describeName,
                title: test.title,
                priority: inferPriority(test.id, test.title),
                preconditions,
                steps,
                sourceFile: file,
            });
        }
    }

    console.log(`\n📊 Total test cases: ${allTestCases.length}`);
    console.log(`📊 Total steps: ${allTestCases.reduce((sum, tc) => sum + tc.steps.length, 0)}\n`);

    // Generate Excel
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${allTestCases[0]?.module || 'General'}_TestCases_${timestamp}.xlsx`;
    const fullPath = path.join(outputPath, fileName);

    await generateExcel(allTestCases, fullPath, allTestCases[0]?.module || 'General');

    console.log(`✅ Excel file generated: ${fullPath}`);
    console.log(`\n📝 Test Cases Summary:`);

    allTestCases.forEach((tc, i) => {
        console.log(`  ${i + 1}. ${tc.id}: ${tc.title} (${tc.priority}, ${tc.steps.length} steps)`);
    });

    console.log(`\n✨ Done!`);
}

main().catch(console.error);
