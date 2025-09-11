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
  type EdgeChange, type Connection, type Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import LeftPanel from '../components/LeftPanel';
import HackerModal from '../components/HackerModal';
import NodeCatalog from '../components/NodeCatalog';
import usePaneClickCombo from '../hooks/usePaneClickCombo';

import { nodeTypes, nodePalette } from '../nodes/registry';

const initialNodes: Node[] = [
  { id: 'n1', type: 'textUpdater', className: 'hacker-node', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: 'n2', type: 'textUpdater', className: 'hacker-node', position: { x: 0, y: 100 }, data: { label: 'Node 2' } },
];
const initialEdges = [{ id: 'n1-n2', source: 'n1', target: 'n2' }];

export default function FlowInner() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { screenToFlowPosition, getViewport } = useReactFlow();

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

  const onNodesChange = useCallback((changes) => setNodes((snap) => applyNodeChanges(changes, snap)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((snap) => applyEdgeChanges(changes, snap)), []);
  const onConnect    = useCallback((p: Connection) => setEdges((snap) => addEdge(p, snap)), []);

  const onConnectEnd = useCallback((event, state) => {
    if (!state.isValid) {
      const id = nextId();
      const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event;
      const newNode = {
        id,
        type: 'textUpdater',
        className: 'hacker-node',
        position: screenToFlowPosition({ x: clientX, y: clientY }),
        data: { label: `Node ${id}` },
        origin: [0.5, 0.0] as [number, number],
      };
      setNodes((nds) => nds.concat(newNode));
      setEdges((eds) => eds.concat({ id, source: state.fromNode.id, target: id }));
    }
  }, [screenToFlowPosition]);

  // ADD pelo modal → centro da viewport atual
  const addNodeByType = useCallback((typeKey: string) => {
    const spec = nodePalette.find(n => n.type === (typeKey as any));
    if (!spec) return;

    const id = `n${nextId()}`;
    const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = screenToFlowPosition(center);

    setNodes((nds) => [
      ...nds,
      {
        id,
        type: spec.type,
        className: 'hacker-node',
        position: pos,
        data: { ...spec.defaultData },
      },
    ]);
    setIsModalOpen(false);
  }, [screenToFlowPosition]);

  // Delete/Backspace
  const del = useKeyPress('Delete');
  const bsp = useKeyPress('Backspace');
  useEffect(() => {
    const pressed = del || bsp;
    if (!pressed) return;
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return;

    setEdges((eds) => {
      const selE = new Set(selectedEdges);
      const selN = new Set(selectedNodes);
      return eds.filter(e => !selE.has(e.id) && !selN.has(e.source) && !selN.has(e.target));
    });
    setNodes((nds) => {
      const selN = new Set(selectedNodes);
      return nds.filter(n => !selN.has(n.id));
    });
    setSelectedNodes([]); setSelectedEdges([]);
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
