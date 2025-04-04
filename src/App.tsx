import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { simulateGptVision } from "./services/api";
import ScreenshotCard from "./components/ScreenshotCard";
import { nanoid } from 'nanoid';
import "./App.css";

function App() {
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    explanation?: string;
    solution?: string;
    explanation_detailed?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Novos estados para capturas de tela e descrição adicional
  const [screenshots, setScreenshots] = useState<Array<{id: string, path: string, dataUrl: string}>>([]);
  const [additionalDescription, setAdditionalDescription] = useState("");

  useEffect(() => {
    // Configura proteções e ocultações da janela
    const setupWindow = async () => {
      try {
        const currentWindow = getCurrentWindow();
        // Protege o conteúdo contra capturas de tela
        await currentWindow.setContentProtected(true);
        // Oculta da barra de tarefas
        await currentWindow.setSkipTaskbar(true);
        console.log("Proteções ativadas com sucesso!");
      } catch (error) {
        console.error("Erro ao configurar janela:", error);
      }
    };
    
    setupWindow();
  }, []);

  // Capturar screenshot
  const captureScreenshot = async () => {
    try {
      // Temporariamente desativa a proteção da tela para capturar
      const currentWindow = getCurrentWindow();
      await currentWindow.setContentProtected(false);
      
      // Espera um momento para a proteção ser desativada
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Captura a tela usando nossa função Rust
      const base64Image = await invoke<string>('capture_screen');
      
      // Reativa a proteção
      await currentWindow.setContentProtected(true);
      
      // Formata a imagem para exibição
      const dataUrl = `data:image/png;base64,${base64Image}`;
      
      // Gera um ID único
      const id = nanoid();
      const filename = `screenshot_${id}.png`;
      const filePath = `screenshots/${filename}`;
      
      // Adiciona à lista de screenshots
      setScreenshots(prev => [...prev, {
        id,
        path: filePath,
        dataUrl
      }]);
      
    } catch (err) {
      console.error("Erro ao capturar tela:", err);
      setError("Falha ao capturar a tela. Tente novamente.");
    }
  };

  // Excluir screenshot
  const deleteScreenshot = async (id: string) => {
    try {
      const screenshot = screenshots.find(s => s.id === id);
      if (screenshot) {
        // Remover arquivo (na implementação real)
        // await invoke("delete_temp_image", { filePath: screenshot.path });
        
        // Atualizar estado
        setScreenshots(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error("Erro ao excluir screenshot:", err);
    }
  };

  // Análise com GPT
  const analyzeWithGPT = async () => {
    setLoading(true);
    setError(null);
    
    try {
      setIsScreenshotMode(true);
      
      // Na implementação final com OpenAI, usaríamos algo assim:
      // Extrair apenas a parte base64 do dataUrl
      /*
      const imageArray = screenshots.map(s => s.dataUrl.split(',')[1]);
      const response = await analyzeScreenshotWithGpt(
        imageArray,
        `Analise este problema do LeetCode e forneça uma solução. ${additionalDescription}`
      );
      */
      
      // Por enquanto, usamos a API simulada para obter resultado
      const response = await simulateGptVision(
        `Analise este problema do LeetCode e forneça uma solução. ${additionalDescription}`
      );
      
      // Limpa os screenshots após o envio
      setScreenshots([]);
      setAdditionalDescription("");
      
      setResult(response);
    } catch (err) {
      setError("Erro ao analisar. Tente novamente.");
      console.error(err);
    } finally {
      setIsScreenshotMode(false);
      setLoading(false);
    }
  };

  // Função para copiar o código sem seleção visual
  const copyCodeToClipboard = () => {
    if (result?.solution) {
      // Remove os marcadores markdown do código
      const cleanCode = result.solution.replace(/```[a-z]*\n|```$/g, '');
      
      // Copiar para área de transferência sem seleção visual
      navigator.clipboard.writeText(cleanCode)
        .then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        })
        .catch(err => {
          console.error('Erro ao copiar código:', err);
        });
    }
  };

  // Ativar o modo de "resolver problema" com atalho de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+Z como atalho para capturar tela
      if (e.altKey && e.key === "z") {
        captureScreenshot();
      }
      
      // Alt+X como atalho para analisar
      if (e.altKey && e.key === "x" && screenshots.length > 0) {
        analyzeWithGPT();
      }
      
      // Ctrl+C ou Command+C quando resultado está visível para copiar solução
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && result?.solution) {
        copyCodeToClipboard();
        e.preventDefault(); // Previne o comportamento padrão
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [result, screenshots]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>LeetCode Helper</h1>
        <p className="subtitle">Seu assistente para resolver problemas do LeetCode</p>
      </header>

      <main className="app-content">
        {isScreenshotMode && (
          <div className="screenshot-overlay">
            <div className="screenshot-message">Analisando...</div>
          </div>
        )}

        {loading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>Processando sua solicitação...</p>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {!result && !loading && (
          <div className="submit-form">
            <h2>Capturar problema do LeetCode</h2>
            
            {screenshots.length > 0 && (
              <>
                <h3>Capturas de tela ({screenshots.length})</h3>
                <div className="screenshots-container">
                  {screenshots.map(screenshot => (
                    <ScreenshotCard 
                      key={screenshot.id} 
                      imageData={screenshot.dataUrl} 
                      onDelete={() => deleteScreenshot(screenshot.id)} 
                    />
                  ))}
                </div>
              </>
            )}
            
            <div className="form-group">
              <label htmlFor="additional-description">Descrição adicional (opcional)</label>
              <textarea 
                id="additional-description"
                value={additionalDescription}
                onChange={(e) => setAdditionalDescription(e.target.value)}
                placeholder="Adicione detalhes específicos que você gostaria de mencionar..."
              />
            </div>
            
            <div className="form-actions">
              <button 
                className="screenshot-btn"
                onClick={captureScreenshot}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                Capturar tela (Alt+Z)
              </button>
              
              <button 
                className="submit-btn"
                onClick={analyzeWithGPT}
              >
                Analisar problema (Alt+X)
              </button>
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="result-container">
            <div className="result-section">
              <h2>Análise do Problema</h2>
              <p>{result.explanation}</p>
            </div>

            <div className="result-section">
              <h2>Solução</h2>
              <div className="code-header">
                <button 
                  className="copy-button"
                  onClick={copyCodeToClipboard}
                >
                  {copySuccess ? 'Copiado!' : 'Copiar código'}
                </button>
              </div>
              <pre className="code-block">
                <code>{result.solution?.replace(/```[a-z]*\n|```$/g, '')}</code>
              </pre>
            </div>

            <div className="result-section">
              <h2>Explicação Detalhada</h2>
              <p>{result.explanation_detailed}</p>
            </div>
            
            <button 
              className="capture-button"
              onClick={() => {
                setResult(null);
                setError(null);
              }}
            >
              Nova análise
            </button>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Desenvolvido para fazer uma pegadinha com os amigos 😉</p>
        <p className="shortcut-info">Alt+Z: Capturar tela | Alt+X: Analisar problema | Ctrl+C: Copiar solução</p>
      </footer>
    </div>
  );
}

export default App;
