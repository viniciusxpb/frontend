// src/components/LeftPanel.tsx
import { useState } from 'react';
import { useWorkspacePersistence } from '@/hooks/useWorkspacePersistence';
import { useWorkflowExecution } from '@/hooks/useWorkflowExecution';
import type { Node, Edge } from '@xyflow/react';

type Props = {
  onOpenModal: () => void;
  nodes: Node[];
  edges: Edge[];
  onLoadWorkspace: (nodes: Node[], edges: Edge[]) => void;
  onReassignNodeData?: (nodes: Node[]) => Node[];
};

export default function LeftPanel({ onOpenModal, nodes, edges, onLoadWorkspace, onReassignNodeData }: Props) {
  const [workspaceName, setWorkspaceName] = useState('workspace-1');
  const { saveWorkspace, loadWorkspace } = useWorkspacePersistence();
  const { executionState, executeWorkflow, resetExecution, isWebSocketConnected } = useWorkflowExecution();

  const handleSaveWorkspace = async () => {
    const success = await saveWorkspace(workspaceName, nodes, edges);
    if (success) {
      alert(`✅ Workspace "${workspaceName}" salvo!`);
    } else {
      alert(`❌ Erro ao salvar workspace`);
    }
  };

  const handleLoadWorkspace = async () => {
    console.log('🔄 Iniciando carregamento do workspace...');
    console.log('📁 Nome do workspace:', workspaceName);

    const data = await loadWorkspace(workspaceName);
    console.log('📦 Dados retornados do loadWorkspace:', data);

    if (data && data.nodes && data.edges) {
      console.log('✅ Dados válidos encontrados, carregando...');

      // AQUI ESTÁ A SOLUÇÃO: Reassignar as funções perdidas
      let nodesToLoad = data.nodes;
      if (onReassignNodeData) {
        nodesToLoad = onReassignNodeData(data.nodes);
        console.log('🔄 Nós modificados com onReassignNodeData:', nodesToLoad);
      }

      console.log('📊 Número de nodes:', nodesToLoad.length);
      console.log('📊 Número de edges:', data.edges.length);
      onLoadWorkspace(nodesToLoad, data.edges);
      alert(`✅ Workspace "${workspaceName}" carregado!`);
    } else {
      console.log('❌ Dados inválidos ou não encontrados');
      alert(`❌ Workspace não encontrado`);
    }
  };

  const handleExecuteWorkflow = () => {
    console.log('▶️ Executando workflow...', { nodes: nodes.length, edges: edges.length });
    resetExecution(); // Limpa execução anterior
    executeWorkflow(nodes, edges, workspaceName);
  };

  // Renderiza status da execução
  const renderExecutionStatus = () => {
    if (executionState.status === 'idle') return null;

    const statusColors = {
      running: '#ffaa00',
      completed: '#00ff88',
      error: '#ff4444',
    };

    const statusIcons = {
      running: '⚙️',
      completed: '✅',
      error: '❌',
    };

    return (
      <div
        style={{
          padding: 8,
          marginTop: 8,
          background: 'rgba(0, 0, 0, 0.5)',
          border: `1px solid ${statusColors[executionState.status as keyof typeof statusColors] || '#666'}`,
          borderRadius: 4,
          fontSize: 11,
          lineHeight: 1.4,
        }}
      >
        <div style={{ marginBottom: 4, fontWeight: 'bold' }}>
          {statusIcons[executionState.status as keyof typeof statusIcons]}{' '}
          {executionState.status === 'running' && 'Executando...'}
          {executionState.status === 'completed' && 'Concluído!'}
          {executionState.status === 'error' && 'Erro'}
        </div>
        {executionState.status === 'completed' && (
          <>
            <div>Nodes: {executionState.executedNodes}/{executionState.totalNodes}</div>
            <div>Tempo: {executionState.durationMs}ms</div>
            {executionState.cachedNodes > 0 && <div>Cache: {executionState.cachedNodes}</div>}
          </>
        )}
        {executionState.status === 'error' && (
          <div style={{ color: '#ff6666' }}>{executionState.error}</div>
        )}
      </div>
    );
  };

  return (
    <aside className="leftPanel">
      <div style={{ marginBottom: 10, opacity: 0.9 }}>⚙️ Ações</div>
      <button className="hacker-btn" onClick={onOpenModal}>
        Abrir painel
      </button>

      {/* NOVO: Botão Play */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0, 255, 136, 0.2)' }}>
        <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.8 }}>▶️ Execução</div>
        <button
          onClick={handleExecuteWorkflow}
          disabled={!isWebSocketConnected || executionState.status === 'running'}
          className="hacker-btn"
          style={{
            display: 'block',
            width: '100%',
            marginBottom: 8,
            background: executionState.status === 'running' ? 'rgba(100, 100, 100, 0.3)' : 'rgba(150, 0, 255, 0.3)',
            borderColor: '#ff00ff',
            color: '#ff88ff',
            cursor: (!isWebSocketConnected || executionState.status === 'running') ? 'not-allowed' : 'pointer',
            opacity: (!isWebSocketConnected || executionState.status === 'running') ? 0.5 : 1,
          }}
        >
          ▶️ Play
        </button>
        {!isWebSocketConnected && (
          <div style={{ fontSize: 10, color: '#ff6666', marginBottom: 8 }}>
            ⚠️ WebSocket desconectado
          </div>
        )}
        {renderExecutionStatus()}
      </div>

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0, 255, 136, 0.2)' }}>
        <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.8 }}>📝 Workspace</div>
        <input
          type="text"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          placeholder="Nome do workspace..."
          className="nodrag"
          style={{
            display: 'block',
            width: '100%',
            padding: '6px',
            marginBottom: 8,
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            color: '#b7f397',
            borderRadius: 4,
            fontFamily: 'monospace',
            fontSize: 12,
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={handleSaveWorkspace}
          className="hacker-btn"
          style={{
            display: 'block',
            width: '100%',
            marginBottom: 6,
            background: 'rgba(0, 150, 0, 0.3)',
            borderColor: '#00ff99',
            color: '#00ff99',
          }}
        >
          💾 Salvar
        </button>
        <button
          onClick={handleLoadWorkspace}
          className="hacker-btn"
          style={{
            display: 'block',
            width: '100%',
            background: 'rgba(0, 100, 150, 0.3)',
            borderColor: '#00ccff',
            color: '#00ccff',
          }}
        >
          📂 Carregar
        </button>
      </div>
    </aside>
  );
}