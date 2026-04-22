import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  check: boolean;
}

export async function generateAIChecklist(category: string, description: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Como um assistente especializado em serviços técnicos (SAPS - Sistema de Agendamento de Prestação de Serviços), 
        analise o seguinte problema de ${category}:
        
        "${description}"
        
        Retorne um objeto JSON com:
        1. "checklist": Uma lista de 4 itens técnicos que o cliente deve verificar ou preparar antes do técnico chegar. 
           Cada item deve ter "id" (string), "label" (título curto) e "description" (explicação breve).
        2. "suggestedTags": Uma lista de 3-5 tags técnicas relacionadas ao problema (ex: #fuga_agua, #curto_circuito).
        
        O tom deve ser profissional e prestável.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            checklist: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["id", "label", "description"]
              }
            },
            suggestedTags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["checklist", "suggestedTags"]
        }
      }
    });

    if (response && response.text) {
      return JSON.parse(response.text.trim());
    }
    throw new Error("Resposta da IA vazia");
  } catch (error) {
    console.error("Erro na IA (Checklist):", error);
    return {
      checklist: [
        { id: '1', label: 'Verificação básica', description: 'Verifique se o problema persiste ou é intermitente.', check: false },
        { id: '2', label: 'Segurança', description: 'Se houver perigo, desligue a energia ou água na zona afetada.', check: false },
        { id: '3', label: 'Acesso', description: 'Garanta que o técnico terá acesso livre ao local do problema.', check: false },
        { id: '4', label: 'Documentação', description: 'Tenha faturas ou manuais do equipamento à mão, se aplicável.', check: false }
      ],
      suggestedTags: ['#manutencao', '#assistencia_tecnica']
    };
  }
}

export async function matchTechniciansAI(description: string, checklist: ChecklistItem[], providers: any[]) {
  const providersInfo = providers.map(p => ({
    uuid: p.uuidUtilizador,
    nome: p.nomeCompleto,
    biografia: p.biografia || "Sem biografia",
    rating: p.classificacao
  }));

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Problema do Cliente: "${description}"
        Pontos Verificados: ${checklist.filter(c => c.check).map(c => c.label).join(", ")}
        
        Técnicos Disponíveis:
        ${JSON.stringify(providersInfo)}
        
        Seja um recrutador técnico. Classifique os técnicos de 0 a 100 com base na afinidade entre a biografia deles e o problema descrito.
        Retorne um array JSON de objetos contendo "uuidUtilizador", "matchScore" (número) e "reason" (uma frase curta explicando a escolha).
        Retorne apenas os 10 melhores.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              uuidUtilizador: { type: Type.STRING },
              matchScore: { type: Type.NUMBER },
              reason: { type: Type.STRING }
            },
            required: ["uuidUtilizador", "matchScore", "reason"]
          }
        }
      }
    });

    if (response && response.text) {
      return JSON.parse(response.text.trim());
    }
    throw new Error("Resposta da IA vazia");
  } catch (error) {
    console.error("Erro na IA (Matching):", error);
    return providers.slice(0, 3).map(p => ({
      uuidUtilizador: p.uuidUtilizador,
      matchScore: 80,
      reason: "Técnico experiente disponível para este tipo de serviço."
    }));
  }
}
