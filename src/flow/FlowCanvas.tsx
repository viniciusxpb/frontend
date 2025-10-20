// src/flow/FlowCanvas.tsx
import React, { useMemo } from 'react';
import {
    ReactFlow,
    Panel,
    type NodeTypes,
    type Node,
    type Edge,
    type Connection,
    type NodeChange,
    type EdgeChange,
    type OnConnectStart,
    type OnConnectEnd,
    Position
} from '@xyflow/react';
import { BaseIONode } from '@/nodes/BaseIONode';
import { FsBrowserNode } from '@/nodes/FsBrowserNode';
import { type NodePaletteItem } from '@/nodes/registry';

type FlowCanvasProps = {
    nodes: Node[];
    edges: Edge[];
    nodePalette: NodePaletteItem[];
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;
    onConnectStart: OnConnectStart;
    onConnectEnd: OnConnectEnd;
    onPaneClick: (event: React.MouseEvent) => void;
    panelPos: { x: number; y: number } | null;
    setPanelPos: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
};

// *** CLASSE CSS PARA IGNORAR O SCROLL/ZOOM DO FLOW ***
const NO_WHEEL_CLASS = 'prevent-flow-scroll'; // <<<<==== DEFINIDO AQUI TAMBÉM

export function FlowCanvas({
    nodes, edges, nodePalette, onNodesChange, onEdgesChange,
    onConnect, onConnectStart, onConnectEnd, onPaneClick,
    panelPos, setPanelPos
}: FlowCanvasProps) {

    const dynamicNodeTypes: NodeTypes = useMemo(() => {
        const types: NodeTypes = {};
        nodePalette.forEach(item => {
            if (item.type === 'fsBrowser') {
                types[item.type] = FsBrowserNode;
            } else {
                types[item.type] = BaseIONode;
            }
        });
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onInit={(instance: any) => ((window as any).reactFlowInstance = instance)}
                // *** PROP ADICIONADA AQUI ***
                noWheelClassName={NO_WHEEL_CLASS} // <<<<==== PASSANDO A CLASSE PARA O REACT FLOW
            >
                {panelPos && (
                    <Panel style={{ left: panelPos.x, top: panelPos.y, position: 'absolute' }}>
                        <div className="hacker-panel">
                            <p>⚡ Painel Hacker</p>
                            <button className="hacker-btn ghost" onClick={() => setPanelPos(null)}>Fechar</button>
                        </div>
                    </Panel>
                )}
            </ReactFlow>
        </div>
    );
}