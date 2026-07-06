<!--
Sync Impact Report
- Version change: unratified template -> 1.0.0
- Modified principles: none (initial ratification)
- Added principles:
  - I. User Value and Toy Isolation
  - II. Colocation and Human-Navigable Structure
  - III. SOLID by Proportion
  - IV. Readable Code
  - V. Comments Preserve Intent
  - VI. Vertical Slices
- Added sections:
  - Technical and Architectural Constraints
  - Development Workflow and Quality Gates
- Removed sections: none (template placeholders replaced)
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md
  - ✅ .specify/templates/spec-template.md
  - ✅ .specify/templates/tasks-template.md
  - ✅ .specify/templates/checklist-template.md (reviewed; no change required)
  - ✅ .specify/templates/commands/*.md (directory absent; no command templates to update)
- Runtime guidance reviewed:
  - ✅ AGENTS.md
  - ✅ CONTRIBUTING.md (no change required)
  - ✅ README.md
  - ✅ .github/pull_request_template.md
- Follow-up TODOs: none
-->
# Toys Constitution

## Core Principles

### I. User Value and Toy Isolation

Each toy MUST deliver a small, identifiable user outcome and MUST remain independently
navigable, testable, and changeable. Each toy MUST have one primary page under
`src/app/(toys)/<slug>/`. A change to one toy MUST NOT modify another toy unless the change
intentionally updates a documented shared contract. The home page MUST derive its toy list
from `src/toys/registry.ts`; duplicate hand-maintained listings are prohibited.

Rationale: independent toys keep additions cheap and prevent unrelated behavior from becoming
coupled.

### II. Colocation and Human-Navigable Structure

Toy-specific components, hooks, state, utilities, types, styles, and tests MUST be colocated in
that toy's `src/app/(toys)/<slug>/` directory. Code MAY move to `src/components/` or `src/lib/`
only when it has a stable, genuinely shared responsibility. Names and directory boundaries MUST
express product concepts rather than incidental technical layers. A reader MUST be able to find
a toy's behavior by starting at its route without searching unrelated directories.

Rationale: proximity of related code lowers navigation cost while deliberate shared boundaries
prevent premature abstraction.

### III. SOLID by Proportion

Production code MUST follow the SOLID principles at the scale of this project:

- each module, component, and function MUST have one coherent reason to change;
- new behavior MUST be added through clear boundaries instead of growing fragile conditionals;
- implementations that share a contract MUST preserve that contract's observable behavior;
- props and interfaces MUST expose only what their consumers require; and
- domain behavior MUST depend on narrow boundaries rather than concrete infrastructure when an
  external dependency or volatile implementation is involved.

SOLID MUST NOT be used to justify speculative interfaces, empty layers, or single-use factories.
Any additional abstraction MUST identify the concrete coupling or change pressure it resolves.

Rationale: SOLID controls change cost only when applied to real boundaries, not as ceremony.

### IV. Readable Code

Code MUST apply the principles of *The Art of Readable Code*: names MUST communicate intent;
functions and components MUST stay focused; control flow MUST be direct; related expressions
MUST be grouped; and intermediate values MUST make non-obvious transformations explicit. Code
MUST avoid ambiguous abbreviations, boolean arguments with unclear meaning, deeply nested logic,
hidden side effects, and mixed abstraction levels. Public behavior and errors MUST use the
project's domain vocabulary consistently.

Rationale: code is maintained more often than it is written, so comprehension time is a primary
engineering cost.

### V. Comments Preserve Intent

Comments MUST be understandable to a human reader and MUST explain intent, constraints,
trade-offs, or surprising behavior that the code cannot express clearly. Comments MUST NOT merely
restate syntax. Any comment affected by a code change MUST be updated or removed in the same
change. Public types or contracts whose correct use is not obvious MUST document units, formats,
invariants, or failure behavior next to the declaration.

Rationale: useful comments preserve context that code cannot; stale or redundant comments make
the code harder to trust.

### VI. Vertical Slices

Specifications and task plans MUST be divided by user-visible capability or independently
valuable behavior, not by horizontal layers such as "all UI", "all models", or "all tests".
Each user-story slice MUST include the UI, behavior, data handling, tests, and documentation needed
to satisfy its acceptance scenarios. Each slice MUST state an independent verification method and
MUST leave the application in a usable state. Shared setup tasks MUST be limited to unavoidable
prerequisites and MUST name the slices they unblock.

Rationale: vertical slices produce reviewable increments, expose integration risk early, and keep
progress tied to user value.

## Technical and Architectural Constraints

- The repository MUST remain a single Next.js application; converting it into a monorepo requires
  a constitutional amendment.
- The fixed stack is Next.js 16 App Router with Turbopack, React 19 with React Compiler,
  strict TypeScript, and Tailwind CSS v4.
- Route Groups MUST separate toys without changing their public URL. New toys MUST be generated
  with `pnpm new-toy <slug>`, using a kebab-case slug; the generated registry entry and home-page
  listing MUST NOT be recreated manually.
- Package management and script execution MUST use pnpm. npm, Yarn, and Bun are prohibited.
- Formatting and linting MUST use Biome only. Prettier and ESLint MUST NOT be introduced.
- Client Components MUST be limited to boundaries that require browser state, effects, events, or
  browser-only APIs. Server Components remain the default elsewhere.
- Existing toys and shared contracts MUST remain untouched by unrelated changes.

## Development Workflow and Quality Gates

- A feature specification MUST define prioritized, independently testable user scenarios and
  measurable acceptance outcomes before implementation planning.
- An implementation plan MUST document the real repository paths, intended colocation boundary,
  shared-code justification, SOLID responsibilities, and any necessary complexity exception.
- A task list MUST organize work into vertical user-story slices. Tasks MUST include exact paths,
  dependencies when present, and a concrete completion check.
- Behavior changes MUST include tests at the narrowest useful level. Critical user journeys and
  route integration MUST receive end-to-end coverage when unit or component tests cannot establish
  the acceptance outcome.
- Before merge, `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm build`, and
  `pnpm test:e2e` MUST pass. A documented infrastructure incident MAY defer an unavailable external
  check, but not a failing check.
- Changes and commits MUST be small and single-purpose. Commit messages MUST follow Conventional
  Commits and use the toy slug as scope for toy-specific changes.
- Review MUST verify user-story acceptance, toy isolation, colocation, SOLID responsibility
  boundaries, readable naming and flow, comment accuracy, and all quality gates.

## Governance

This constitution is the governing source for Spec Kit artifacts and engineering principles in
this repository. `AGENTS.md` provides operational instructions and MUST remain consistent with it.
If the two documents conflict, work MUST stop until the conflict is resolved by an amendment.

Amendments MUST include the proposed text, rationale, migration impact, affected templates and
runtime guidance, and reviewer approval. The amendment MUST update the Sync Impact Report and all
affected artifacts in the same change.

Constitution versions follow semantic versioning: MAJOR for incompatible principle or governance
changes, MINOR for new principles or materially expanded obligations, and PATCH for clarifications
that do not change obligations. Every plan MUST pass its Constitution Check before research and
again after design. Every task list and pull request review MUST demonstrate compliance; any
exception MUST be explicit in the plan's Complexity Tracking table and approved before
implementation.

**Version**: 1.0.0 | **Ratified**: 2026-07-06 | **Last Amended**: 2026-07-06
