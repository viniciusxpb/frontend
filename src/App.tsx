import { ReactFlowProvider } from '@xyflow/react';
// Importa o novo controller em vez do FlowInner
import FlowController from '@/flow/FlowController';
import '@/styles/hacker.scss';
import '@/style.scss'; // Garante que o estilo base também é importado
import { useWsClient } from '@/hooks/useWsClient';
import { WebSocketStatus } from '@/components/WebSocketStatus';
import { buildWsUrl } from '@/utils/wsUrl';

export default function App() {
  const WS_URL = buildWsUrl();

  // Mantém a instância do useWsClient aqui para o status global,
  // os hooks internos criarão suas próprias conexões se necessário,
  // ou podemos passar este 'client' via props/context no futuro.
  const client = useWsClient(WS_URL, {
    autoreconnect: true,
    heartbeatMs: 25000, // Reabilita o heartbeat aqui se desabilitado nos hooks internos
    debug: true,
  });

  return (
    // ReactFlowProvider continua envolvendo tudo
    <ReactFlowProvider>
      <WebSocketStatus status={client.status} />
      {/* Usa o novo FlowController */}
      <FlowController />
    </ReactFlowProvider>
  );
}