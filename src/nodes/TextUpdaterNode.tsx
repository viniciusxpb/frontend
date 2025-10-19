import { useCallback } from "react";
import type { NodeProps } from "@xyflow/react";
import { BaseIONode, type BaseNodeData } from "@/nodes/BaseIONode";

type TextUpdaterData = BaseNodeData & {};

export function TextUpdaterNode(props: NodeProps<TextUpdaterData>) {
  const { id, data } = props;

  const onChange = useCallback(
    (val: string) => {
      console.log("TextUpdaterNode", id, val);
      data.onChange?.(id, val);
    },
    [id, data]
  );

  return (
    <BaseIONode
      {...props}
      data={{
        label: data.label ?? "📝 Texto",
        value: data.value ?? "",
        inputsMode: 1,   // exatamente 1 entrada
        outputsMode: 1,  // exatamente 1 saída
        onChange,
      }}
    >
      <div>
        <label htmlFor={`text-${id}`} style={{ fontSize: 12 }}>
          Text:
        </label>
        <input
          id={`text-${id}`}
          name="text"
          value={data.value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="nodrag"
        />
      </div>
    </BaseIONode>
  );
}