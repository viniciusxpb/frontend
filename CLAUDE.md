# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NDNM Frontend** - A React-based node editor frontend for a visual programming system. This is part of a larger ecosystem that includes a Rust backend (ndnm-brazil orchestrator and ndnm-backend nodes).

The frontend is a dynamic shell that receives node type definitions from the backend via WebSocket and renders them using @xyflow/react. It has minimal hardcoded node logic - almost everything is driven by configuration from the backend.

## Key Development Commands

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Preview production build
yarn preview
```

## Tech Stack

- **React 18** + TypeScript
- **Vite** - Build tool and dev server
- **@xyflow/react** - Node-based UI library for the flow canvas
- **SASS** - Styling
- Path alias: `@/` maps to `src/`

## Architecture

### Component Hierarchy

```
App (WebSocket client init)
└── ReactFlowProvider
    ├── WebSocketStatus (connection indicator)
    └── FlowController (state orchestration)
        ├── LeftPanel (workspace management)
        ├── FlowCanvas (node editor surface)
        │   └── BaseIONode components (dynamic nodes)
        └── HackerModal
            └── NodeCatalog (node picker)
```

### State Management Pattern

The app uses a **hook-based state management** pattern without external state libraries:

- `useFlowStateSync` - Core ReactFlow state (nodes, edges, change handlers)
- `useFlowInteraction` - User interactions (pane clicks, connections, modal)
- `useWorkspacePersistence` - Save/load workspaces to backend
- `useNodePalette` - Receives node type definitions via WebSocket
- `useWsClient` - WebSocket connection with auto-reconnect and heartbeat

### Dynamic Node System

**Critical Concept**: The frontend does NOT have hardcoded node types. All node definitions come from the backend via WebSocket `NODE_CONFIG` messages.

Each node has:
- `type` - unique identifier
- `label` - display name
- `default_data` - includes `inputsMode`, `outputsMode`, `input_fields`, etc.
- `input_fields` - array of field definitions (type: 'text' | 'selector')

**BaseIONode** (`src/nodes/BaseIONode.tsx`) is the generic component that renders all node types dynamically based on their `input_fields` configuration.

### WebSocket Communication

- **URL**: Built via `buildWsUrl()` utility (defaults to `ws://localhost:3010`)
- **Messages from Backend**:
  - `NODE_CONFIG` - Array of available node types (sent on connection)
  - Custom messages for node execution results (future)
- **Connection Management**: Auto-reconnect with exponential backoff, heartbeat ping every 25s

### Function Reference Restoration

**Important Pattern**: When workspaces are saved/loaded, node data loses function references (e.g., `onChange` callbacks). The `FlowController` component is responsible for reassigning these functions via `handleNodeValueChange` after loading nodes from storage.

```typescript
// In FlowController.tsx
const handleNodeValueChange = useCallback((nodeId: string, value: string) => {
  setNodes(nds => nds.map(node =>
    node.id === nodeId ? {
      ...node,
      data: { ...node.data, value }
    } : node
  ));
}, [setNodes]);
```

### Dynamic Handle System

Nodes can have dynamic input/output handles based on their `inputsMode` and `outputsMode`:
- `0` - No handles
- `1` - Single handle (default)
- `'n'` - Dynamic handles that grow as connections are made

The `normalizeAllNodesIO` utility (from `flowUtils.ts`) automatically adjusts handle counts based on active edge connections, always keeping one spare handle available.

## File Organization

```
src/
├── components/     # Reusable UI components
│   ├── FileBrowser.tsx      # File/folder picker via HTTP API
│   ├── HackerModal.tsx      # Modal wrapper
│   ├── LeftPanel.tsx        # Workspace save/load UI
│   ├── NodeCatalog.tsx      # Node type picker
│   ├── SelectorControl.tsx  # File/folder selector control
│   └── WebSocketStatus.tsx  # Connection indicator
├── flow/           # Flow canvas components
│   ├── FlowCanvas.tsx       # Main ReactFlow canvas
│   ├── FlowController.tsx   # State orchestration
│   └── FlowInner.tsx        # (if exists)
├── hooks/          # Custom React hooks
│   ├── useFlowInteraction.ts
│   ├── useFlowStateSync.ts
│   ├── useNodePalette.ts
│   ├── usePaneClickCombo.ts
│   ├── useWorkspacePersistence.ts
│   └── useWsClient.ts
├── nodes/          # Node-related code
│   ├── BaseIONode.tsx       # Generic dynamic node component
│   ├── registry.ts          # NodePaletteItem type definition
│   └── [specific nodes].tsx # Specific node implementations
├── utils/          # Utility functions
│   ├── flowUtils.ts         # Node I/O normalization logic
│   └── wsUrl.ts             # WebSocket URL builder
└── styles/         # SCSS styling
    └── hacker.scss          # Hacker-themed UI styles
```

## Code Style Conventions

Based on the existing codebase and team manifesto:

1. **File Path Comments**: First line of each file should have a comment with the file path
2. **Arrow Functions**: Prefer arrow functions for components and callbacks
3. **TypeScript**: Strict mode enabled, use proper typing
4. **Logging**: Use descriptive console logs with emoji prefixes for debugging
   - Example: `console.log('🔥 [Component] Action description:', data)`
5. **File Length**: Keep files under 150 lines when possible (break into smaller components/hooks)
6. **No Inline Comments**: Avoid comments inside code blocks - code should be self-documenting

## Backend Integration

The frontend communicates with two backend services:

1. **WebSocket Server** (ndnm-brazil, port 3010)
   - Node catalog (NODE_CONFIG)
   - Real-time updates
   - Command broadcast

2. **HTTP API** (port 3011)
   - File browser endpoint: `POST /run` with `{ path: string }`
   - Workspace persistence (if implemented)

## Common Workflows

### Adding Support for a New Node Field Type

1. Update `input_fields` handling in `BaseIONode.tsx`
2. Add rendering logic in `renderInputControl` function
3. Ensure the field type is documented in backend node definitions

### Debugging WebSocket Issues

- Check console for `[WS Front]` prefixed logs
- Status indicator shows connection state (idle/connecting/open/closing/closed)
- Auto-reconnect with exponential backoff (750ms base, 10s max)
- Heartbeat ping every 25s to keep connection alive

### Testing Node Interactions

- Use browser DevTools to inspect node data structure
- Check `FlowController` logs for node/edge counts
- Verify `onChange` callbacks are properly assigned after workspace load

## Important Notes

- The frontend is intentionally "dumb" - it renders what the backend tells it to render
- Node types are NOT defined in frontend code - they come from backend config.yaml files
- When adding UI features, ensure they work with the dynamic node system
- Always test workspace save/load to ensure function references are restored correctly
