/**
 * Integração com Evolution API para envio de mensagens via WhatsApp
 */

import { ENV } from "./env.js";

export async function sendSurveyWhatsAppNotification(phone: string, token: string, clientName: string) {
  const evolutionApiUrl = ENV.evolutionApiUrl;
  const evolutionApiKey = ENV.evolutionApiKey;
  const instanceName = ENV.evolutionInstanceName;

  const surveyLink = `${ENV.appUrl}/survey/${token}`;

  const message = `Olá, ${clientName}! Obrigado por nos escolher. Gostaríamos de saber como foi sua experiência. 
Por favor, responda nossa rápida pesquisa de satisfação clicando no link abaixo:
${surveyLink}

Agradecemos a sua colaboração!`;

  if (!evolutionApiUrl || !evolutionApiKey) {
    console.warn("⚠️ EVOLUTION API env vars não configuradas. Simulando envio de WhatsApp:");
    console.log(`Para: ${phone}\nMensagem: ${message}`);
    return;
  }

  try {
    const endpoint = `${evolutionApiUrl}/message/sendText/${instanceName}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: evolutionApiKey,
      },
      body: JSON.stringify({
        number: phone,
        options: {
          delay: 1200,
          presence: "composing",
        },
        textMessage: {
          text: message
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na Evolution API: ${response.status} - ${errorText}`);
    }

    console.log(`✅ WhatsApp enviado para ${phone} via Evolution API.`);
    return await response.json();
  } catch (error) {
    console.error("❌ Erro ao enviar WhatsApp:", error);
    // Em produção você pode decidir se falha a request inteira ou se cadastra o log.
  }
}
