import React from 'react';
import LeftPanel from '@/components/LeftPanel';
import HackerModal from '@/components/HackerModal';
import NodeCatalog from '@/components/NodeCatalog';
import { useNodePalette } from '@/hooks/useNodePalette';
import { useFlowStateSync } from '@/hooks/useFlowStateSync';
import { useFlowInteraction } from '@/hooks/useFlowInteraction';
import { FlowCanvas } from './FlowCanvas';

export default function FlowController() {
  const nodePalette = useNodePalette();
  const { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange, onConnect } = useFlowStateSync();
  const {
    isModalOpen, panelPos,
    setIsModalOpen, setPanelPos,
    onConnectStart, onConnectEnd, addNodeByType, onPaneClick, handleCloseModal
  } = useFlowInteraction({ nodes, edges, setNodes, setEdges, nodePalette });

  return (
    <>
      <div className="globalWrapper">
        <LeftPanel onOpenModal={() => setIsModalOpen(true)} />
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          nodePalette={nodePalette}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onPaneClick={onPaneClick}
          panelPos={panelPos}
          setPanelPos={setPanelPos}
        />
      </div>
      <HackerModal open={isModalOpen} onClose={handleCloseModal}>
        <NodeCatalog onPick={addNodeByType} nodePalette={nodePalette} />
      </HackerModal>
    </>
  );
}