# Contributing Guide

## Code of Conduct

- Be respectful and inclusive
- Follow project coding standards
- Test your changes thoroughly
- Document your code

## Getting Started

### Fork and Clone
```bash
git clone https://github.com/your-username/webwish-automation.git
cd webwish-automation
npm install
npm run install:browsers
```

### Create Feature Branch
```bash
git checkout -b feature/your-feature-name
```

## Development Guidelines

### Code Style
- Follow ESLint rules
- Use TypeScript strict mode
- Use meaningful variable names
- Add JSDoc comments for complex functions

### Run Linter
```bash
npm run lint          # Check
npm run lint:fix      # Auto-fix
```

### Test Your Code
```bash
npm test              # Run all tests
npm run test:headed   # Run with browser visible
npm run test:debug    # Debug mode
```

### Commit Message Format
```
type(scope): description

feat(login): add remember me functionality
fix(wait): resolve timeout issue
docs(readme): update installation steps
refactor(pages): improve page object structure
test(login): add edge case tests
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactor
- `test`: Test additions
- `chore`: Dependencies, config

## Writing Tests

### Test Naming
```typescript
test('TC_001: Feature description', async () => {
  // Arrange
  // Act
  // Assert
});
```

### Test Structure
```typescript
test.beforeEach(async ({ page, context }) => {
  // Setup
});

test('Description', async ({ page, context }) => {
  // Test implementation
});

test.afterEach(async () => {
  // Cleanup
});
```

### Best Practices
1. One assertion per logical concept
2. Use meaningful test names
3. Follow AAA pattern (Arrange, Act, Assert)
4. Don't hardcode data - use test data files
5. Clean up after tests
6. Add logging for debugging

## Writing Page Objects

### Template
```typescript
import { BasePage } from '../core/BasePage';
import { ElementActions } from '../utils/ElementActions';

export class MyPage extends BasePage {
  private elementActions: ElementActions;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  // Private locators
  private readonly ELEMENT = '[data-testid="element"]';

  // Public methods
  async doSomething(): Promise<void> {
    await this.elementActions.click(this.ELEMENT);
  }
}
```

### Best Practices
1. Use data-testid or role-based locators
2. Avoid hardcoding waits
3. Return meaningful values
4. Add logging for important actions
5. Handle errors gracefully

## Pull Request Process

### Before Submitting

1. **Update your branch**
```bash
git fetch origin
git rebase origin/main
```

2. **Run tests**
```bash
npm test
```

3. **Check code style**
```bash
npm run lint:fix
npm run build
```

4. **Update documentation**
- Update README if needed
- Add JSDoc comments
- Document new features

### Submit PR

1. Push to your fork
```bash
git push origin feature/your-feature-name
```

2. Create Pull Request on GitHub
   - Clear title and description
   - Link related issues
   - Add screenshots if UI changes

3. Wait for review
   - Address feedback promptly
   - Keep conversation professional
   - Don't force-push after review starts

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] All tests pass
- [ ] Tested on multiple browsers

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Ready for production
```

## Reporting Issues

### Before Reporting
- Search existing issues
- Check documentation
- Review recent PRs

### Issue Template
```markdown
## Describe the Bug
Clear description of what went wrong

## To Reproduce
1. Step 1
2. Step 2
3. Expected behavior
4. Actual behavior

## Environment
- OS: [Windows/macOS/Linux]
- Node: [version]
- Browser: [Chrome/Firefox/etc]

## Logs/Screenshots
Include relevant logs and screenshots
```

## Performance Benchmarks

### Target Metrics
- Single test: < 30 seconds
- Full suite: < 10 minutes (4 workers)
- Build time: < 1 minute

## Security

- Never commit credentials
- Use environment variables for secrets
- Review dependencies for vulnerabilities
- Keep dependencies updated

## Questions?

- Check README.md
- Review existing code
- Open a discussion issue
- Contact maintainers

---

Thank you for contributing! 🙏

