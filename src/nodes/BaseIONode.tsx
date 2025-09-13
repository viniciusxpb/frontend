import { useMemo } from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position, NodeToolbar, useConnection } from "@xyflow/react";

type IOmode = 0 | 1 | "n";

export interface BaseNodeData {
  label?: string;
  value?: string;
  inputsMode?: IOmode;
  outputsMode?: IOmode;
  inputsCount?: number;
  outputsCount?: number;
  onChange?: (id: string, val: string) => void;
}

export function BaseIONode({ id, data }: NodeProps<BaseNodeData>) {
  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode.id == id;

  const inputsMode = data.inputsMode ?? 1;
  const outputsMode = data.outputsMode ?? 1;

  const inCount = useMemo(() => {
    if (inputsMode === 0) return 0;
    if (inputsMode === 1) return 1;
    return data.inputsCount ?? 1;
  }, [inputsMode, data.inputsCount]);

  const outCount = useMemo(() => {
    if (outputsMode === 0) return 0;
    if (outputsMode === 1) return 1;
    return data.outputsCount ?? 1;
  }, [outputsMode, data.outputsCount]);

  return (
    <>
      <NodeToolbar isVisible={isTarget} position={data.toolbarPosition}>
        <button className="xy-theme__button">cut</button>
        <button className="xy-theme__button">copy</button>
        <button className="xy-theme__button">
          <img src="/src/assets/icons/wire_cutter.svg" alt="Wire Cutter" />
        </button>
      </NodeToolbar>
      <div className="hacker-node base-io">
        <strong>{data.label ?? "Node"}</strong>
        <input
          type="text"
          value={data.value ?? ""}
          className="nodrag"
          onChange={(e) => data.onChange?.(id, e.target.value)}
        />
        {Array.from({ length: inCount }).map((_, i) => (
          <Handle
            key={`in_${i}`}
            id={`in_${i}`}
            type="target"
            position={Position.Left}
            style={{ top: 40 + i * 20 }}
          />
        ))}
        {Array.from({ length: outCount }).map((_, i) => (
          <Handle
            key={`out_${i}`}
            id={`out_${i}`}
            type="source"
            position={Position.Right}
            style={{ top: 40 + i * 20 }}
          />
        ))}
      </div>
    </>
  );
}
