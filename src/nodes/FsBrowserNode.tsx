// src/nodes/FsBrowserNode.tsx
import React, { useState, useEffect, useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { SelectorControl } from '@/components/SelectorControl';
import type { BaseNodeData } from './BaseIONode';

// Interface para a resposta do backend node-fs-browser
interface DirectoryEntry {
    name: string;
    is_dir: boolean;
    path: string;
    modified: string;
}

interface FsBrowserApiResponse {
    current_path: string;
    entries: DirectoryEntry[];
}

// Props do nó
type FsBrowserNodeData = BaseNodeData & {
    // Campos específicos futuros aqui
};

export function FsBrowserNode({ id, data }: NodeProps<FsBrowserNodeData>) {
    const [entries, setEntries] = useState<DirectoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentListedPath, setCurrentListedPath] = useState<string | null>(null);

    // Função para buscar dados no backend
    const fetchDirectoryContents = useCallback(async (path: string) => {
        if (!path) {
            setEntries([]);
            setCurrentListedPath(null);
            return;
        }
        setIsLoading(true);
        setError(null);
        setCurrentListedPath(path);
        console.log(`[FsBrowserNode:${id}] 📡 Buscando conteúdo para: ${path}`);
        try {
            const response = await fetch('http://localhost:3011/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: path }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erro ${response.status}: ${errorText || response.statusText}`);
            }

            const result: FsBrowserApiResponse = await response.json();
            console.log(`[FsBrowserNode:${id}] ✅ Resposta: ${result.entries?.length || 0} entradas.`);
            // Filtra '..' para não ter handle E para não ser clicável abaixo
            setEntries(result.entries.filter(e => e.name !== '..') || []);

        } catch (err) {
            console.error(`[FsBrowserNode:${id}] ❌ Erro:`, err);
            setError(err instanceof Error ? err.message : 'Erro desconhecido');
            setEntries([]);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    // Busca o conteúdo quando 'data.value' (caminho) muda
    useEffect(() => {
        if (data.value && data.value !== currentListedPath && !isLoading) {
            fetchDirectoryContents(data.value);
        } else if (!data.value && currentListedPath) {
             setEntries([]);
             setCurrentListedPath(null);
        }
    }, [data.value, fetchDirectoryContents, isLoading, currentListedPath]);

    // Pega a função onChange do FlowController
    const handlePathChange = useCallback((nodeId: string, newValue: string) => {
        if (data.onChange) {
            data.onChange(nodeId, newValue);
        }
    }, [data.onChange]);

    // *** NOVO: Handler para clique nas entradas da lista ***
    const handleEntryClick = useCallback((entry: DirectoryEntry) => {
        // Se for um diretório, navega para ele atualizando o valor do nó
        if (entry.is_dir) {
            console.log(`[FsBrowserNode:${id}] ➡️ Navegando para pasta: ${entry.path}`);
            handlePathChange(id, entry.path); // Isso vai disparar o useEffect para buscar
        } else {
            // Se for arquivo, não faz nada ao clicar (só conectar pelo handle)
            console.log(`[FsBrowserNode:${id}] 📄 Arquivo clicado (sem ação): ${entry.name}`);
        }
    }, [id, handlePathChange]);


    // Estilos
    const listStyle: React.CSSProperties = {
        maxHeight: '200px', // Aumentei um pouco a altura máxima
        overflowY: 'auto',
        marginTop: '8px',
        border: '1px solid rgba(0, 255, 153, 0.2)',
        padding: '4px',
        fontSize: '11px',
        background: 'rgba(0, 0, 0, 0.2)',
    };
    const entryStyleBase: React.CSSProperties = { // Estilo base para DRY
        position: 'relative', padding: '3px 6px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px dotted rgba(0, 255, 153, 0.1)', minHeight: '22px',
        userSelect: 'none',
        transition: 'background-color 0.1s ease', // Feedback visual
    };
    const folderStyle: React.CSSProperties = { // Estilo adicional para pastas
        cursor: 'pointer', // Indica que é clicável
    };
    const fileStyle: React.CSSProperties = { // Estilo para arquivos (não clicável)
         opacity: 0.8, // Um pouco mais apagado
         cursor: 'default',
    };
    const handleBaseStyle: React.CSSProperties = {
        position: 'absolute', right: '-10px', top: '50%',
        transform: 'translateY(-50%)', width: '8px', height: '8px',
        background: '#00ff99', border: '1px solid #005e38',
        borderRadius: '50%', cursor: 'crosshair',
        zIndex: 10
    };

    return (
        // Classe 'hacker-node' e AUMENTO da largura mínima
        <div className="hacker-node" style={{ minWidth: '350px' }}>
            <strong>{data.label ?? 'Navegador'}</strong>

            <div style={{ marginTop: '4px' }}>
                <SelectorControl
                    id={id}
                    name="path"
                    value={data.value ?? ''}
                    onChange={handlePathChange}
                    isFolderSelector={true}
                    placeholder="Escolha uma pasta..."
                />
            </div>

            {isLoading && <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '5px' }}>Carregando...</div>}
            {error && <div style={{ fontSize: '11px', color: '#ff4444', marginTop: '5px' }}>Erro: {error}</div>}

            {!isLoading && !error && entries.length > 0 && (
                <div style={listStyle}>
                    {entries.map((entry, index) => {
                        // Combina o estilo base com o específico de pasta/arquivo
                        const combinedStyle = {
                             ...entryStyleBase,
                             ...(entry.is_dir ? folderStyle : fileStyle)
                        };
                        return (
                            <div
                                key={entry.path || `entry-${index}`}
                                style={combinedStyle}
                                title={entry.path}
                                // *** NOVO: onClick chama handleEntryClick ***
                                onClick={() => handleEntryClick(entry)}
                                // Efeito Hover
                                onMouseEnter={(e) => { if (entry.is_dir) e.currentTarget.style.backgroundColor = 'rgba(0, 77, 51, 0.3)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                                <span>{entry.is_dir ? '📁' : '📄'} {entry.name}</span>
                                <Handle
                                    type="source"
                                    id={`out_${entry.path}`}
                                    position={Position.Right}
                                    style={handleBaseStyle}
                                />
                            </div>
                        );
                     })}
                </div>
            )}
             {!isLoading && !error && entries.length === 0 && data.value && (
                <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '5px' }}>(Pasta vazia ou sem permissão)</div>
            )}
        </div>
    );
}