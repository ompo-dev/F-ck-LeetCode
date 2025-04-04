import axios from 'axios';

// Tipos para a API da OpenAI
interface TextContent {
  type: 'text';
  text: string;
}

interface ImageContent {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

type Content = TextContent | ImageContent;

// Instância do Axios para o JSON Server
const jsonServerApi = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Instância do Axios para a OpenAI (para uso futuro)
const openAiApi = axios.create({
  baseURL: 'https://api.openai.com/v1',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`, // Será configurado depois
  },
});

// Funções simuladas para o JSON Server
export const simulateGptVision = async (_prompt: string) => {
  try {
    // Seleciona uma resposta aleatória do JSON Server
    const response = await jsonServerApi.get('/responses');
    const randomIndex = Math.floor(Math.random() * response.data.length);
    return response.data[randomIndex].response;
  } catch (error) {
    console.error('Erro ao conectar com o JSON Server:', error);
    throw error;
  }
};

// Função real para OpenAI (para uso futuro)
export const analyzeScreenshotWithGpt = async (imageBase64Array: string[], prompt: string) => {
  try {
    // Criar o array de conteúdo para a API
    const content: Content[] = [
      { type: 'text', text: prompt },
    ];
    
    // Adicionar todas as imagens ao conteúdo
    imageBase64Array.forEach(imageBase64 => {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${imageBase64}`,
        },
      });
    });
    
    const response = await openAiApi.post('/chat/completions', {
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content,
        },
      ],
      max_tokens: 1000,
    });
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Erro ao conectar com a OpenAI:', error);
    throw error;
  }
};

export default {
  simulateGptVision,
  analyzeScreenshotWithGpt,
}; 