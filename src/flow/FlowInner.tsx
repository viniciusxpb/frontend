// src/flow/FlowInner.tsx
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

import LeftPanel from '@/components/LeftPanel';
import HackerModal from '@/components/HackerModal';
import NodeCatalog from '@/components/NodeCatalog';
import usePaneClickCombo from '@/hooks/usePaneClickCombo';
import { nodeTypes, type NodePaletteItem } from '@/nodes/registry'; // Importa tipos e componentes
import { useWsClient } from '@/hooks/useWsClient';
import { buildWsUrl } from '@/utils/wsUrl';

// Helpers para entradas dinâmicas (sem alterações)
type IOmode = 0 | 1 | 'n';
function isDynInputsNode(n: Node) {
  const m: IOmode | undefined = (n.data as any)?.inputsMode;
  return m === 'n';
}
function normalizeDynCounts(node: Node, edges: Edge[]): Node {
  if (!node || !isDynInputsNode(node)) return node;
  const data: any = node.data ?? {};
  const currentCount: number = Number.isFinite(data.inputsCount) ? data.inputsCount : 1;
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
  return nodes.map((n) => normalizeDynCounts(n, edges));
}

const initialNodes: Node[] = []; // Começa sem nodes
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
  const [nodePalette, setNodePalette] = useState<NodePaletteItem[]>([]); // Estado para a palette dinâmica
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

  // Efeito para processar mensagens do WebSocket e atualizar a nodePalette
  useEffect(() => {
    if (client.lastJson) {
      const message = client.lastJson as any;
      if (message?.type === 'NODE_CONFIG' && Array.isArray(message.payload)) {
        console.log('Recebido NODE_CONFIG do backend:', message.payload);
        const validPaletteItems = message.payload.filter(
          (item: any): item is NodePaletteItem => // Type guard para segurança
            typeof item.type === 'string' &&
            typeof item.label === 'string' &&
            // Verifica se o tipo existe no nosso mapeamento nodeTypes
            Object.prototype.hasOwnProperty.call(nodeTypes, item.type)
        );
         // Ordena alfabeticamente pelo label antes de setar o estado
        validPaletteItems.sort((a, b) => a.label.localeCompare(b.label));
        setNodePalette(validPaletteItems);
      }
    }
  }, [client.lastJson]);

  useOnSelectionChange({
    onChange: ({ nodes, edges }) => {
      setSelectedNodes(nodes.map((n: any) => n.id));
      setSelectedEdges(edges.map((e: any) => e.id));
    },
  });

  const idRef = useRef(1); // Começa em 1 para os IDs
  const nextId = () => `n${idRef.current++}`;

  // Hook useEffect para updateNodeInternals (sem alterações)
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

   const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
        // Tenta pegar a instância do React Flow (pode não estar sempre disponível globalmente)
        const reactFlowInstance = (event.target as Element)?.closest('.react-flow')?.['_reactFlowInstance'];
        if (!reactFlowInstance?.connectionHandle) return;

        const { connectingHandleId, connectingNodeId, connectingHandleType } = reactFlowInstance.connectionHandle;
        const targetIsPane = (event.target as Element).classList.contains('react-flow__pane');

        if (targetIsPane && connectingNodeId && connectingHandleType === 'source') {
            const isTouch = 'changedTouches' in event && event.changedTouches && event.changedTouches.length > 0;
            const point = isTouch ? event.changedTouches[0] : (event as MouseEvent);
            // screenToFlowPosition precisa ser chamado aqui dentro pois depende do estado atual do hook
            const pos = screenToFlowPosition({ x: point.clientX, y: point.clientY });

            setPendingConnect({
                fromNodeId: connectingNodeId,
                fromHandleId: connectingHandleId,
                pos,
            });
            setIsModalOpen(true);
        }
    },
    [screenToFlowPosition] // screenToFlowPosition é a dependência chave aqui
);

  // Adiciona node usando a palette dinâmica
  const addNodeByType = useCallback((typeKey: string) => {
    const spec = nodePalette.find((n) => n.type === typeKey);
    if (!spec) {
      console.error(`Tipo de node desconhecido ou não registrado no frontend: ${typeKey}`);
      // Verifica se o tipo existe em nodeTypes mas não veio na palette (erro de config backend?)
      if (Object.prototype.hasOwnProperty.call(nodeTypes, typeKey)) {
         console.warn(`O tipo '${typeKey}' existe nos componentes React, mas não foi recebido na NODE_CONFIG do backend.`);
      }
      setIsModalOpen(false); // Fecha o modal mesmo se der erro
      setPendingConnect(null);
      return;
    }

    const id = nextId();
    const baseData: any = JSON.parse(JSON.stringify(spec.defaultData ?? {})); // Deep clone

    // Garante que o label está presente
    if (!baseData.label) {
      baseData.label = spec.label;
    }

    let newNodePosition = { x: 0, y: 0 };

    if (pendingConnect) {
      newNodePosition = pendingConnect.pos;
      const { fromNodeId, fromHandleId } = pendingConnect;

      setNodes((nds) => normalizeAll(
        [...nds, { id, type: spec.type, className: 'hacker-node', position: newNodePosition, data: baseData } as Node],
        edges
      ));

      if (fromNodeId) {
        setEdges((eds) => {
          const newEdge: Edge = {
            id: `e-${fromNodeId}-${id}-${Date.now()}`,
            source: fromNodeId,
            target: id,
            ...(fromHandleId ? { sourceHandle: String(fromHandleId) } : {}),
            // targetHandle: 'in_0' // Assumimos in_0 por padrão para simplificar
          };
          const nextEdges = eds.concat(newEdge);
          setNodes(nds => normalizeAll(nds, nextEdges)); // Normaliza DEPOIS de adicionar a edge
          return nextEdges;
        });
      }
      setPendingConnect(null);
    } else {
      const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      newNodePosition = screenToFlowPosition(center);
      setNodes((nds) => normalizeAll(
        [...nds, { id, type: spec.type, className: 'hacker-node', position: newNodePosition, data: baseData } as Node],
        edges
      ));
    }
    setIsModalOpen(false);
  }, [nodePalette, pendingConnect, screenToFlowPosition, edges]); // Depende da palette dinâmica

  // Delete/Backspace (sem alterações)
  const del = useKeyPress('Delete');
  const bsp = useKeyPress('Backspace');
  useEffect(() => {
    const pressed = del || bsp;
    if (!pressed || (selectedNodes.length === 0 && selectedEdges.length === 0)) return;
    setEdges((eds) => {
        const next = eds.filter(e =>
            !selectedEdges.includes(e.id) &&
            !selectedNodes.includes(e.source) &&
            !selectedNodes.includes(e.target)
        );
        setNodes(nds => normalizeAll(nds, next));
        return next;
    });
    setNodes((nds) => nds.filter((n) => !selectedNodes.includes(n.id)));
    setSelectedNodes([]);
    setSelectedEdges([]);
   }, [del, bsp, selectedNodes, selectedEdges]);

  // Pane (sem alterações)
  const PANEL_OFFSET_X = 280, PANEL_OFFSET_Y = 100;
  const onPaneClick = usePaneClickCombo({
    onSingle: () => setPanelPos(null),
    onDouble: (e: MouseEvent) => {
      setPanelPos({ x: e.clientX - PANEL_OFFSET_X, y: e.clientY - PANEL_OFFSET_Y });
    },
  });

  // Fechar Modal (sem alterações)
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
            nodeTypes={nodeTypes} // Usa o mapeamento de componentes React
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd}
            onPaneClick={onPaneClick}
            fitView
            // Garante que a instância seja acessível globalmente (solução temporária para onConnectEnd)
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
        {/* Passa a palette dinâmica para o NodeCatalog */}
        <NodeCatalog onPick={addNodeByType} nodePalette={nodePalette} />
      </HackerModal>
    </>
  );
}