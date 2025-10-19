import React, { useMemo } from 'react';
import { ReactFlow, Panel, type NodeTypes, type Node, type Edge, type Connection, type NodeChange, type EdgeChange, Position } from '@xyflow/react';
import { BaseIONode } from '@/nodes/BaseIONode';
import { type NodePaletteItem } from '@/nodes/registry';

type FlowCanvasProps = {
  nodes: Node[];
  edges: Edge[];
  nodePalette: NodePaletteItem[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onConnectStart: (event: React.MouseEvent | React.TouchEvent, params: { nodeId: string | null; handleId: string | null; handleType?: string | undefined; }) => void;
  onConnectEnd: (event: MouseEvent | TouchEvent) => void;
  onPaneClick: (event: React.MouseEvent) => void;
  panelPos: { x: number; y: number } | null;
  setPanelPos: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
};

export function FlowCanvas({
  nodes, edges, nodePalette, onNodesChange, onEdgesChange,
  onConnect, onConnectStart, onConnectEnd, onPaneClick,
  panelPos, setPanelPos
}: FlowCanvasProps) {

  const dynamicNodeTypes: NodeTypes = useMemo(() => {
    const types: NodeTypes = {};
    nodePalette.forEach(item => { types[item.type] = BaseIONode; });
    types['default'] = BaseIONode;
    return types;
  }, [nodePalette]);

  return (
    <div className="mainBoard">
      <ReactFlow
        colorMode="dark"
        nodes={nodes}
        edges={edges}
        nodeTypes={dynamicNodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
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
  );
}