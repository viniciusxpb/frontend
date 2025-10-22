# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NDNM Frontend** - A React-based node editor frontend for a visual programming system. This is part of a larger ecosystem that includes:
- **ndnm-brazil** (Rust): Orchestrator that communicates with the frontend via WebSocket and manages nodes via HTTP
- **ndnm-backend** (Rust): Individual microservice nodes that execute specific tasks

The frontend is intentionally a "dumb shell" that receives node type definitions from the backend via WebSocket and renders them dynamically using @xyflow/react. It has minimal hardcoded node logic - almost everything is driven by configuration from the backend.

## Key Development Commands

```bash
# Install dependencies
yarn install

# Start development server (default port 5173)
yarn dev

# Build for production
yarn build

# Preview production build
yarn preview
```

**Note**: This project uses **yarn** as the package manager, not npm.

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
        ├── PinnedPlayButtons (persistent overlay for pinned nodes)
        ├── LeftPanel (workspace management)
        ├── FlowCanvas (node editor surface)
        │   ├── BaseIONode (generic dynamic nodes)
        │   ├── PlayNode (play buttons with pin/unpin)
        │   └── FsBrowserNode (file browser)
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
- `useWorkflowExecution` - Workflow execution via EXECUTE_PLAY messages
- `usePinnedNodes` - Pin/unpin play nodes to persistent UI overlay

### Dynamic Node System

**Critical Concept**: The frontend does NOT have hardcoded node types. All node definitions come from the backend via WebSocket `NODE_CONFIG` messages sent automatically when the connection is established.

Each node definition (NodePaletteItem) has:
- `type` - unique identifier (used as ReactFlow node type)
- `label` - display name shown in the UI
- `default_data` - object containing:
  - `inputsMode` - `0` (no inputs), `1` (single input), or `'n'` (dynamic inputs)
  - `outputsMode` - `0` (no outputs), `1` (single output), or `'n'` (dynamic outputs)
  - `input_fields` - array of field definitions (type: 'text' | 'selector')
  - `value` - default value for the node

**BaseIONode** (`src/nodes/BaseIONode.tsx`) is the generic component that renders all node types dynamically. It:
- Finds the first renderable field from `input_fields` (text or selector type)
- Renders appropriate control (text input or SelectorControl)
- Handles dynamic I/O based on `inputsMode` and `outputsMode`
- Currently only renders the first matching field (future: may support multiple fields)

### WebSocket Communication

- **URL**: Built via `buildWsUrl()` utility
  - Default: `ws://localhost:3100/ws`
  - Can be overridden via environment variables:
    - `VITE_WS_URL` - Full WebSocket URL
    - `VITE_WS_HOST` - Host only (default: localhost)
    - `VITE_WS_PORT` - Port only (default: 3100)
    - `VITE_WS_PATH` - Path only (default: /ws)
- **Messages from Backend**:
  - `NODE_CONFIG` - Array of available node types (sent on connection)
  - `EXECUTION_STATUS` - Real-time workflow execution updates
  - `EXECUTION_COMPLETE` - Workflow finished successfully (with metrics)
  - `EXECUTION_ERROR` - Workflow execution failed
- **Messages to Backend**:
  - `EXECUTE_PLAY` - Trigger workflow execution from a Play node
- **Connection Management**: Auto-reconnect with exponential backoff (750ms base, 10s max), heartbeat ping every 25s
- **Debug Logging**: All WebSocket messages are logged with `[WS Front]` prefix when debug mode is enabled

### Function Reference Restoration

**Critical Pattern**: When workspaces are saved/loaded, node data loses function references (e.g., `onChange` callbacks) during JSON serialization. The system handles this in multiple places:

1. **FlowController** creates `handleNodeValueChange` and passes it to `useFlowInteraction`
2. **useFlowInteraction** assigns `onChange` to newly created nodes via `addNodeByType`
3. **LeftPanel** reassigns functions when loading workspaces via `handleLoadWorkspaceFromPanel`

This restoration pattern is essential - without it, node inputs won't update their state properly.

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

// Passed to useFlowInteraction
const { ... } = useFlowInteraction({
  nodes, edges, setNodes, setEdges, nodePalette,
  onNodeValueChange: handleNodeValueChange
});

// Reassigned when loading workspaces
const handleLoadWorkspaceFromPanel = useCallback((newNodes: Node[], newEdges: Edge[]) => {
  const processedNodes = newNodes.map(node => ({
    ...node,
    data: { ...node.data, onChange: handleNodeValueChange }
  }));
  setNodes(processedNodes);
  setEdges(newEdges);
}, [setNodes, setEdges, handleNodeValueChange]);
```

### Dynamic Handle System

Nodes can have dynamic input/output handles based on their `inputsMode` and `outputsMode`:
- `0` - No handles
- `1` - Single handle (default)
- `'n'` - Dynamic handles that grow as connections are made

The `normalizeAllNodesIO` utility (from `flowUtils.ts`) automatically adjusts handle counts based on active edge connections, always keeping one spare handle available for new connections.

**Handle ID Convention**:
- Input handles: `in_0`, `in_1`, `in_2`, ...
- Output handles: `out_0`, `out_1`, `out_2`, ...

The system tracks which handles are used by edges and adds an extra handle when all current handles are occupied.

### Workflow Execution

The frontend sends workflow graphs to the backend for execution:

1. **Graph Conversion** (`graphConverter.ts`):
   - Converts React Flow nodes/edges to backend format (BackendWorkflowGraph)
   - Maps node types to backend ports (e.g., 'add' → 3000, 'fsBrowser' → 3011)
   - Extracts handle indices from handle IDs (e.g., 'in_0' → 0, 'out_2' → 2)
   - Removes non-serializable data (functions) before sending

2. **Execution Flow**:
   - User clicks a Play node (or pinned play button)
   - `useWorkflowExecution` validates graph and finds Play nodes
   - Sends `EXECUTE_PLAY` message via WebSocket with:
     - `play_node_id` - Starting node for execution
     - `workspace_id` - Workspace name
     - `graph` - Full graph in backend format
   - Backend responds with status updates (`EXECUTION_STATUS`, `EXECUTION_COMPLETE`, `EXECUTION_ERROR`)

3. **Pinned Play Nodes**:
   - Play nodes can be "pinned" to a persistent overlay (`PinnedPlayButtons`)
   - Pinned nodes remain accessible even when zoomed/panned away
   - Pin state managed by `usePinnedNodes` hook
   - Specialized `PlayNode` component handles pin/unpin UI
   - Execution buttons available both on PlayNode and in PinnedPlayButtons overlay

## File Organization

```
src/
├── components/     # Reusable UI components
│   ├── FileBrowser.tsx         # File/folder picker via HTTP API
│   ├── HackerModal.tsx         # Modal wrapper
│   ├── LeftPanel.tsx           # Workspace save/load UI
│   ├── NodeCatalog.tsx         # Node type picker
│   ├── PinnedPlayButtons.tsx   # Persistent overlay for pinned play nodes
│   ├── SelectorControl.tsx     # File/folder selector control
│   └── WebSocketStatus.tsx     # Connection indicator
├── flow/           # Flow canvas components
│   ├── FlowCanvas.tsx       # Main ReactFlow canvas
│   ├── FlowController.tsx   # State orchestration
│   └── FlowInner.tsx        # (if exists)
├── hooks/          # Custom React hooks
│   ├── useFlowInteraction.ts      # User interactions (pane clicks, connections)
│   ├── useFlowStateSync.ts        # Core ReactFlow state management
│   ├── useNodePalette.ts          # Node type definitions from backend
│   ├── usePaneClickCombo.ts       # Combo detection for pane clicks
│   ├── usePinnedNodes.ts          # Pin/unpin node state management
│   ├── useWorkflowExecution.ts    # Workflow execution and status tracking
│   ├── useWorkspacePersistence.ts # Save/load workspaces
│   └── useWsClient.ts             # WebSocket connection management
├── nodes/          # Node-related code
│   ├── BaseIONode.tsx       # Generic dynamic node component
│   ├── FsBrowserNode.tsx    # File browser node (specialized)
│   ├── PlayNode.tsx         # Play button node with pin/unpin UI
│   └── registry.ts          # NodePaletteItem type definition
├── utils/          # Utility functions
│   ├── flowUtils.ts         # Node I/O normalization logic
│   ├── graphConverter.ts    # Graph conversion (frontend → backend format)
│   └── wsUrl.ts             # WebSocket URL builder
└── styles/         # SCSS styling
    └── hacker.scss          # Hacker-themed UI styles
```

## Code Style Conventions

Based on the existing codebase and team manifesto (AAA_LAIN_MANIFESTO_V3.md):

1. **File Path Comments**: MANDATORY - First line of every file must have a comment with the file path
   - Example: `// src/components/MyComponent.tsx`
2. **Arrow Functions**: Prefer arrow functions for components and callbacks
3. **TypeScript**: Strict mode enabled, use proper typing (no `any` unless necessary)
4. **Logging**: Use descriptive console logs with emoji prefixes for debugging
   - Example: `console.log('🔥 [Component] Action description:', data)`
   - WebSocket logs use `[WS Front]` prefix
5. **File Length**: Keep `.ts` and `.tsx` files under 150 lines when possible (break into smaller components/hooks)
6. **No Inline Comments**: ZERO comments inside code blocks - code should be self-documenting. Explanations come after, not during.
7. **Complete Files**: Always provide complete functions or files, never snippets
8. **Package Manager**: Use `yarn`, not `npm`

## Backend Integration

The frontend communicates with backend services:

1. **WebSocket Server** (ndnm-brazil, default port 3100, path `/ws`)
   - Node catalog (NODE_CONFIG) - sent automatically on connection
   - Real-time updates and command broadcast
   - Heartbeat mechanism to keep connection alive

2. **HTTP API** (default port 3100)
   - Workspace persistence:
     - `POST /workspace/save` - Save workspace with `{ name, nodes, edges }`
     - `GET /workspace/load/:name` - Load workspace by name
   - File browser endpoint: `POST /run` with `{ path: string }` (port 3011)

## Port Mapping System

The `graphConverter.ts` utility contains a hardcoded port mapping that maps node types to their backend microservice ports. When adding a new node type to the backend, you **must** update the `portMap` in `getNodePort()` function:

```typescript
const portMap: Record<string, number> = {
  'add': 3000,              // node-sum
  'subtract': 3001,         // node-subtract
  'fixedValue': 3010,       // node-fixed-value
  'fsBrowser': 3011,        // node-fs-browser
  'playButton': 3020,       // node-play-button
  'comfyPlay': 3021,        // node-comfy-play
  // Add new nodes here...
};
```

**Future improvement**: This mapping should ideally come from the `NODE_CONFIG` message sent by the backend to eliminate frontend hardcoding.

## Common Workflows

### Adding a New Node Type to the System

When adding a new backend node microservice:

1. **Backend** (outside this repo): Create the node in `ndnm-backend` with a `config.yaml`
2. **Backend** (outside this repo): Register node port in `ndnm-brazil` orchestrator
3. **Frontend** (this repo): Update `portMap` in `src/utils/graphConverter.ts:47-64` with the new node type and port
4. **Test**: Start backend, verify `NODE_CONFIG` message includes new node, verify node appears in NodeCatalog

### Adding Support for a New Node Field Type

1. Update `input_fields` handling in `BaseIONode.tsx`
2. Add rendering logic in `renderInputControl` function
3. Ensure the field type is documented in backend node definitions

Current supported field types in `BaseIONode.tsx`:
- `'text'` - Standard text input
- `'selector'` - File/folder selector (uses `SelectorControl` component)

### Debugging WebSocket Issues

- Check console for `[WS Front]` prefixed logs
- Status indicator shows connection state (idle/connecting/open/closing/closed)
- Auto-reconnect with exponential backoff (750ms base, 10s max)
- Heartbeat ping every 25s to keep connection alive

### Testing Node Interactions

- Use browser DevTools to inspect node data structure
- Check `FlowController` logs for node/edge counts
- Verify `onChange` callbacks are properly assigned after workspace load

### Executing Workflows

1. Create nodes on the canvas and connect them
2. Add at least one Play node (`playButton` or `comfyPlay` type)
3. Click the Play node's execute button (or pin it and use the pinned button)
4. Watch console for:
   - `🚀 Iniciando execução do workflow...` - Execution start
   - `📤 Enviando mensagem EXECUTE_PLAY:` - Message sent to backend
   - `📨 Mensagem recebida do backend:` - Status updates from backend
   - `✅ Execução completa:` - Successful completion
   - `❌ Erro na execução:` - Execution error
5. Check `executionState` in `useWorkflowExecution` for detailed status

## Important Notes

- The frontend is intentionally "dumb" - it renders what the backend tells it to render
- Node types are NOT defined in frontend code - they come from backend config.yaml files
- **Exception**: The port mapping in `graphConverter.ts` is hardcoded and must be manually updated when adding new node types
- When adding UI features, ensure they work with the dynamic node system
- Always test workspace save/load to ensure function references are restored correctly
- The `useWsClient` hook has multiple instances:
  - One in `App.tsx` (with heartbeat enabled, debug: true) - main connection
  - One in `useNodePalette.ts` (heartbeat disabled, debug: false) - node catalog
  - One in `useWorkflowExecution.ts` (heartbeat enabled, debug: true) - workflow execution
- Node IDs follow the pattern `n1`, `n2`, `n3`, etc. - the `nextId()` function in `useFlowInteraction` finds the highest existing ID and increments it
- The `normalizeAllNodesIO` utility automatically adjusts dynamic handle counts based on active connections, ensuring there's always one spare handle available for new connections
- Play nodes (`playButton`, `comfyPlay`) are special - they support pinning to a persistent overlay via `PinnedPlayButtons`
- When sending graphs to backend for execution, functions (like `onChange`) are automatically stripped by `graphConverter.ts`
