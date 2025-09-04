import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  ReactFlow, 
  applyNodeChanges,
  applyEdgeChanges, 
  useOnSelectionChange,
  addEdge, 
  Panel, 
  useReactFlow, 
  ReactFlowProvider, 
  useKeyPress} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TextUpdaterNode } from './nodes/TextUpdaterNode';
import usePaneClickCombo from "./hooks/usePaneClickCombo";

import type {
  EdgeChange,
  Connection,
} from '@xyflow/react';

const nodeTypes = {
  textUpdater: TextUpdaterNode,
};

const initialNodes = [
  {
    id: 'n1',
    className: 'hacker-node',
    position: { x: 0, y: 0 },
    data: { label: 'Node 1' }
  },
  {
    id: 'n2',
    className: 'hacker-node',
    position: { x: 0, y: 100 },
    data: { label: 'Node 2' }
  },
];
const initialEdges = [{ id: 'n1-n2', source: 'n1', target: 'n2' }];

function FlowInner() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
  const { screenToFlowPosition } = useReactFlow();

  const [selectedNodes, setSelectedNodes] = useState([]);
  const [selectedEdges, setSelectedEdges] = useState([]);

  // the passed handler has to be memoized, otherwise the hook will not work correctly
  const onChange = useCallback(({ nodes, edges }) => {

    const nodeIds = nodes.map((node) => node.id);
    const edgeIds = edges.map((edge) => edge.id);

    setSelectedNodes(nodes.map((node) => node.id));
    setSelectedEdges(edges.map((edge) => edge.id));

    if (nodeIds.length > 0) {
      console.log("Selecionou node(s):", nodeIds);
    }
    if (edgeIds.length > 0) {
      console.log("Selecionou edge(s):", edgeIds);
    }


  }, []);

  useOnSelectionChange({
    onChange,
  });

  const idRef = useRef(3);
  const getId = () => `${idRef.current++}`;

  const onNodesChange = useCallback(
    (changes) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    []
  );

  const onConnectEnd = useCallback(
    (event, connectionState) => {
      // when a connection is dropped on the pane it's not valid
      if (!connectionState.isValid) {
        // we need to remove the wrapper bounds, in order to get the correct position
        const id = getId();
        const { clientX, clientY } =
          'changedTouches' in event ? event.changedTouches[0] : event;
        const newNode = {
          id,
          position: screenToFlowPosition({
            x: clientX,
            y: clientY,
          }),
          data: { label: `Node ${id}` },
          origin: [0.5, 0.0],
        };

        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) =>
          eds.concat({ id, source: connectionState.fromNode.id, target: id }),
        );
      }
    },
    [screenToFlowPosition],
  );

  const onClickAddNode = useCallback(
    (x: number, y: number) => {
      
      setNodes((nds) => [
        ...nds,
        {
          id: `n${nds.length + 1}`, // id sequencial simples
          className: 'hacker-node',
          position: screenToFlowPosition({
            x: x,
            y: y,
          }),
          data: { label: `Node ${nds.length + 1}` },
        },
      ]);
    },
    [setNodes]
  );

  const deletePressed = useKeyPress('Delete');
  const backspacePressed = useKeyPress('Backspace');

    useEffect(() => {
    const pressed = deletePressed || backspacePressed;
    if (!pressed) return;

    if (selectedNodes.length === 0 && selectedEdges.length === 0) return;

    // remove edges selecionadas e também as conectadas aos nodes selecionados
    setEdges((eds) => {
      const selEdgeIds = new Set(selectedEdges);
      const selNodeIds = new Set(selectedNodes);
      return eds.filter(
        (e) =>
          !selEdgeIds.has(e.id) &&
          !selNodeIds.has(e.source) &&
          !selNodeIds.has(e.target)
      );
    });

    // remove nodes selecionados
    setNodes((nds) => {
      const selNodeIds = new Set(selectedNodes);
      return nds.filter((n) => !selNodeIds.has(n.id));
    });

    // limpa seleção local
    setSelectedNodes([]);
    setSelectedEdges([]);
  }, [deletePressed, backspacePressed, selectedNodes, selectedEdges, setEdges, setNodes]);

  const PANEL_OFFSET_X = 280;   // quanto “pra esquerda”
  const PANEL_OFFSET_Y = 100;   // quanto “pra cima”
  const onPaneClick = usePaneClickCombo({
    onSingle: (e) => {
      console.log("clicou fora dos nodes", e.clientX, e.clientY);

      if (panelPos) {
        setPanelPos(null);
      }
    },
    onDouble: (e) => {
      console.log("duplo clique no pane", e.clientX, e.clientY);
      setPanelPos({ x: e.clientX - PANEL_OFFSET_X, y: e.clientY - PANEL_OFFSET_Y });
    },
  });

  return (
    <>
      <div className='globalWrapper'>

        <div className='leftPanel'>
          Teste painel lateral
        </div>

        <div className='mainBoard'>
          <ReactFlow
            colorMode="dark"
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onPaneClick={onPaneClick}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd}
            fitView
          >
            {panelPos && (
              <Panel style={{ left: panelPos.x, top: panelPos.y, position: 'absolute' }}>
                <div
                  className="hacker-panel"
                  // onMouseDown={(e) => e.stopPropagation()} // <-- evita que clique dentro do painel acione pane
                  // onClick={(e) => e.stopPropagation()}
                >
                  <p>⚡ Painel Hacker</p>
                  <button onClick={() => onClickAddNode(panelPos.x, panelPos.y)}>Novo node</button>
                  <button onClick={() => setPanelPos(null)}>Fechar</button>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

      </div>
    </>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowInner />
    </ReactFlowProvider>
  );
}
