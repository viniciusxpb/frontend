// src/flow/FlowController.tsx
import React, { useState } from 'react';
import LeftPanel from '@/components/LeftPanel';
import HackerModal from '@/components/HackerModal';
import NodeCatalog from '@/components/NodeCatalog';
import { useNodePalette } from '@/hooks/useNodePalette';
import { useFlowStateSync } from '@/hooks/useFlowStateSync';
import { useFlowInteraction } from '@/hooks/useFlowInteraction';
import { useWorkspacePersistence } from '@/hooks/useWorkspacePersistence';
import { FlowCanvas } from './FlowCanvas';

export default function FlowController() {
  const [workspaceName, setWorkspaceName] = useState('workspace-1');
  const nodePalette = useNodePalette();
  const { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange, onConnect } = useFlowStateSync();
  const {
    isModalOpen, panelPos,
    setIsModalOpen, setPanelPos,
    onConnectStart, onConnectEnd, addNodeByType, onPaneClick, handleCloseModal
  } = useFlowInteraction({ nodes, edges, setNodes, setEdges, nodePalette });
  const { saveWorkspace, loadWorkspace } = useWorkspacePersistence();

  const handleSaveWorkspace = async () => {
    const success = await saveWorkspace(workspaceName, nodes, edges);
    if (success) {
      alert(`✅ Workspace "${workspaceName}" salvo!`);
    } else {
      alert(`❌ Erro ao salvar workspace`);
    }
  };

  const handleLoadWorkspace = async () => {
    const data = await loadWorkspace(workspaceName);
    if (data && data.nodes && data.edges) {
      setNodes(data.nodes);
      setEdges(data.edges);
      alert(`✅ Workspace "${workspaceName}" carregado!`);
    } else {
      alert(`❌ Workspace não encontrado`);
    }
  };

  return (
    <>
      <div className="globalWrapper">
        <LeftPanel 
  onOpenModal={() => setIsModalOpen(true)}
  nodes={nodes}
  edges={edges}
  onLoadWorkspace={(newNodes, newEdges) => {
    setNodes(newNodes);
    setEdges(newEdges);
  }}
/>
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