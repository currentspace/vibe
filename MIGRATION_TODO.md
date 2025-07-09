# Monorepo Migration TODO List

## Phase 1: Setup Base Structure ✅

- [ ] Create base directories
  - [ ] Create `packages/` directory
  - [ ] Create `packages/core/`
  - [ ] Create `packages/api/`
  - [ ] Create `packages/components/`
  - [ ] Move `apps/web` to `packages/web`
  - [ ] Move `apps/signaling` to `packages/signaling`
- [ ] Update workspace configuration
  - [ ] Update `pnpm-workspace.yaml` to use `packages/*`
  - [ ] Create `tsconfig.base.json` at root
  - [ ] Update root `package.json` scripts
- [ ] Test build and lint after structure change
- [ ] Commit: "chore: migrate to packages structure"

## Phase 2: Extract Core Types and Interfaces

- [ ] Create core package structure
  - [ ] Create `packages/core/package.json`
  - [ ] Create `packages/core/tsconfig.json`
  - [ ] Create `packages/core/src/types/`
  - [ ] Create `packages/core/src/hooks/`
  - [ ] Create `packages/core/src/index.ts`
- [ ] Extract WebRTC types
  - [ ] Move `Participant` interface to `core/types/participant.ts`
  - [ ] Move `Room` interface to `core/types/room.ts`
  - [ ] Move `SignalingMessage` types to `core/types/signaling.ts`
- [ ] Extract Kintsugi types
  - [ ] Move `KintsugiParams` to `core/types/kintsugi.ts`
- [ ] Update imports in web and signaling packages
- [ ] Build and lint
- [ ] Commit: "feat: extract core types"

## Phase 3: Create API Package

- [ ] Create API package structure
  - [ ] Create `packages/api/package.json`
  - [ ] Create `packages/api/tsconfig.json`
  - [ ] Create `packages/api/src/`
- [ ] Add Zod as dependency
- [ ] Create validation schemas
  - [ ] Create `packages/api/src/schemas/room.ts`
  - [ ] Create `packages/api/src/schemas/signaling.ts`
  - [ ] Create `packages/api/src/schemas/user.ts`
- [ ] Create API contracts
  - [ ] Define REST endpoints types
  - [ ] Define WebSocket message contracts
- [ ] Update signaling server to use API schemas
- [ ] Build and lint
- [ ] Commit: "feat: create api validation package"

## Phase 4: Extract Business Logic to Core

- [ ] Move WebRTC logic
  - [ ] Create `packages/core/src/webrtc/`
  - [ ] Extract WebRTC connection management logic
  - [ ] Extract room management logic
- [ ] Move hooks
  - [ ] Create `packages/core/src/hooks/useWebRTC.ts`
  - [ ] Create `packages/core/src/hooks/useSignaling.ts`
  - [ ] Move WebRTC context logic to hooks
- [ ] Extract utilities
  - [ ] Create `packages/core/src/utils/`
  - [ ] Move any shared utilities
- [ ] Update web app to use core hooks
- [ ] Build and lint
- [ ] Commit: "feat: extract business logic to core"

## Phase 5: Create Components Package

- [ ] Setup components package
  - [ ] Create `packages/components/package.json`
  - [ ] Create `packages/components/tsconfig.json`
  - [ ] Create `packages/components/src/`
- [ ] Prepare for platform-specific components
  - [ ] Install React Native types (for future)
  - [ ] Setup bundler configuration for `.web.tsx` and `.native.tsx`
- [ ] Migrate existing components
  - [ ] Move `Button` component
    - [ ] Create `Button.types.ts`
    - [ ] Create `Button.web.tsx`
    - [ ] Create `Button.native.tsx` (stub for now)
  - [ ] Move `ConnectionStatus` component
    - [ ] Create platform-specific versions
  - [ ] Move `ParticipantList` component
    - [ ] Create platform-specific versions
- [ ] Create barrel exports
  - [ ] Create `packages/components/src/index.ts`
- [ ] Update web imports
- [ ] Build and lint
- [ ] Commit: "feat: create shared components package"

## Phase 6: Refactor WebGL/Three.js Components

- [ ] Decide on WebGL strategy
  - [ ] Keep WebGL components in web package (web-only)
  - [ ] OR create `packages/webgl` for potential reuse
- [ ] Extract WebGL utilities if shared
  - [ ] Shader utilities
  - [ ] Geometry helpers
- [ ] Document WebGL component boundaries
- [ ] Build and lint
- [ ] Commit: "refactor: organize WebGL components"

## Phase 7: Update Build Configuration

- [ ] Update TypeScript configs
  - [ ] Ensure all packages extend `tsconfig.base.json`
  - [ ] Add project references
  - [ ] Configure path aliases (@vibe/core, @vibe/api, etc)
- [ ] Update build scripts
  - [ ] Add `build:packages` script
  - [ ] Update CI/CD workflows
- [ ] Configure bundlers
  - [ ] Update Next.js config for monorepo
  - [ ] Configure module resolution
- [ ] Test full build
- [ ] Build and lint all packages
- [ ] Commit: "chore: update build configuration"

## Phase 8: Prepare for React Native

- [ ] Create native package structure
  - [ ] Create `packages/native/` directory
  - [ ] Add React Native package.json (placeholder)
  - [ ] Add README with setup instructions
- [ ] Document component contracts
  - [ ] Create component interface documentation
  - [ ] Add examples of web vs native implementations
- [ ] Create native stubs for existing components
- [ ] Build and lint
- [ ] Commit: "feat: prepare native package structure"

## Phase 9: Documentation and Scripts

- [ ] Update root README
  - [ ] Document new structure
  - [ ] Add architecture diagram
  - [ ] Update development instructions
- [ ] Create package READMEs
  - [ ] Core package documentation
  - [ ] API package documentation
  - [ ] Components package documentation
- [ ] Update/create development scripts
  - [ ] `dev:web` - run web app
  - [ ] `dev:native` - run native app (future)
  - [ ] `dev:all` - run all packages
  - [ ] `test:all` - test all packages
- [ ] Create migration guide
- [ ] Build and lint
- [ ] Commit: "docs: update documentation for new structure"

## Phase 10: Cleanup and Optimization

- [ ] Remove old `apps/` directory
- [ ] Clean up duplicate types/interfaces
- [ ] Optimize package dependencies
  - [ ] Move dev dependencies to root where possible
  - [ ] Ensure production dependencies are minimal
- [ ] Add package bundling
  - [ ] Setup build outputs for packages
  - [ ] Configure tree-shaking
- [ ] Final build and test
- [ ] Commit: "chore: cleanup and optimize packages"

## Incremental Migration Strategy

1. **Start with Phase 1-2**: Get basic structure in place
2. **Test thoroughly** after each phase
3. **Keep the app working** throughout migration
4. **Commit frequently** with clear messages
5. **Run `pnpm build && pnpm lint` after each step**

## Success Criteria

- [ ] All packages build successfully
- [ ] No circular dependencies
- [ ] Clear separation of concerns
- [ ] Web app works as before
- [ ] Ready to add React Native app
- [ ] All tests pass
- [ ] Documentation is complete