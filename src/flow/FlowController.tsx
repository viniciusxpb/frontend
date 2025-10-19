// src/flow/FlowController.tsx
import React, { useState, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import LeftPanel from '@/components/LeftPanel';
import HackerModal from '@/components/HackerModal';
import NodeCatalog from '@/components/NodeCatalog';
import { useNodePalette } from '@/hooks/useNodePalette';
import { useFlowStateSync } from '@/hooks/useFlowStateSync';
import { useFlowInteraction } from '@/hooks/useFlowInteraction';
import { useWorkspacePersistence } from '@/hooks/useWorkspacePersistence';
import { FlowCanvas } from './FlowCanvas';

type FlowControllerProps = {
  onReassignNodeData?: (nodes: Node[]) => Node[];
};

export default function FlowController({ onReassignNodeData }: FlowControllerProps) {
  const [workspaceName, setWorkspaceName] = useState('workspace-1');
  const nodePalette = useNodePalette();
  const { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange, onConnect } = useFlowStateSync();
  const {
    isModalOpen, panelPos,
    setIsModalOpen, setPanelPos,
    onConnectStart, onConnectEnd, addNodeByType, onPaneClick, handleCloseModal
  } = useFlowInteraction({ nodes, edges, setNodes, setEdges, nodePalette });
  const { saveWorkspace, loadWorkspace } = useWorkspacePersistence();

  // Função que atualiza os valores dos nós
  const handleNodeValueChange = useCallback((nodeId: string, value: string) => {
    console.log(`📝 Atualizando node ${nodeId} para valor:`, value);
    setNodes(nds => nds.map(node => 
      node.id === nodeId ? { ...node, data: { ...node.data, value } } : node
    ));
  }, [setNodes]);

  // Função para processar nós carregados do workspace
  const handleLoadWorkspace = useCallback(async (workspaceName: string) => {
    const data = await loadWorkspace(workspaceName);
    if (data && data.nodes && data.edges) {
      let processedNodes = data.nodes;
      
      // Aplica o reassign das funções se disponível
      if (onReassignNodeData) {
        processedNodes = onReassignNodeData(data.nodes);
      } else {
        // Fallback: reassign local se a prop não foi passada
        processedNodes = data.nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            onChange: handleNodeValueChange
          }
        }));
      }
      
      setNodes(processedNodes);
      setEdges(data.edges);
      console.log('✅ Workspace carregado com nós processados:', processedNodes);
      return true;
    }
    return false;
  }, [loadWorkspace, setNodes, setEdges, onReassignNodeData, handleNodeValueChange]);

  const handleSaveWorkspace = async () => {
    const success = await saveWorkspace(workspaceName, nodes, edges);
    if (success) {
      alert(`✅ Workspace "${workspaceName}" salvo!`);
    } else {
      alert(`❌ Erro ao salvar workspace`);
    }
  };

  // Handler para quando o LeftPanel carrega um workspace
  const handleLoadWorkspaceFromPanel = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    let processedNodes = newNodes;
    
    // Aplica o reassign das funções se disponível
    if (onReassignNodeData) {
      processedNodes = onReassignNodeData(newNodes);
    } else {
      // Fallback: reassign local
      processedNodes = newNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onChange: handleNodeValueChange
        }
      }));
    }
    
    setNodes(processedNodes);
    setEdges(newEdges);
    console.log('🎯 Workspace carregado via LeftPanel:', processedNodes);
  }, [setNodes, setEdges, onReassignNodeData, handleNodeValueChange]);

  return (
    <>
      <div className="globalWrapper">
        <LeftPanel 
          onOpenModal={() => setIsModalOpen(true)}
          nodes={nodes}
          edges={edges}
          onLoadWorkspace={handleLoadWorkspaceFromPanel}
          onReassignNodeData={onReassignNodeData}
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