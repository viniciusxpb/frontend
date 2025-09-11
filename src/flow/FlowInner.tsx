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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import HackerModal from '../components/HackerModal';
import LeftPanel from '../components/LeftPanel';
import usePaneClickCombo from '../hooks/usePaneClickCombo';
import { TextUpdaterNode } from '../nodes/TextUpdaterNode';

import type { EdgeChange, Connection } from '@xyflow/react';

const nodeTypes = {
  textUpdater: TextUpdaterNode,
};

const initialNodes = [
  { id: 'n1', className: 'hacker-node', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: 'n2', className: 'hacker-node', position: { x: 0, y: 100 }, data: { label: 'Node 2' } },
];
const initialEdges = [{ id: 'n1-n2', source: 'n1', target: 'n2' }];

export default function FlowInner() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { screenToFlowPosition } = useReactFlow();

  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);

  const onSelection = useCallback(({ nodes, edges }) => {
    const nodeIds = nodes.map((n: any) => n.id);
    const edgeIds = edges.map((e: any) => e.id);
    setSelectedNodes(nodeIds);
    setSelectedEdges(edgeIds);
  }, []);
  useOnSelectionChange({ onChange: onSelection });

  const idRef = useRef(3);
  const getId = () => `${idRef.current++}`;

  const onNodesChange = useCallback(
    (changes) => setNodes((snap) => applyNodeChanges(changes, snap)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((snap) => applyEdgeChanges(changes, snap)),
    []
  );
  const onConnect = useCallback(
    (params: Connection) => setEdges((snap) => addEdge(params, snap)),
    []
  );

  const onConnectEnd = useCallback(
    (event, connectionState) => {
      if (!connectionState.isValid) {
        const id = getId();
        const { clientX, clientY } =
          'changedTouches' in event ? event.changedTouches[0] : event;
        const newNode = {
          id,
          className: 'hacker-node',
          position: screenToFlowPosition({ x: clientX, y: clientY }),
          data: { label: `Node ${id}` },
          origin: [0.5, 0.0] as [number, number],
        };
        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) => eds.concat({ id, source: connectionState.fromNode.id, target: id }));
      }
    },
    [screenToFlowPosition]
  );

  const onClickAddNode = useCallback(
    (x: number, y: number) => {
      setNodes((nds) => [
        ...nds,
        {
          id: `n${nds.length + 1}`,
          className: 'hacker-node',
          position: screenToFlowPosition({ x, y }),
          data: { label: `Node ${nds.length + 1}` },
        },
      ]);
    },
    [screenToFlowPosition]
  );

  const deletePressed = useKeyPress('Delete');
  const backspacePressed = useKeyPress('Backspace');
  useEffect(() => {
    const pressed = deletePressed || backspacePressed;
    if (!pressed) return;
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return;

    setEdges((eds) => {
      const selEdgeIds = new Set(selectedEdges);
      const selNodeIds = new Set(selectedNodes);
      return eds.filter(
        (e) => !selEdgeIds.has(e.id) && !selNodeIds.has(e.source) && !selNodeIds.has(e.target)
      );
    });

    setNodes((nds) => {
      const selNodeIds = new Set(selectedNodes);
      return nds.filter((n) => !selNodeIds.has(n.id));
    });

    setSelectedNodes([]);
    setSelectedEdges([]);
  }, [deletePressed, backspacePressed, selectedNodes, selectedEdges]);

  const PANEL_OFFSET_X = 280;
  const PANEL_OFFSET_Y = 100;
  const onPaneClick = usePaneClickCombo({
    onSingle: () => {
      if (panelPos) setPanelPos(null);
    },
    onDouble: (e: MouseEvent) => {
      setPanelPos({
        x: (e as MouseEvent).clientX - PANEL_OFFSET_X,
        y: (e as MouseEvent).clientY - PANEL_OFFSET_Y,
      });
    },
  });

  // Modal helpers
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const addNodeAtCenter = () => {
    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;
    onClickAddNode(x, y);
    closeModal();
  };

  return (
    <>
      <div className="globalWrapper">
        <LeftPanel onOpenModal={openModal} />

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
                  <button onClick={() => onClickAddNode(panelPos.x, panelPos.y)}>Novo node</button>
                  <button onClick={() => setPanelPos(null)}>Fechar</button>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>

      <HackerModal open={isModalOpen} onClose={closeModal}>
        <div className="hacker-modal-grid">
          <button className="hacker-btn" onClick={addNodeAtCenter}>
            ➕ Novo node (centro)
          </button>
          <button className="hacker-btn ghost" onClick={closeModal}>
            Fechar
          </button>
        </div>
      </HackerModal>
    </>
  );
}
