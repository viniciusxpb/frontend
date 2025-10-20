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
    Position
} from '@xyflow/react';
import { BaseIONode } from '@/nodes/BaseIONode';
import { FsBrowserNode } from '@/nodes/FsBrowserNode'; // <<<--- IMPORTADO
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
        nodePalette.forEach(item => {
            // Condição para usar o componente correto
            if (item.type === 'fsBrowser') {
                types[item.type] = FsBrowserNode; // Nó customizado
            } else {
                types[item.type] = BaseIONode; // Nó genérico padrão
            }
        });
        types['default'] = BaseIONode; // Fallback para tipos desconhecidos
        return types;
    }, [nodePalette]); // A dependência continua correta

    return (
        <div className="mainBoard">
            <ReactFlow
                colorMode="dark"
                nodes={nodes}
                edges={edges}
                nodeTypes={dynamicNodeTypes} // Usa os tipos de nós dinâmicos
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                onPaneClick={onPaneClick}
                fitView
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onInit={(instance: any) => ((window as any).reactFlowInstance = instance)}
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