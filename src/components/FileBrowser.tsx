// viniciusxpb/frontend/frontend-e2ff74bfb8b04c2182486c99304ae2e139575034/src/components/FileBrowser.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useWsClient } from '@/hooks/useWsClient';
import { buildWsUrl } from '@/utils/wsUrl';

// Definindo a estrutura da entrada que vem do Rust
interface DirectoryEntry {
    name: string;
    is_dir: boolean;
    path: string;
    modified: string; // Vem como string ISO 8601 do Rust
}

interface FileBrowserProps {
    onSelectPath: (path: string) => void;
    initialPath: string;
    isFolderPicker: boolean; // Seletor de pasta ou de arquivo
}

export function FileBrowser({ onSelectPath, initialPath, isFolderPicker }: FileBrowserProps) {
    const [currentPath, setCurrentPath] = useState(initialPath || '.');
    const [entries, setEntries] = useState<DirectoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const WS_URL = buildWsUrl();
    const client = useWsClient(WS_URL, { heartbeatMs: 0, debug: false });

    // Função para enviar o comando de navegação ao Maestro (Rust)
    const sendBrowseCommand = useCallback((path: string) => {
        // Sanatiza o path: se vazio, usa "." (diretório atual)
        const sanitizedPath = path.trim() === '..' ? '..' : path.trim() || '.';
        
        if (!client.send) return;
        setIsLoading(true);
        const command = {
            type: 'BROWSE_PATH',
            path: sanitizedPath,
            request_id: `req-${Date.now()}` // Para rastrear
        };
        client.send(JSON.stringify(command));
    }, [client]);

    // Efeito para iniciar a navegação no caminho inicial
    useEffect(() => {
        sendBrowseCommand(currentPath);
    }, [currentPath, sendBrowseCommand]);

    // Efeito para receber e processar a resposta do Maestro
    useEffect(() => {
        if (client.lastJson && (client.lastJson as any)?.type === 'FS_BROWSE_RESULT') {
            const payload = (client.lastJson as any);
            setCurrentPath(payload.current_path);
            setEntries(payload.entries);
            setIsLoading(false);
        }
    }, [client.lastJson]);

    const handleEntryClick = useCallback((entry: DirectoryEntry) => {
        if (entry.is_dir) {
            // Se for pasta ou "..", muda o caminho e recarrega
            setCurrentPath(entry.path);
        } else if (!isFolderPicker) {
            // Se for seletor de arquivos e clicou em arquivo, seleciona e fecha.
            onSelectPath(entry.path);
        }
    }, [isFolderPicker, onSelectPath]);
    
    // Simplesmente seleciona a pasta atual
    const handleSelectCurrent = useCallback(() => {
        onSelectPath(currentPath);
    }, [currentPath, onSelectPath]);

    // Renderização no estilo hacker
    return (
        <div style={{ padding: '8px', minHeight: '300px' }}>
            <div style={{ marginBottom: '8px', fontSize: '14px', color: '#00ff99' }}>
                Caminho: {isLoading ? 'Conectando ao disco...' : currentPath}
            </div>

            {isFolderPicker && (
                <button 
                    className="hacker-btn nodrag"
                    onClick={handleSelectCurrent} 
                    disabled={isLoading}
                    style={{ marginBottom: '10px' }}
                >
                    ✅ Selecionar esta pasta
                </button>
            )}

            {isLoading ? (
                <div style={{ opacity: 0.8, padding: '20px', textAlign: 'center' }}>
                    Aguardando resposta do Node de Serviço...
                </div>
            ) : (
                <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #1f5329', padding: '4px' }}>
                    {entries.map((entry) => (
                        <div 
                            key={entry.path + entry.name}
                            onClick={() => handleEntryClick(entry)}
                            className="nodrag"
                            style={{
                                cursor: entry.is_dir || !isFolderPicker ? 'pointer' : 'default',
                                padding: '3px',
                                fontSize: '12px',
                                opacity: entry.is_dir ? 1 : 0.7,
                                color: entry.is_dir ? '#00ccff' : '#b7f397',
                                borderBottom: '1px dotted #17351c',
                                display: 'flex',
                                justifyContent: 'space-between',
                                transition: 'background 0.1s ease',
                                userSelect: 'none',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 77, 51, 0.2)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <span>{entry.name === '..' ? '⬆️' : entry.is_dir ? '📁' : '📄'} {entry.name}</span>
                            <span style={{ opacity: 0.5, fontSize: '10px' }}>{entry.modified.substring(0, 10)}</span>
                        </div>
                    ))}
                    {entries.length === 0 && <div style={{ opacity: 0.5, padding: '10px' }}>Pasta vazia ou erro de acesso.</div>}
                </div>
            )}
        </div>
    );
}