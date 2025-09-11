import { ReactFlowProvider } from "@xyflow/react";
import FlowInner from "./flow/FlowInner";
import "./styles/hacker.css";

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowInner />
    </ReactFlowProvider>
  );
}
