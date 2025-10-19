// src/App.tsx
import { ReactFlowProvider } from '@xyflow/react';
import FlowController from '@/flow/FlowController';
import '@/styles/hacker.scss';
import '@/style.scss';
import { useWsClient } from '@/hooks/useWsClient';
import { WebSocketStatus } from '@/components/WebSocketStatus';
import { buildWsUrl } from '@/utils/wsUrl';
import { useCallback } from 'react';
import type { Node } from '@xyflow/react';

export default function App() {
  const WS_URL = buildWsUrl();

  const client = useWsClient(WS_URL, {
    autoreconnect: true,
    heartbeatMs: 25000,
    debug: true,
  });

  // Função para reassignar o onChange nos nós carregados do workspace
  const handleReassignNodeData = useCallback((nodes: Node[]): Node[] => {
    console.log('🔄 Reassignando node data para nós carregados...');
    
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        // Reassigna a função onChange que foi perdida na serialização
        onChange: (nodeId: string, value: string) => {
          console.log(`📝 [App] Atualizando node ${nodeId} para valor:`, value);
          // Esta função será implementada no FlowController
        }
      }
    }));
  }, []);

  return (
    <ReactFlowProvider>
      <WebSocketStatus status={client.status} />
      {/* Passa a função de reassign para o FlowController */}
      <FlowController onReassignNodeData={handleReassignNodeData} />
    </ReactFlowProvider>
  );
}