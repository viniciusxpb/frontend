// src/nodes/PlayNode.tsx
import type { NodeProps } from '@xyflow/react';
import { BaseIONode, type BaseNodeData } from '@/nodes/BaseIONode';

type PlayData = BaseNodeData & {
  onPin?: (nodeId: string, label: string) => void;
  onUnpin?: (nodeId: string) => void;
  isPinned?: boolean;
};

export function PlayNode(props: NodeProps<PlayData>) {
  const { id, data } = props;

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.isPinned) {
      data.onUnpin?.(id);
    } else {
      data.onPin?.(id, data.label || 'Play');
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleTogglePin}
        className="nodrag pin-button"
        style={{
          position: 'absolute',
          top: -8,
          right: -8,
          width: 20,
          height: 20,
          padding: 0,
          background: data.isPinned ? 'rgba(0, 255, 136, 0.9)' : 'rgba(0, 0, 0, 0.7)',
          border: data.isPinned ? '2px solid #00ff88' : '1px solid rgba(0, 255, 136, 0.5)',
          color: data.isPinned ? '#000' : '#c8ffdf',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: data.isPinned ? '0 0 12px rgba(0, 255, 136, 0.8)' : '0 2px 4px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.2s ease',
          zIndex: 10,
        }}
        title={data.isPinned ? 'Despinar da UI' : 'Pinar na UI'}
      >
        {data.isPinned ? '📌' : '📍'}
      </button>
      <BaseIONode
        {...props}
        data={{
          label: data.label,
          value: data.value ?? '',
          inputsMode: data.inputsMode ?? 'n',
          inputsCount: data.inputsCount ?? 1,
          outputsMode: data.outputsMode ?? 1,
          outputsCount: data.outputsCount ?? 1,
          onChange: data.onChange,
        }}
      >
        <div style={{ marginTop: 8, opacity: 0.6, fontSize: 10, color: '#888' }}>
          Entradas: {data.inputsCount ?? 1}
        </div>
      </BaseIONode>
    </div>
  );
}