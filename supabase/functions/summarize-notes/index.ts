import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { notes, meetingType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an assistant for MBA students who helps them organize meeting notes. Given raw notes from a ${meetingType?.replace('_', ' ') || 'meeting'}, extract and return a structured JSON summary. Use tool calling to return structured output.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Summarize these meeting notes:\n\n${notes}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "summarize_meeting",
              description: "Return a structured summary of the meeting notes.",
              parameters: {
                type: "object",
                properties: {
                  what_was_discussed: { type: "string", description: "Brief summary of main topics discussed" },
                  advice_received: { type: "string", description: "Key advice or insights shared" },
                  opportunities_mentioned: { type: "string", description: "Any opportunities, roles, or leads mentioned" },
                  personal_details: { type: "string", description: "Personal details to remember about this person" },
                  best_next_step: { type: "string", description: "The single best next action to take" },
                  key_takeaways: { type: "string", description: "2-3 sentence summary of key takeaways" },
                  next_steps: { type: "string", description: "Concrete next steps to take" },
                },
                required: ["what_was_discussed", "key_takeaways", "next_steps"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "summarize_meeting" } },
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
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let summary = {};
    if (toolCall?.function?.arguments) {
      summary = JSON.parse(toolCall.function.arguments);
    }

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize-notes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
