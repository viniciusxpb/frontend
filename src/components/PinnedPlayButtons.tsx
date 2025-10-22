// src/components/PinnedPlayButtons.tsx
import type { Node } from '@xyflow/react';

interface PinnedPlayButtonsProps {
  pinnedNodes: Node[];
  onUnpin: (nodeId: string) => void;
}

export function PinnedPlayButtons({ pinnedNodes, onUnpin }: PinnedPlayButtonsProps) {
  if (pinnedNodes.length === 0) return null;

  return (
    <div className="pinned-play-container">
      <div className="pinned-play-header">
        <span>📌 Pinned Nodes</span>
      </div>
      <div className="pinned-play-nodes">
        {pinnedNodes.map(node => (
          <div key={node.id} className="pinned-node-wrapper">
            <button
              onClick={() => onUnpin(node.id)}
              className="pinned-close-btn nodrag"
              title="Desancorar"
            >
              ✕
            </button>
            <div className="pinned-node-mini">
              <div className="pinned-node-label">
                {(node.data as any)?.label || node.type}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
