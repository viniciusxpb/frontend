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
  type EdgeChange, type Connection, type Node, type Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import LeftPanel from '../components/LeftPanel';
import HackerModal from '../components/HackerModal';
import NodeCatalog from '../components/NodeCatalog';
import usePaneClickCombo from '../hooks/usePaneClickCombo';

import { nodeTypes, nodePalette } from '../nodes/registry';

/* ================= Helpers para entradas dinâmicas ================= */
const inputId = (idx: number) => `in_${idx}`;

function normalizeNodeDynamicInputs(node: Node, edges: Edge[]): Node {
  if (!node || !(node.type === 'add' || node.type === 'subtract')) return node;

  const currentInputs: string[] = (node.data?.inputs ?? ['in_0']).slice();

  // Quais handles de entrada estão em uso neste nó?
  const used = new Set(
    edges
      .filter((e) => e.target === node.id && e.targetHandle)
      .map((e) => String(e.targetHandle))
  );

  const usedCount = used.size;
  const shouldLen = Math.max(usedCount + 1, 1); // sempre 1 livre

  const nextInputs: string[] = [];
  for (let i = 0; i < shouldLen; i++) nextInputs.push(inputId(i));

  if (JSON.stringify(nextInputs) !== JSON.stringify(currentInputs)) {
    return {
      ...node,
      data: {
        ...(node.data ?? {}),
        inputs: nextInputs,
      },
    };
  }
  return node;
}

function normalizeAll(nodes: Node[], edges: Edge[]): Node[] {
  return nodes.map((n) => normalizeNodeDynamicInputs(n, edges));
}
/* =================================================================== */

const initialNodes: Node[] = [
  { id: 'n1', type: 'textUpdater', className: 'hacker-node', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: 'n2', type: 'textUpdater', className: 'hacker-node', position: { x: 0, y: 100 }, data: { label: 'Node 2' } },
];
const initialEdges: Edge[] = [{ id: 'n1-n2', source: 'n1', target: 'n2' }];

export default function FlowInner() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { screenToFlowPosition } = useReactFlow();

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

  const onNodesChange = useCallback(
    (changes) => setNodes((snap) => applyNodeChanges(changes, snap)),
    []
  );

  // 🔧 onEdgesChange: aplica alterações e normaliza entradas dinâmicas
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((prev) => {
      const next = applyEdgeChanges(changes, prev);
      setNodes((nds) => normalizeAll(nds, next));
      return next;
    });
  }, []);

  // 🔧 onConnect: adiciona edge e normaliza com base no array final
  const onConnect = useCallback((p: Connection) => {
    setEdges((prev) => {
      const next = addEdge(p, prev);
      setNodes((nds) => normalizeAll(nds, next));
      return next;
    });
  }, []);

  const onConnectEnd = useCallback(
    (event, state) => {
      if (!state.isValid) {
        const id = nextId();
        const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event;
        const newNode: Node = {
          id,
          type: 'textUpdater',
          className: 'hacker-node',
          position: screenToFlowPosition({ x: clientX, y: clientY }),
          data: { label: `Node ${id}` },
          origin: [0.5, 0.0] as [number, number],
        };
        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) => eds.concat({ id: `e-${Math.random()}`, source: state.fromNode.id, target: id }));
      }
    },
    [screenToFlowPosition]
  );

  // ADD pelo modal → centro da viewport atual (respeita dinâmicas)
  const addNodeByType = useCallback((typeKey: string) => {
    const spec = nodePalette.find((n) => n.type === (typeKey as any));
    if (!spec) return;

    const id = `n${nextId()}`;
    const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = screenToFlowPosition(center);

    const baseData = { ...(spec.defaultData ?? {}) };
    if ((typeKey === 'add' || typeKey === 'subtract') && !baseData.inputs) {
      baseData.inputs = ['in_0']; // segurança: 1 handle inicial
    }

    setNodes((nds) => normalizeAll(
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
    ));
    setIsModalOpen(false);
  }, [edges, screenToFlowPosition]);

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
      // normaliza após remoções
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

  // Pane (mantém painel flutuante por duplo-clique, se quiser)
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

      <HackerModal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <NodeCatalog onPick={addNodeByType} />
      </HackerModal>
    </>
  );
}
