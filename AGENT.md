I can certainly help you get this set up! While I cannot trigger a direct file download to your local machine, I have formatted the complete, strictly-cited `CLAUDE.md` content below. You can easily copy this text and save it as a new file named `CLAUDE.md` in the root directory of your project.

Here is the comprehensive governance document based strictly on the provided architectural blueprints:

---

# CLAUDE.md

## 1. Project Overview & Architectural Philosophy

You are operating within a foundational React boilerplate designed for evolutive corporate systems. Your primary objective is to maximize architectural integrity, enforce structural modularity, and minimize cumulative technical debt.

The mathematical optimization of these architectural choices focuses on the reduction in cumulative technical debt. If $D$ represents the total technical debt of a project and $t$ represents time , this architecture aims for a debt growth rate where $\frac{dD}{dt}$ remains constant or decreases over time through modularity and AI-assisted refactoring.

## 2. Technology Stack Constraints

You must strictly adhere to the following toolchain:

* 
**Core Library**: React 19+ utilizes the React Compiler and Server Actions for reduced manual optimization.


* 
**Build Tool**: Vite uses native ESM for development and Rollup for production builds.


* 
**Language**: TypeScript enforces type safety and enhances IDE support for junior developers.


* 
**Package Manager**: pnpm ensures efficient disk usage and strict dependency tree management.


* 
**Linter/Formatter**: BiomeJS serves as a high-performance, single-tool alternative to ESLint and Prettier.


* 
**Styling**: Tailwind CSS provides a utility-first approach for rapid development and consistent design tokens.


* 
**Validation**: Zod is used as a TypeScript-first schema declaration and validation library.



## 3. Architectural Synthesis: FSD + Atomic Design

This codebase utilizes a hybrid architectural strategy that combines the hierarchical clarity of Atomic Design with the domain-centric boundaries of Feature-Sliced Design (FSD).

### Feature-Sliced Design Layers

You must respect strict dependency directions where higher layers can only import from lower ones:

| Layer | Dependency Order | Responsibility |
| --- | --- | --- |
| `app` | 1 (Highest) | Global providers, routing, and initialization logic.

 |
| `pages` | 2 | Concrete screens composed of widgets and features.

 |
| `widgets` | 3 | Large UI blocks like headers or sidebars.

 |
| `features` | 4 | Specific user interactions (e.g., "Add to Cart", "Login").

 |
| `entities` | 5 | Core business models (e.g., User, Product, Order).

 |
| `shared` | 6 (Lowest) | Generic UI kit (Atoms/Molecules), API clients, and utils.

 |

### Integration & Module Rules

* 
**Public APIs (Gatekeepers)**: The inclusion of an `index.ts` file acting as a Public API for every slice is a non-negotiable requirement. Expose only necessary components and logic while hiding internal implementation details.


* 
**Atomic Layering**: The `shared` layer contains the generic Atomic components (Atoms and Molecules). The `entities` and `features` layers utilize these components to build domain-specific Organisms. * **Adapter Pattern**: When integrating third-party UI libraries, the boilerplate employs the Adapter pattern to decouple application logic from the library's specific API. Expose a standardized set of props to the application while internally rendering the third-party primitive.



## 4. State Management & API Integration

Maintain a strict separation between server state (remote data) and client state (local UI behavior).

* 
**Server State**: TanStack Query is the recommended standard for managing data fetched from REST APIs. API interactions must be abstracted into custom hooks within the `entities` or `features` layers.


* 
**Client State**: Zustand is the preferred choice for global UI state. Its minimal-boilerplate, hook-based API utilizes a selector-based subscription model to ensure components only re-render when specific state updates.



## 5. Code Standards & Naming Conventions

* 
**Components**: Use PascalCase for components. Write functional components.


* 
**Hooks & Variables**: Use camelCase for hooks and variables. Extract logic into custom hooks.


* 
**Exports**: Enforce barrel exports.



## 6. Security Standards

Ensure the application implements a multi-layered security strategy.

* 
**XSS Protection**: Strictly audit the use of `dangerouslySetInnerHTML`. Any usage must be justified and wrapped in a DOMPurify sanitization function.


* 
**Token Handling**: Sensitive authentication tokens, such as JWTs, are stored in HttpOnly, Secure, and SameSite=Strict cookies set by the backend.



## 7. AI Agent Directives (Limits & Recommendations)

When operating in this codebase, you must follow these agentic guidelines to avoid violating the architectural integrity of the system:

* 
**Mandatory Plan Mode**: Always use "Plan Mode" (Shift+Tab) to strategize changes before execution.


* 
**TDD-First Approach**: Generate failing tests for a new feature before implementing the component logic.


* 
**Continuous Review**: Use the `/review` command to analyze staged changes for common React performance anti-patterns, such as missing `React.memo` for expensive organisms or unnecessary object creation inside JSX.


* 
**Commands Setup**: Use exact strings for building, testing, and linting the application (e.g., via Biome and Vitest).



---

Would you like me to analyze any specific layer of this architecture (like the `entities` or `shared` structure) to help you begin planning your first components?