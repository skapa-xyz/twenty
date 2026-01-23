# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Twenty is an open-source CRM built with modern technologies in a monorepo structure. The codebase is organized as an Nx workspace with multiple packages.

## Key Commands

### Development
```bash
# Start development environment (frontend + backend + worker)
yarn start

# Individual package development
npx nx start twenty-front     # Start frontend dev server
npx nx start twenty-server    # Start backend server
npx nx run twenty-server:worker  # Start background worker
```

### Testing
```bash
# Run tests
npx nx test twenty-front      # Frontend unit tests
npx nx test twenty-server     # Backend unit tests
npx nx run twenty-server:test:integration:with-db-reset  # Integration tests with DB reset

# Storybook
npx nx storybook:build twenty-front         # Build Storybook
npx nx storybook:test twenty-front     # Run Storybook tests

When testing the UI end to end, click on "Continue with Email" and use the prefilled credentials.
```

### Code Quality
```bash
# Linting (diff with main - fastest)
npx nx lint:diff-with-main twenty-front           # Lint only files changed vs main
npx nx lint:diff-with-main twenty-server          # Lint only files changed vs main
npx nx lint:diff-with-main twenty-front --configuration=fix  # Auto-fix files changed vs main

# Linting (full project)
npx nx lint twenty-front      # Lint all files in frontend
npx nx lint twenty-server     # Lint all files in backend
npx nx lint twenty-front --fix  # Auto-fix all linting issues

# Type checking
npx nx typecheck twenty-front
npx nx typecheck twenty-server

# Format code
npx nx fmt twenty-front
npx nx fmt twenty-server
```

### Build
```bash
# Build packages
npx nx build twenty-front
npx nx build twenty-server
```

### Database Operations
```bash
# Database management
npx nx database:reset twenty-server         # Reset database
npx nx run twenty-server:database:init:prod # Initialize database
npx nx run twenty-server:database:migrate:prod # Run migrations

# Generate migration
npx nx run twenty-server:typeorm migration:generate src/database/typeorm/core/migrations/common/[name] -d src/database/typeorm/core/core.datasource.ts

# Sync metadata
npx nx run twenty-server:command workspace:sync-metadata
```

### GraphQL
```bash
# Generate GraphQL types
npx nx run twenty-front:graphql:generate
npx nx run twenty-front:graphql:generate --configuration=metadata
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 18, TypeScript, Recoil (state management), Emotion (styling), Vite
- **Backend**: NestJS, TypeORM, PostgreSQL, Redis, GraphQL (with GraphQL Yoga)
- **Monorepo**: Nx workspace managed with Yarn 4

### Package Structure
```
packages/
├── twenty-front/          # React frontend application
├── twenty-server/         # NestJS backend API
├── twenty-ui/             # Shared UI components library
├── twenty-shared/         # Common types and utilities
├── twenty-emails/         # Email templates with React Email
├── twenty-website/        # Next.js documentation website
├── twenty-zapier/         # Zapier integration
└── twenty-e2e-testing/    # Playwright E2E tests
```

---

## Frontend Development Rules

### 1. Components
- **Functional components ONLY** - never use class components
- **Named exports ONLY** - never use default exports
- Destructure props explicitly, never spread them
- Pass uninstantiated components as props using PascalCase

```tsx
// CORRECT
export const MyComponent = ({ title, onClick }: MyComponentProps) => {
  return <StyledContainer onClick={onClick}>{title}</StyledContainer>;
};

// WRONG - default export
export default function MyComponent() { ... }

// WRONG - spreading props
export const MyComponent = (props: MyComponentProps) => {
  return <StyledContainer {...props} />;
};
```

### 2. Types vs Interfaces
- **Use types, NOT interfaces** (except when extending third-party interfaces)
- **Use string literals instead of enums** (except GraphQL codegen enums)
- **Never use `any`** - always provide explicit types

```tsx
// CORRECT
type ButtonVariant = 'primary' | 'secondary' | 'danger';

type ButtonProps = {
  variant: ButtonVariant;
  label: string;
  onClick: () => void;
};

// WRONG - using interface
interface ButtonProps { ... }

// WRONG - using enum
enum ButtonVariant { Primary, Secondary, Danger }

// WRONG - using any
const handleData = (data: any) => { ... }
```

### 3. State Management (Recoil)
- Use `useRecoilState` for global state - create as many atoms as needed
- Never use `useRef` for storing state
- Use Recoil family states/selectors to avoid re-renders
- Minimize prop drilling; use Recoil for complex state

```tsx
// CORRECT - Recoil atom
export const currentUserState = atom<User | null>({
  key: 'currentUserState',
  default: null,
});

// Usage
const [currentUser, setCurrentUser] = useRecoilState(currentUserState);
```

### 4. Managing Re-renders
- **Minimize useEffect usage** - prefer event handlers
- **AVOID React.memo()** - it breaks the re-render chain
- **Limit useCallback and useMemo** - usually unnecessary
- Use `PageChangeEffect` sidecar component for page-level effects

```tsx
// CORRECT - event handler
const handleEmailChange = (email: string) => {
  setEmail(email);
  validateEmail(email);
};

// WRONG - useEffect for derived state
useEffect(() => {
  validateEmail(email);
}, [email]);
```

### 5. Naming Conventions
- Event handlers: prefix with `handle` (e.g., `handleEmailChange`)
- Component props: prefix with `on` (e.g., `onClick`)
- Styled components: prefix with `Styled` (e.g., `StyledContainer`)
- Use descriptive names (`email` not `value`, `user` not `data`)

### 6. Styling (Emotion/styled-components)
- **Always use styled-components pattern**
- **Always use theme values** - never hardcode px/rem/colors
- **No inline styles**
- Prefix styled elements with "Styled"

```tsx
// CORRECT
const StyledButton = styled.button`
  padding: ${({ theme }) => theme.spacing(2)};
  background-color: ${({ theme }) => theme.color.blue50};
  border-radius: ${({ theme }) => theme.border.radius.md};
`;

// WRONG - hardcoded values
const StyledButton = styled.button`
  padding: 8px;
  background-color: #1e90ff;
`;

// WRONG - inline styles
<button style={{ padding: '8px' }}>Click</button>
```

### 7. Import Aliases
```tsx
// CORRECT - use aliases
import { Component } from '~/modules/path/Component';
import { Hook } from '@/path/Hook';

// WRONG - relative paths
import { Component } from '../../../../../modules/path/Component';

// Alias mapping:
// "~" → src/
// "@" → src/modules/
// "@testing" → src/testing/
```

### 8. Frontend Folder Structure
```
modules/
└── module-name/
    ├── components/
    │   └── ComponentName/
    │       └── ComponentName.tsx
    ├── constants/
    ├── contexts/
    ├── graphql/
    │   ├── fragments/
    │   ├── queries/
    │   └── mutations/
    ├── hooks/
    │   └── internal/  # module-only hooks
    ├── states/
    │   └── selectors/
    ├── types/
    └── utils/
```

### 9. Additional Frontend Rules
- Use nullish coalescing (`??`) instead of logical OR (`||`)
- Use optional chaining (`?.`) instead of manual null checks
- Do NOT use `import type` - import types alongside values
- Use Zod for schema validation of untyped objects
- Remove ALL `console.log` statements before committing

---

## Backend Development Rules

### 1. Module Architecture
- Follow NestJS modular approach
- Each module encapsulates specific features
- Expose services through dependency injection
- Promote loose coupling between components

```ts
// CORRECT - well-structured module
@Module({
  imports: [TypeOrmModule.forFeature([Company])],
  providers: [CompanyService, CompanyResolver],
  exports: [CompanyService], // Expose for other modules
})
export class CompanyModule {}
```

### 2. Type Safety
- **Never use `any` type** - always provide explicit types
- Create interfaces/types for all objects
- Let TypeScript inference work, don't override it

```ts
// CORRECT
type CreateCompanyInput = {
  name: string;
  domain: string;
  employees?: number;
};

const createCompany = async (input: CreateCompanyInput): Promise<Company> => {
  // ...
};

// WRONG
const createCompany = async (input: any): Promise<any> => {
  // ...
};
```

### 3. Service Design
- Single responsibility principle
- Descriptive, consistent naming
- Inject dependencies via constructor

```ts
@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findById(id: string): Promise<Company | null> {
    return this.companyRepository.findOne({ where: { id } });
  }
}
```

### 4. Backend Folder Structure
```
server/
├── ability/           # Permissions
├── core/              # Core business logic
├── database/
├── decorators/        # Custom decorators
├── filters/           # Exception filters
├── guards/            # Auth guards
├── health/            # Health check API
├── integrations/
├── metadata/          # Custom objects metadata
└── workspace/         # Per-workspace GraphQL
    ├── workspace-schema-builder/
    ├── workspace-resolver-builder/
    ├── workspace-query-builder/
    └── workspace-query-runner/
```

### 5. Feature Flags
```ts
// Define in FeatureFlagKey.ts
type FeatureFlagKey = 'IS_MYFEATURE_ENABLED' | ...;

// Backend usage with decorator
@Gate({ featureFlag: 'IS_MYFEATURE_ENABLED' })
@Query(() => [MyObject])
async myQuery() { ... }

// Frontend usage
const isEnabled = useIsFeatureEnabled('IS_MYFEATURE_ENABLED');
```

### 6. Message Queue (BullMQ)
```ts
// Add to MESSAGE_QUEUES enum
// Create worker class

@Injectable()
class MyWorker {
  constructor(
    @Inject(MESSAGE_QUEUES.myQueue)
    private readonly queue: MessageQueueService,
  ) {
    this.initWorker();
  }

  async initWorker() {
    await this.queue.work(async ({ id, data }) => {
      // Process job
    });
  }
}
```

### 7. Database Migrations
```bash
# Generate migration
npx nx run twenty-server:typeorm migration:generate \
  src/database/typeorm/core/migrations/MyMigration \
  -d src/database/typeorm/core/core.datasource.ts

# Sync metadata after changes
npx nx run twenty-server:command workspace:sync-metadata -f
```

---

## GraphQL Operations

### Schema Generation
```bash
# Regenerate types after schema changes
npx nx run twenty-front:graphql:generate
npx nx run twenty-front:graphql:generate --configuration=metadata
```

### Query/Mutation Location
Place GraphQL operations in the appropriate module:
```
modules/module-name/graphql/
├── fragments/
│   └── companyFragment.ts
├── queries/
│   └── getCompanies.ts
└── mutations/
    └── createCompany.ts
```

---

## Testing Requirements

### Frontend
- Jest for utility function tests (NOT component tests)
- Storybook for component testing and documentation
- Always run `npx nx run twenty-front:test` before committing

### Backend
- Unit tests: `npx nx run twenty-server:test:unit`
- Integration tests: `npx nx run twenty-server:test:integration`
- Add tests for new functionality

---

## Pre-Commit Checklist

Before committing ANY changes:

1. **Remove all console.log statements**
2. **Run linting**: `npx nx run <package>:lint --fix`
3. **Run type checking**: `npx nx typecheck <package>`
4. **Run tests**: `npx nx run <package>:test`
5. **Test manually** in the browser/API

---

## Common Patterns

### Creating a New Module (Frontend)

1. Create folder structure under `modules/`
2. Create component with named export
3. Create Recoil atoms in `states/`
4. Create hooks in `hooks/`
5. Add GraphQL operations in `graphql/`
6. Export from module index

### Creating a New Endpoint (Backend)

1. Create/update module in appropriate folder
2. Create service with business logic
3. Create resolver for GraphQL or controller for REST
4. Add types/DTOs
5. Register in module imports/exports
6. Run metadata sync if needed

### Adding a Feature Flag

1. Add key to `FeatureFlagKey.ts`
2. Add enum value to `feature-flag.entity.ts`
3. Seed flag in database
4. Use `@Gate` decorator (backend) or `useIsFeatureEnabled` (frontend)

---

## Don'ts

- Don't use class components
- Don't use default exports
- Don't use interfaces (use types)
- Don't use enums (use string literals)
- Don't use `any` type
- Don't use `React.memo()` without strong reason
- Don't hardcode colors or spacing values
- Don't use inline styles
- Don't leave console.log statements
- Don't skip pre-commit hooks
- Don't use relative imports with many `../`
- Don't use `useRef` for state
- Don't use `useEffect` when event handlers work

---

## Important Files
- `nx.json` - Nx workspace configuration with task definitions
- `tsconfig.base.json` - Base TypeScript configuration
- `package.json` - Root package with workspace definitions
- `.cursor/rules/` - Development guidelines and best practices
