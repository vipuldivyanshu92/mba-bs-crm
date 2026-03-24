import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MESSAGE_PROMPTS: Record<string, string> = {
  thank_you: "Write a professional thank-you email after a coffee chat or informational interview. Be warm but concise. MBA recruiting appropriate tone.",
  follow_up: "Write a follow-up email to maintain a professional relationship. Reference the previous conversation naturally. Keep it brief and actionable.",
  check_in: "Write a casual check-in message to stay on someone's radar. Be personable but professional. MBA networking appropriate.",
  alumni_outreach: "Write an initial outreach email to an alumni contact. Be respectful of their time, show genuine interest, and clearly state your ask. MBA recruiting appropriate.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { contactName, contactCompany, contactRole, messageType, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const typePrompt = MESSAGE_PROMPTS[messageType] || MESSAGE_PROMPTS.follow_up;

    const userMessage = `Draft a message for:
- Name: ${contactName || 'the contact'}
- Company: ${contactCompany || 'their company'}
- Role: ${contactRole || 'their role'}
- Message type: ${messageType}
${context ? `- Additional context: ${context}` : ''}

${typePrompt}

Return ONLY the email body text, no subject line, no greeting format instructions. Start with the greeting directly.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a professional message drafting assistant for MBA students. Write concise, warm, and professional messages appropriate for recruiting and networking contexts. Keep messages under 150 words. Do not use overly formal language or excessive flattery.",
          },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits needed. Please add credits in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || "Could not generate message.";

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("draft-message error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
