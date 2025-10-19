// src/flow/FlowInner.tsx
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  useOnSelectionChange,
  addEdge,
  Panel,
  useReactFlow,
  useKeyPress,
  useUpdateNodeInternals,
  type NodeTypes,
  type EdgeChange, type Connection, type Node, type Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import LeftPanel from '@/components/LeftPanel';
import HackerModal from '@/components/HackerModal';
import NodeCatalog from '@/components/NodeCatalog';
import usePaneClickCombo from '@/hooks/usePaneClickCombo';
import { BaseIONode } from '@/nodes/BaseIONode';
import { type NodePaletteItem } from '@/nodes/registry';
import { useWsClient } from '@/hooks/useWsClient';
import { buildWsUrl } from '@/utils/wsUrl';

type IOmode = 0 | 1 | 'n' | string;
function isDynInputsNode(n: Node) {
  const m: IOmode | undefined = (n.data as any)?.inputsMode;
  return m === 'n';
}
function normalizeIOMode(mode: string | undefined): IOmode {
    if (mode === '0') return 0;
    if (mode === '1') return 1;
    if (mode === 'n') return 'n';
    return 1;
}
function normalizeDynCounts(node: Node, edges: Edge[]): Node {
  const data: any = node.data ?? {};
  const inputsMode = normalizeIOMode(data.inputsMode);
  if (inputsMode !== 'n') return node;

  const currentCount: number = Number.isFinite(data.inputsCount) ? Math.max(data.inputsCount, 1) : 1;
  const used = new Set(
    edges
      .filter((e) => e.target === node.id && e.targetHandle && String(e.targetHandle).startsWith('in_'))
      .map((e) => String(e.targetHandle))
  );
  const usedCount = used.size;
  const shouldCount = Math.max(usedCount + 1, 1);
  if (shouldCount !== currentCount) {
    return { ...node, data: { ...data, inputsMode: 'n', inputsCount: shouldCount } };
  }
  return node;
}
function normalizeAll(nodes: Node[], edges: Edge[]): Node[] {
    return nodes.map(n => normalizeDynCounts(n, edges));
}

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

type PendingConnect = {
  fromNodeId: string | null;
  fromHandleId?: string | null;
  pos: { x: number; y: number };
};

export default function FlowInner() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingConnect, setPendingConnect] = useState<PendingConnect | null>(null);
  const [nodePalette, setNodePalette] = useState<NodePaletteItem[]>([]);
  const { screenToFlowPosition } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);

  const WS_URL = buildWsUrl();
  const client = useWsClient(WS_URL, {
    autoreconnect: true,
    heartbeatMs: 25000,
    debug: true,
  });

  useEffect(() => {
    if (client.lastJson) {
      const message = client.lastJson as any;
      if (message?.type === 'NODE_CONFIG' && Array.isArray(message.payload)) {
        console.log('Recebido NODE_CONFIG do backend:', message.payload);
        const validPaletteItems = message.payload.filter(
          (item: any): item is NodePaletteItem =>
            typeof item.type === 'string' && typeof item.label === 'string'
        );
         validPaletteItems.sort((a, b) => a.label.localeCompare(b.label));
        setNodePalette(validPaletteItems);
      }
    }
  }, [client.lastJson]);

  const dynamicNodeTypes: NodeTypes = useMemo(() => {
    const types: NodeTypes = {};
    nodePalette.forEach(item => {
      types[item.type] = BaseIONode;
    });
    return types;
  }, [nodePalette]);

  useOnSelectionChange({
    onChange: ({ nodes, edges }) => {
      setSelectedNodes(nodes.map((n: any) => n.id));
      setSelectedEdges(edges.map((e: any) => e.id));
    },
  });

  const idRef = useRef(1);
  const nextId = () => `n${idRef.current++}`;

  const prevCountsRef = useRef<Record<string, number>>({});
  useEffect(() => {
    const toUpdate: string[] = [];
    nodes.forEach(n => {
        const data: any = n.data ?? {};
        const inputsMode = normalizeIOMode(data.inputsMode);
        if (inputsMode === 'n') {
            const count = data.inputsCount ?? 1;
            const prev = prevCountsRef.current[n.id];
            if (prev === undefined || prev !== count) {
                toUpdate.push(n.id);
                prevCountsRef.current[n.id] = count;
            }
        }
    });
    if (toUpdate.length > 0) {
        updateNodeInternals(toUpdate);
    }
  }, [nodes, updateNodeInternals]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  useEffect(() => {
    setNodes((nds) => normalizeAll(nds, edges));
  }, [edges, setNodes]);

  // CORREÇÃO: Removi o comentário placeholder inválido
  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
        const reactFlowWrapper = (event.target as Element)?.closest('.react-flow');
        if (!reactFlowWrapper) return;
        const reactFlowInstance = (reactFlowWrapper as any)._reactFlowInstance;
        if (!reactFlowInstance?.connectionHandle) return;

        const { connectingHandleId, connectingNodeId, connectingHandleType } = reactFlowInstance.connectionHandle;
        const targetIsPane = (event.target as Element).classList.contains('react-flow__pane');

        if (targetIsPane && connectingNodeId && connectingHandleType === 'source') {
            const isTouch = 'changedTouches' in event && event.changedTouches && event.changedTouches.length > 0;
            const point = isTouch ? event.changedTouches[0] : (event as MouseEvent);
            const pos = screenToFlowPosition({ x: point.clientX, y: point.clientY });

            setPendingConnect({
                fromNodeId: connectingNodeId,
                fromHandleId: connectingHandleId,
                pos,
            });
            setIsModalOpen(true);
        }
    }, [screenToFlowPosition]); // Mantém a dependência correta

  // CORREÇÃO: Removi o comentário placeholder inválido
  const addNodeByType = useCallback((typeKey: string) => {
    const spec = nodePalette.find((n) => n.type === typeKey);

    if (!spec) {
       console.error(`Erro: Tentativa de adicionar node tipo '${typeKey}' que não foi encontrado na palette recebida.`);
       setIsModalOpen(false);
       setPendingConnect(null);
       return;
    }
    // Verificamos se o tipo existe no dynamicNodeTypes (que agora depende da palette)
    // Se chegou aqui, a spec existe, então o dynamicNodeTypes[typeKey] existirá.

    const id = nextId();
    const baseData: any = JSON.parse(JSON.stringify(spec.defaultData ?? {}));

    if (!baseData.label) {
      baseData.label = spec.label;
    }

    baseData.inputsMode = normalizeIOMode(baseData.inputsMode);
    baseData.outputsMode = normalizeIOMode(baseData.outputsMode);
    if (baseData.inputsMode === 'n') baseData.inputsCount = Math.max(baseData.inputsCount ?? 1, 1);
    if (baseData.outputsMode === 'n') baseData.outputsCount = Math.max(baseData.outputsCount ?? 1, 1);

    let newNodePosition = { x: 0, y: 0 };
    const newNode: Node = {
        id,
        type: spec.type,
        className: 'hacker-node',
        position: { x: 0, y: 0 },
        data: baseData,
    };

    if (pendingConnect) {
      newNodePosition = pendingConnect.pos;
      newNode.position = newNodePosition;
      const { fromNodeId, fromHandleId } = pendingConnect;

      setNodes((nds) => normalizeAll([...nds, newNode], edges));

      if (fromNodeId) {
        setEdges((eds) => {
          const newEdge: Edge = {
            id: `e-${fromNodeId}-${id}-${Date.now()}`,
            source: fromNodeId,
            target: id,
            ...(fromHandleId ? { sourceHandle: String(fromHandleId) } : {}),
          };
          const nextEdges = eds.concat(newEdge);
          setNodes(nds => normalizeAll(nds, nextEdges));
          return nextEdges;
        });
      }
      setPendingConnect(null);
    } else {
      const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      newNodePosition = screenToFlowPosition(center);
      newNode.position = newNodePosition;
      setNodes((nds) => normalizeAll([...nds, newNode], edges));
    }
    setIsModalOpen(false);
  }, [nodePalette, pendingConnect, screenToFlowPosition, edges, setNodes, setEdges]); // Mantém as dependências corretas

  const del = useKeyPress('Delete');
  const bsp = useKeyPress('Backspace');
  useEffect(() => {
    const pressed = del || bsp;
    if (!pressed || (selectedNodes.length === 0 && selectedEdges.length === 0)) return;

    const selectedNodeIds = new Set(selectedNodes);
    const selectedEdgeIds = new Set(selectedEdges);

    setEdges((eds) => eds.filter(e =>
        !selectedEdgeIds.has(e.id) &&
        !selectedNodeIds.has(e.source) &&
        !selectedNodeIds.has(e.target)
    ));
    setNodes((nds) => nds.filter((n) => !selectedNodeIds.has(n.id)));

    setSelectedNodes([]);
    setSelectedEdges([]);
  }, [del, bsp, selectedNodes, selectedEdges, setNodes, setEdges]);

  const PANEL_OFFSET_X = 280, PANEL_OFFSET_Y = 100;
  const onPaneClick = usePaneClickCombo({
    onSingle: () => setPanelPos(null),
    onDouble: (e: MouseEvent) => {
      setPanelPos({ x: e.clientX - PANEL_OFFSET_X, y: e.clientY - PANEL_OFFSET_Y });
    },
  });

  const handleCloseModal = useCallback(() => {
    setPendingConnect(null);
    setIsModalOpen(false);
  }, []);

  return (
    <>
      <div className="globalWrapper">
        <LeftPanel onOpenModal={() => setIsModalOpen(true)} />
        <div className="mainBoard">
          <ReactFlow
            colorMode="dark"
            nodes={nodes}
            edges={edges}
            nodeTypes={dynamicNodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd}
            onPaneClick={onPaneClick}
            fitView
            onInit={(instance) => ((window as any).reactFlowInstance = instance)}
          >
            {panelPos && (
              <Panel style={{ left: panelPos.x, top: panelPos.y, position: 'absolute' }}>
                <div className="hacker-panel">
                  <p>⚡ Painel Hacker</p>
                  <button onClick={() => setPanelPos(null)}>Fechar</button>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>
      <HackerModal open={isModalOpen} onClose={handleCloseModal}>
        <NodeCatalog onPick={addNodeByType} nodePalette={nodePalette} />
      </HackerModal>
    </>
  );
}