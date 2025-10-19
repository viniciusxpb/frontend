// src/flow/FlowInner.tsx
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'; // Adiciona useMemo
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
  type NodeTypes, // Importa o tipo NodeTypes
  type EdgeChange, type Connection, type Node, type Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import LeftPanel from '@/components/LeftPanel';
import HackerModal from '@/components/HackerModal';
import NodeCatalog from '@/components/NodeCatalog';
import usePaneClickCombo from '@/hooks/usePaneClickCombo';
// Importa APENAS BaseIONode e a interface
import { BaseIONode } from '@/nodes/BaseIONode';
import { type NodePaletteItem } from '@/nodes/registry';
import { useWsClient } from '@/hooks/useWsClient';
import { buildWsUrl } from '@/utils/wsUrl';

// Helpers para entradas dinâmicas (sem alterações)
type IOmode = 0 | 1 | 'n' | string; // Permite string vinda do backend
function isDynInputsNode(n: Node) {
  const m: IOmode | undefined = (n.data as any)?.inputsMode;
  return m === 'n';
}
function normalizeIOMode(mode: string | undefined): IOmode {
    if (mode === '0') return 0;
    if (mode === '1') return 1;
    if (mode === 'n') return 'n';
    return 1; // Default para 1 se for inválido ou ausente
}
function normalizeDynCounts(node: Node, edges: Edge[]): Node {
  const data: any = node.data ?? {};
  const inputsMode = normalizeIOMode(data.inputsMode); // Normaliza o modo lido
  if (inputsMode !== 'n') return node; // Só normaliza contagem se modo for 'n'

  const currentCount: number = Number.isFinite(data.inputsCount) ? Math.max(data.inputsCount, 1) : 1;
  const used = new Set(
    edges
      .filter((e) => e.target === node.id && e.targetHandle && String(e.targetHandle).startsWith('in_'))
      .map((e) => String(e.targetHandle))
  );
  const usedCount = used.size;
  const shouldCount = Math.max(usedCount + 1, 1);
  if (shouldCount !== currentCount) {
    // Retorna um novo objeto node com data atualizado
    return { ...node, data: { ...data, inputsMode: 'n', inputsCount: shouldCount } };
  }
  return node; // Retorna o node original se a contagem não mudou
}

// Modifica normalizeAll para usar a versão corrigida de normalizeDynCounts
function normalizeAll(nodes: Node[], edges: Edge[]): Node[] {
    // Mapeia cada nó para sua versão normalizada, garantindo que sempre retornamos um array de nós
    return nodes.map(n => normalizeDynCounts(n, edges));
}


const initialNodes: Node[] = [];
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
  const [nodePalette, setNodePalette] = useState<NodePaletteItem[]>([]);
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

  useEffect(() => {
    if (client.lastJson) {
      const message = client.lastJson as any;
      if (message?.type === 'NODE_CONFIG' && Array.isArray(message.payload)) {
        console.log('Recebido NODE_CONFIG do backend:', message.payload);
        const validPaletteItems = message.payload.filter(
          (item: any): item is NodePaletteItem =>
            typeof item.type === 'string' && typeof item.label === 'string'
        );
         validPaletteItems.sort((a, b) => a.label.localeCompare(b.label));
        setNodePalette(validPaletteItems);
      }
    }
  }, [client.lastJson]);

  // --- MAPEAMENTO DINÂMICO DE NODETYPES ---
  // Cria o objeto nodeTypes dinamicamente baseado na palette recebida
  const dynamicNodeTypes: NodeTypes = useMemo(() => {
    const types: NodeTypes = {};
    nodePalette.forEach(item => {
      // Todos os tipos recebidos do backend serão renderizados pelo BaseIONode
      types[item.type] = BaseIONode;
    });
    return types;
  }, [nodePalette]); // Recalcula apenas quando a nodePalette mudar
  // --- FIM DO MAPEAMENTO DINÂMICO ---

  useOnSelectionChange({
    onChange: ({ nodes, edges }) => {
      setSelectedNodes(nodes.map((n: any) => n.id));
      setSelectedEdges(edges.map((e: any) => e.id));
    },
  });

  const idRef = useRef(1);
  const nextId = () => `n${idRef.current++}`;

  const prevCountsRef = useRef<Record<string, number>>({});
  useEffect(() => {
    const toUpdate: string[] = [];
    nodes.forEach(n => { // Usamos forEach aqui
        const data: any = n.data ?? {};
        const inputsMode = normalizeIOMode(data.inputsMode);
        if (inputsMode === 'n') {
            const count = data.inputsCount ?? 1;
            const prev = prevCountsRef.current[n.id];
            if (prev === undefined || prev !== count) {
                toUpdate.push(n.id);
                prevCountsRef.current[n.id] = count;
            }
        }
    });
    if (toUpdate.length > 0) {
        // updateNodeInternals pode receber um array de IDs
        updateNodeInternals(toUpdate);
    }
  }, [nodes, updateNodeInternals]);


  const onNodesChange = useCallback(
    (changes) => setNodes((snap) => applyNodeChanges(changes, snap)),
    []
  );

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((prevEdges) => {
        const nextEdges = applyEdgeChanges(changes, prevEdges);
        // Atualiza os nós baseado nas edges *antes* de atualizar o estado das edges
        setNodes(nds => normalizeAll(nds, nextEdges));
        return nextEdges; // Retorna as edges atualizadas
    });
  }, []); // Removido setNodes das dependências


  const onConnect = useCallback((p: Connection) => {
    setEdges((prevEdges) => {
        // Cria a nova edge com addEdge
        const newEdge = { ...p, id: `e-${p.source}-${p.target}-${Date.now()}` };
        const nextEdges = prevEdges.concat(newEdge); // Adiciona a nova edge
        // Atualiza os nós baseado nas edges atualizadas
        setNodes(nds => normalizeAll(nds, nextEdges));
        return nextEdges; // Retorna o novo array de edges
    });
  }, []); // Removido setNodes das dependências


  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
        const reactFlowWrapper = (event.target as Element)?.closest('.react-flow');
        if (!reactFlowWrapper) return;
        // Acessa a instância via atributo (alternativa se global não funcionar)
        const reactFlowInstance = (reactFlowWrapper as any)._reactFlowInstance;
        if (!reactFlowInstance?.connectionHandle) return;


        const { connectingHandleId, connectingNodeId, connectingHandleType } = reactFlowInstance.connectionHandle;
        const targetIsPane = (event.target as Element).classList.contains('react-flow__pane');

        if (targetIsPane && connectingNodeId && connectingHandleType === 'source') {
            const isTouch = 'changedTouches' in event && event.changedTouches && event.changedTouches.length > 0;
            const point = isTouch ? event.changedTouches[0] : (event as MouseEvent);
            const pos = screenToFlowPosition({ x: point.clientX, y: point.clientY });

            setPendingConnect({
                fromNodeId: connectingNodeId,
                fromHandleId: connectingHandleId,
                pos,
            });
            setIsModalOpen(true);
        }
    },
    [screenToFlowPosition]
  );

  const addNodeByType = useCallback((typeKey: string) => {
    const spec = nodePalette.find((n) => n.type === typeKey);

    // A única verificação agora é se a especificação existe na palette
    if (!spec) {
       console.error(`Erro: Tentativa de adicionar node tipo '${typeKey}' que não foi encontrado na palette recebida.`);
       setIsModalOpen(false);
       setPendingConnect(null);
       return;
    }

    const id = nextId();
    // Faz um deep clone dos dados default para evitar mutações acidentais
    const baseData: any = JSON.parse(JSON.stringify(spec.defaultData ?? {}));

    // Garante que o label está presente, usando o da palette como fallback
    if (!baseData.label) {
      baseData.label = spec.label;
    }

     // Normaliza os modos I/O lidos do backend logo na criação do node
    baseData.inputsMode = normalizeIOMode(baseData.inputsMode);
    baseData.outputsMode = normalizeIOMode(baseData.outputsMode);
    // Garante contagem inicial mínima de 1 para modo 'n'
    if (baseData.inputsMode === 'n') baseData.inputsCount = Math.max(baseData.inputsCount ?? 1, 1);
    if (baseData.outputsMode === 'n') baseData.outputsCount = Math.max(baseData.outputsCount ?? 1, 1);


    let newNodePosition = { x: 0, y: 0 };
    const newNode: Node = {
        id,
        type: spec.type, // O tipo é a string vinda do backend
        className: 'hacker-node', // Mantemos a classe CSS
        position: { x: 0, y: 0 }, // Será definido abaixo
        data: baseData,
    };


    if (pendingConnect) {
      newNodePosition = pendingConnect.pos;
      newNode.position = newNodePosition; // Define a posição do novo nó
      const { fromNodeId, fromHandleId } = pendingConnect;

      setNodes((nds) => normalizeAll([...nds, newNode], edges)); // Adiciona e normaliza

      if (fromNodeId) {
        setEdges((eds) => {
          const newEdge: Edge = {
            id: `e-${fromNodeId}-${id}-${Date.now()}`,
            source: fromNodeId,
            target: id,
            ...(fromHandleId ? { sourceHandle: String(fromHandleId) } : {}),
          };
          const nextEdges = eds.concat(newEdge);
           // RE-NORMALIZA os nós com a nova edge adicionada
          setNodes(nds => normalizeAll(nds, nextEdges));
          return nextEdges;
        });
      }
      setPendingConnect(null);
    } else {
      const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      newNodePosition = screenToFlowPosition(center);
      newNode.position = newNodePosition; // Define a posição do novo nó
      setNodes((nds) => normalizeAll([...nds, newNode], edges)); // Adiciona e normaliza
    }
    setIsModalOpen(false);
  }, [nodePalette, pendingConnect, screenToFlowPosition, edges]); // Removido setNodes/setEdges

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
        // Atualiza os nós ANTES de remover as edges no estado
        setNodes(nds => normalizeAll(nds, next));
        return next;
    });
    setNodes((nds) => nds.filter((n) => !selectedNodes.includes(n.id)));
    setSelectedNodes([]);
    setSelectedEdges([]);
   }, [del, bsp, selectedNodes, selectedEdges]); // Removido setNodes/setEdges


  const PANEL_OFFSET_X = 280, PANEL_OFFSET_Y = 100;
  const onPaneClick = usePaneClickCombo({
    onSingle: () => setPanelPos(null),
    onDouble: (e: MouseEvent) => {
      setPanelPos({ x: e.clientX - PANEL_OFFSET_X, y: e.clientY - PANEL_OFFSET_Y });
    },
  });

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
            nodeTypes={dynamicNodeTypes} // Usa o mapeamento dinâmico
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
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
      </div>
      <HackerModal open={isModalOpen} onClose={handleCloseModal}>
        <NodeCatalog onPick={addNodeByType} nodePalette={nodePalette} />
      </HackerModal>
    </>
  );
}