---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Behavior-changing slices MUST include tests at the narrowest useful level. Add Playwright
coverage when component or unit tests cannot prove the user journey.

**Organization**: Tasks MUST be grouped into vertical user-story slices. Each slice includes all UI,
behavior, data handling, tests, and documentation needed to deliver independently verifiable value.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Toy-specific code and tests**: `src/app/(toys)/<slug>/`
- **Shared UI**: `src/components/` only for stable UI used by multiple consumers
- **Shared non-UI code**: `src/lib/` only for stable behavior used by multiple consumers
- **Toy registry**: `src/toys/registry.ts` (updated only through `pnpm new-toy <slug>` for new toys)
- **End-to-end tests**: `e2e/`

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment

  Do not create horizontal phases for all components, all state, or all tests. Keep those tasks
  inside the user-story slice that consumes them. Shared setup is allowed only when unavoidable,
  and each shared task must name the stories it unblocks.

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Minimal Shared Prerequisites)

**Purpose**: Only the unavoidable work that blocks more than one user-story slice

- [ ] T001 Run `pnpm new-toy [slug]` to create the route and registry entry in [exact paths]
- [ ] T002 [P] Add only the shared prerequisite required by [US1, US2] in [exact path]

---

## Phase 2: Foundational (Use Only When Truly Blocking)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of legitimate foundational tasks (remove this phase when none apply):

- [ ] T003 Define the external-service boundary required by [US1, US2] in [exact path]
- [ ] T004 Configure the environment contract required by [US1, US2] in [exact path]

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T005 [P] [US1] Add component behavior test in src/app/(toys)/[slug]/[feature].test.tsx
- [ ] T006 [P] [US1] Add journey test in e2e/[slug].spec.ts when required by acceptance criteria

### Implementation for User Story 1

- [ ] T007 [P] [US1] Add focused [component or domain behavior] in src/app/(toys)/[slug]/[file].tsx
- [ ] T008 [US1] Integrate [behavior] into src/app/(toys)/[slug]/page.tsx (depends on T007)
- [ ] T009 [US1] Handle [named error or boundary] in src/app/(toys)/[slug]/[file].ts
- [ ] T010 [US1] Verify [acceptance scenario] with [exact command or manual action]

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2

- [ ] T011 [P] [US2] Add behavior test in src/app/(toys)/[slug]/[feature].test.tsx

### Implementation for User Story 2

- [ ] T012 [P] [US2] Add [complete behavior] in src/app/(toys)/[slug]/[file].tsx
- [ ] T013 [US2] Integrate [behavior] into src/app/(toys)/[slug]/page.tsx
- [ ] T014 [US2] Verify [acceptance scenario] with [exact command or manual action]

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3

- [ ] T015 [P] [US3] Add behavior test in src/app/(toys)/[slug]/[feature].test.tsx

### Implementation for User Story 3

- [ ] T016 [P] [US3] Add [complete behavior] in src/app/(toys)/[slug]/[file].tsx
- [ ] T017 [US3] Integrate [behavior] into src/app/(toys)/[slug]/page.tsx
- [ ] T018 [US3] Verify [acceptance scenario] with [exact command or manual action]

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Documentation updates in [exact path]
- [ ] TXXX Code cleanup and refactoring
- [ ] TXXX Performance optimization across all stories
- [ ] TXXX [P] Additional regression tests in [colocated exact path]
- [ ] TXXX Security hardening
- [ ] TXXX Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Tests for changed behavior MUST be included in the same user-story slice
- Dependencies MUST follow the concrete behavior boundary, not a default layer sequence
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch independent work for User Story 1 together:
Task: "Add behavior test in src/app/(toys)/[slug]/[feature].test.tsx"
Task: "Add isolated UI component in src/app/(toys)/[slug]/[component].tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or small logical group using Conventional Commits
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, horizontal layer phases, unjustified shared files, same-file conflicts, and
  cross-story dependencies that break independence
