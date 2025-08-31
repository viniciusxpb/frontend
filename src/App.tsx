import { useState, useCallback } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TextUpdaterNode } from './nodes/TextUpdaterNode';
import usePaneClickCombo from "./hooks/usePaneClickCombo";

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

export default function App() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);


  const onNodesChange = useCallback(
    (changes) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect = useCallback(
    (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [],
  );

  const onClickAddNode = useCallback(
    (x: number, y: number) => {
      setNodes((nds) => [
        ...nds,
        {
          id: `n${nds.length + 1}`, // id sequencial simples
          className: 'hacker-node',
          position: { x, y },       // posição recebida por parâmetro
          data: { label: `Node ${nds.length + 1}` },
        },
      ]);
    },
    [setNodes]
  );

  const PANEL_OFFSET_X = 280   // quanto “pra esquerda”
  const PANEL_OFFSET_Y = 100   // quanto “pra cima”
  const onPaneClick = usePaneClickCombo({
    onSingle: (e) => {
      console.log("clicou fora dos nodes", e.clientX, e.clientY);

      if (panelPos) {
        setPanelPos(null);
      }

    },
    onDouble: (e) => {
      console.log("duplo clique no pane", e.clientX, e.clientY);
      setPanelPos({ x: e.clientX - PANEL_OFFSET_X, y: e.clientY - PANEL_OFFSET_Y })
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
            fitView
          >
            {panelPos && (
              <Panel style={{ left: panelPos.x, top: panelPos.y, position: 'absolute' }}>
                <div className="hacker-panel">
                  <p>⚡ Painel Hacker</p>
                  <button onClick={() => onClickAddNode(panelPos.y, panelPos.x)}>Novo node</button>
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