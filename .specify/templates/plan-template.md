# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript (strict), Node.js 24+

**Primary Dependencies**: Next.js 16, React 19, Tailwind CSS v4

**Storage**: [browser/server storage used by this feature, or N/A]

**Testing**: Vitest + Testing Library; Playwright for user journeys

**Target Platform**: Modern web browsers via Next.js App Router

**Project Type**: Single Next.js web application

**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]

**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]

**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **User value and isolation**: The plan identifies an independently testable user outcome and
  avoids unrelated changes to existing toys.
- **Colocation**: Toy-specific code and tests stay under `src/app/(toys)/<slug>/`; every proposed
  move to `src/components/` or `src/lib/` names the concrete shared consumers.
- **SOLID and readability**: Responsibilities and dependency boundaries are explicit; abstractions
  solve identified coupling; names and control flow use project vocabulary.
- **Documentation comments**: Every new or changed declaration (public or private) will carry a
  TSDoc comment per the `tsdoc-comments` skill; the plan identifies the non-obvious constraints,
  contracts, and rationale to document, and rejects comments that only restate code.
- **Vertical slices**: Delivery is split into independently verifiable user-story increments, not
  technical layers; shared prerequisites are minimal and name the slices they unblock.
- **Fixed tooling**: The plan uses pnpm, Biome, strict TypeScript, the fixed Next.js/React/Tailwind
  stack, and the repository quality-gate commands.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── app/
│   ├── (toys)/
│   │   └── [slug]/
│   │       ├── page.tsx
│   │       ├── page.test.tsx
│   │       └── [colocated feature files]
│   ├── layout.tsx
│   └── page.tsx
├── components/                 # genuinely shared UI only
├── lib/                        # genuinely shared non-UI code only
└── toys/
    └── registry.ts

e2e/
└── [user-journey].spec.ts
```

**Structure Decision**: [List concrete files for this feature, explain the colocation boundary,
and justify each shared file with its consumers]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
