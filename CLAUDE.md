# Vibe Monorepo Dependency Management

## Project Structure
- **Root**: pnpm managed monorepo with workspace configuration
- **Workspace packages**: Defined in `pnpm-workspace.yaml` as `apps/*` and `packages/*`
- **Current packages**:
  - `apps/signaling`: Express.js WebSocket signaling server
  - `apps/web`: Next.js web application

## Dependency Update Process
To update all dependencies in this monorepo:

```bash
# Update all dependencies to latest versions across all workspaces
pnpm update -r --latest

# Alternative: Update specific workspace
pnpm update --latest --filter=signaling
pnpm update --latest --filter=web
```

## Key Dependencies
### Signaling Service (apps/signaling)
- **Runtime**: Express 5.x, Socket.io 4.x, cors, dotenv, uuid
- **Development**: TypeScript 5.x, Vitest, ESLint 9.x, tsx

### Web App (apps/web)  
- **Runtime**: Next.js 15.x, React 19.x, Chakra UI 3.x, Socket.io-client
- **Development**: TypeScript 5.x, Vitest, ESLint 9.x

## Important Commands
- `pnpm dev`: Run both web and signaling services
- `pnpm lint`: Run linting across all packages
- `pnpm typecheck`: Type check all packages
- `pnpm test`: Run tests across all packages
- `pnpm build`: Build all packages

## Version Management
- Root `package.json` specifies `packageManager: "pnpm@9"` (though pnpm 10.x is actually installed)
- Node.js requirement: `>=24.0.0`
- All packages use the same pnpm version via packageManager field