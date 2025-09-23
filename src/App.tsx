import { ReactFlowProvider } from "@xyflow/react";
import FlowInner from "./flow/FlowInner";
import "./styles/hacker.scss";
import { useWsClient } from "./hooks/useWsClient";
import { WebSocketStatus } from "./components/WebSocketStatus";
import { buildWsUrl } from "./utils/wsUrl";

export default function App() {
  const WS_URL = buildWsUrl();

  const client = useWsClient(WS_URL, {
    autoreconnect: true,
    heartbeatMs: 25000,
    debug: true,
  });

  return (
    <ReactFlowProvider>
      <WebSocketStatus status={client.status} onTest={client.testJson} />
      <FlowInner />
    </ReactFlowProvider>
  );
}
