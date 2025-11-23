# Contributing to Gannicus

First off, thank you for considering contributing to Gannicus! 🏛️

## Code of Conduct

This project follows a simple rule: **Be respectful and constructive**.

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates.

**When creating a bug report, include:**
- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Bun version (`bun --version`)
- Ollama version (if applicable)
- Code samples or screenshots

### Suggesting Features

Feature requests are welcome! Please provide:
- Clear use case
- Why this feature would benefit users
- Example API design (if applicable)

### Pull Requests

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Ensure tests pass (`bun test`)
5. Ensure type checks pass (`bun run typecheck`)
6. Commit with descriptive message
7. Push to your fork
8. Open a Pull Request

**PR Guidelines:**
- One feature/fix per PR
- Include tests for new features
- Update documentation if needed
- Follow existing code style
- Keep commits focused and well-described

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/gannicus.git
cd gannicus

# Install dependencies
bun install

# Run type checks
bun run typecheck

# Run tests
bun test

# Run CLI in dev mode
bun dev
```

## Project Structure

```
gannicus/
├── packages/
│   ├── core/           # Core library
│   │   ├── src/
│   │   │   ├── schema/      # Schema builders
│   │   │   ├── providers/   # LLM providers
│   │   │   ├── generator/   # Generation engine
│   │   │   └── types/       # TypeScript types
│   │   └── package.json
│   └── cli/            # CLI application
│       └── src/
├── examples/           # Usage examples
└── docs/              # Documentation
```

## Coding Standards

### TypeScript
- Use strict mode
- Prefer `interface` over `type` for objects
- Export types that users will interact with
- Document public APIs with JSDoc comments

### Style
- Use Bun's built-in formatter (planned)
- Prefer functional patterns
- Keep functions small and focused
- Use descriptive variable names

### Testing
- Write tests for new features
- Maintain or improve coverage
- Use descriptive test names
- Test both happy and error paths

## Adding New Providers

To add a new LLM provider (e.g., Groq, OpenAI):

1. Create file in `packages/core/src/providers/`
2. Implement `LLMProvider` interface
3. Add to `providers/index.ts` exports
4. Update generator to support it
5. Add tests
6. Update documentation

Example:
```typescript
// packages/core/src/providers/groq.ts
import type { LLMProvider } from '../types/index.ts';

export class GroqProvider implements LLMProvider {
  name = 'groq';

  async generate(prompt: string): Promise<string> {
    // Implementation
  }
}
```

## Adding New Field Types

To add a new field type:

1. Add type to `types/index.ts`
2. Add builder function to `schema/index.ts`
3. Update generator to handle it
4. Add tests
5. Update documentation

## Documentation

- Update README.md for major features
- Add examples for new field types
- Keep docs clear and concise
- Use code examples liberally

## Commit Messages

Follow conventional commits:

```
feat: add Groq provider support
fix: resolve coherence bug in LLM fields
docs: update schema builder examples
test: add tests for enum field weights
chore: update dependencies
```

## Questions?

- Open a GitHub Discussion
- Tag maintainer in issues
- Check existing issues and PRs first

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Gannicus! 🙏
