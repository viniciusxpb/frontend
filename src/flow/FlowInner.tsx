import { useState, useCallback, useRef, useEffect } from 'react';
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
  type EdgeChange, type Connection, type Node, type Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import LeftPanel from '../components/LeftPanel';
import HackerModal from '../components/HackerModal';
import NodeCatalog from '../components/NodeCatalog';
import usePaneClickCombo from '../hooks/usePaneClickCombo';

import { nodeTypes, nodePalette } from '../nodes/registry';

/* ================= Helpers p/ entradas dinâmicas (BaseIONode em modo "n") ================= */
type IOmode = 0 | 1 | 'n';

function isDynInputsNode(n: Node) {
  const m: IOmode | undefined = (n.data as any)?.inputsMode;
  return m === 'n';
}

function normalizeDynCounts(node: Node, edges: Edge[]): Node {
  if (!node || !isDynInputsNode(node)) return node;

  const data: any = node.data ?? {};
  const currentCount: number = Number.isFinite(data.inputsCount) ? data.inputsCount : 1;

  // conta quantos handles "in_*" estão realmente usados como alvo
  const used = new Set(
    edges
      .filter((e) => e.target === node.id && e.targetHandle && String(e.targetHandle).startsWith('in_'))
      .map((e) => String(e.targetHandle))
  );
  const usedCount = used.size;

  const shouldCount = Math.max(usedCount + 1, 1); // sempre manter 1 livre

  if (shouldCount !== currentCount) {
    return {
      ...node,
      data: {
        ...data,
        inputsMode: 'n',
        inputsCount: shouldCount,
      },
    };
  }
  return node;
}

function normalizeAll(nodes: Node[], edges: Edge[]): Node[] {
  return nodes.map((n) => normalizeDynCounts(n, edges));
}
/* ========================================================================================== */

// Exemplo inicial simples (TextUpdater sem handles para evitar erro #008)
const initialNodes: Node[] = [
  { id: 'n1', type: 'textUpdater', className: 'hacker-node', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: 'n2', type: 'textUpdater', className: 'hacker-node', position: { x: 0, y: 100 }, data: { label: 'Node 2' } },
];
const initialEdges: Edge[] = [];

/** Estado temporário quando o usuário solta a conexão no pane (drop inválido) */
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

  const { screenToFlowPosition } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);

  useOnSelectionChange({
    onChange: ({ nodes, edges }) => {
      setSelectedNodes(nodes.map((n: any) => n.id));
      setSelectedEdges(edges.map((e: any) => e.id));
    },
  });

  const idRef = useRef(3);
  const nextId = () => `${idRef.current++}`;

  /* ===== avisa o React Flow quando a quantidade de handles mudar ===== */
  const prevCountsRef = useRef<Record<string, number>>({});
  useEffect(() => {
    const toUpdate: string[] = [];
    for (const n of nodes) {
      if (isDynInputsNode(n)) {
        const count = (n.data as any)?.inputsCount ?? 1;
        const prev = prevCountsRef.current[n.id];
        if (prev === undefined || prev !== count) {
          toUpdate.push(n.id);
          prevCountsRef.current[n.id] = count;
        }
      }
    }
    if (toUpdate.length) {
      toUpdate.forEach((id) => updateNodeInternals(id));
    }
  }, [nodes, updateNodeInternals]);
  /* =================================================================== */

  const onNodesChange = useCallback(
    (changes) => setNodes((snap) => applyNodeChanges(changes, snap)),
    []
  );

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((prev) => {
      const next = applyEdgeChanges(changes, prev);
      setNodes((nds) => normalizeAll(nds, next));
      return next;
    });
  }, []);

  const onConnect = useCallback((p: Connection) => {
    setEdges((prev) => {
      const next = addEdge(p, prev);
      setNodes((nds) => normalizeAll(nds, next));
      return next;
    });
  }, []);

  /** Ao soltar a conexão: se inválido, abre o catálogo e guarda posição + origem */
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, state: any) => {
      if (!state?.isValid) {
        const isTouch =
          'changedTouches' in event && event.changedTouches && event.changedTouches.length > 0;
        const point = isTouch ? event.changedTouches[0] as any : (event as MouseEvent);
        const pos = screenToFlowPosition({ x: (point as any).clientX, y: (point as any).clientY });

        setPendingConnect({
          fromNodeId: state?.fromNode?.id ?? null,
          fromHandleId: state?.fromHandleId ?? null,
          pos,
        });

        setIsModalOpen(true);
      }
    },
    [screenToFlowPosition]
  );

  // ADD pelo modal → se veio de pendingConnect, cria no drop e conecta; senão, centro da viewport
  const addNodeByType = useCallback((typeKey: string) => {
    const spec = nodePalette.find((n) => n.type === (typeKey as any));
    if (!spec) return;

    const id = `n${nextId()}`;

    const baseData: any = { ...(spec.defaultData ?? {}) };
    // Convenção: add/subtract entram como dinâmicos
    if ((typeKey === 'add' || typeKey === 'subtract') && baseData.inputsMode === undefined) {
      baseData.inputsMode = 'n';
      baseData.inputsCount = 1; // começa com 1
    }

   if (pendingConnect) {
      const { pos, fromNodeId, fromHandleId } = pendingConnect;

      setNodes((nds) =>
        normalizeAll(
          [
            ...nds,
            {
              id,
              type: spec.type as Node['type'],
              className: 'hacker-node',
              position: pos,
              data: baseData,
            } as Node,
          ],
          edges
        )
      );

      if (fromNodeId) {
        setEdges((eds) => {
          const newEdge: Edge = {
            id: `e-${fromNodeId}-${id}-${Date.now()}`,
            source: fromNodeId,
            target: id,
            ...(fromHandleId ? { sourceHandle: String(fromHandleId) } : {}),
          };
          const next = eds.concat(newEdge);
          setNodes((nds) => normalizeAll(nds, next));
          return next;
        });
      }

      setPendingConnect(null);
      setIsModalOpen(false);
      return;
    }

   const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = screenToFlowPosition(center);

    setNodes((nds) =>
      normalizeAll(
        [
          ...nds,
          {
            id,
            type: spec.type as Node['type'],
            className: 'hacker-node',
            position: pos,
            data: baseData,
          } as Node,
        ],
        edges
      )
    );

    setIsModalOpen(false);
  }, [edges, screenToFlowPosition, pendingConnect]);

  // Delete/Backspace remove seleção
  const del = useKeyPress('Delete');
  const bsp = useKeyPress('Backspace');
  useEffect(() => {
    const pressed = del || bsp;
    if (!pressed) return;
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return;

    setEdges((eds) => {
      const selE = new Set(selectedEdges);
      const selN = new Set(selectedNodes);
      const next = eds.filter(
        (e) => !selE.has(e.id) && !selN.has(e.source) && !selN.has(e.target)
      );
      setNodes((nds) => normalizeAll(nds, next));
      return next;
    });

    setNodes((nds) => {
      const selN = new Set(selectedNodes);
      return nds.filter((n) => !selN.has(n.id));
    });

    setSelectedNodes([]);
    setSelectedEdges([]);
  }, [del, bsp, selectedNodes, selectedEdges]);

  // Pane
  const PANEL_OFFSET_X = 280, PANEL_OFFSET_Y = 100;
  const onPaneClick = usePaneClickCombo({
    onSingle: () => setPanelPos(null),
    onDouble: (e: MouseEvent) => {
      setPanelPos({
        x: (e as MouseEvent).clientX - PANEL_OFFSET_X,
        y: (e as MouseEvent).clientY - PANEL_OFFSET_Y,
      });
    },
  });

  const handleCloseModal = useCallback(() => {
    // se o usuário fechar sem escolher, descarta o pendingConnect
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
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd}
            onPaneClick={onPaneClick}
            fitView
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
        <NodeCatalog onPick={addNodeByType} />
      </HackerModal>
    </>
  );
}
