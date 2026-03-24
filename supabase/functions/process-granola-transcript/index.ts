import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript, userContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!transcript?.trim()) throw new Error("Transcript is required");

    const systemPrompt = `You are an assistant for MBA students. You do two things from a meeting transcript:

1. Extract structured meeting details (attendee, company, role, type, takeaways, next steps).
2. Write a short follow-up email.

MEETING TYPE must be one of: coffee_chat, info_interview, networking_event, class_project, alumni_call. Pick the closest match.

FOLLOW-UP EMAIL RULES (non-negotiable):
- Never use em dashes or en dashes. Use commas or periods instead.
- Never use dramatic words like "incredible", "amazing", "blown away", "truly", "invaluable", "game-changer".
- Never write "this, not that" constructions like "It's not just X, it's Y".
- Never write "I wanted to reach out" or "I hope this finds you well" or "per our conversation".
- Keep sentences short. Average 10-15 words per sentence.
- Reference one specific detail from the conversation to prove it is not generic.
- The email body must be under 100 words.
- Sound like a smart, thoughtful person writing a quick note. Not a marketer. Not a chatbot.
- Start with a simple "Hi [Name]," greeting.
- End with something natural like "Talk soon," or "Best," followed by a newline (the sender will add their name).`;

    const userMessage = `Process this meeting transcript and extract details + write a follow-up email.
${userContext ? `\nAdditional context from the user: ${userContext}` : ''}

TRANSCRIPT:
${transcript}`;

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
          { role: "user", content: userMessage },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "process_transcript",
              description: "Extract meeting details and generate a follow-up email from a transcript.",
              parameters: {
                type: "object",
                properties: {
                  attendee_name: { type: "string", description: "Full name of the main person the user met with" },
                  attendee_company: { type: "string", description: "Company of the attendee, or empty string if unknown" },
                  attendee_role: { type: "string", description: "Role/title of the attendee, or empty string if unknown" },
                  meeting_type: {
                    type: "string",
                    enum: ["coffee_chat", "info_interview", "networking_event", "class_project", "alumni_call"],
                    description: "Best matching meeting type",
                  },
                  key_takeaways: { type: "string", description: "2-3 sentence summary of the most important points from the meeting" },
                  next_steps: { type: "string", description: "Concrete next steps or action items discussed" },
                  email_subject: { type: "string", description: "Short, natural email subject line (under 8 words)" },
                  email_body: { type: "string", description: "The follow-up email body, under 100 words, following all anti-slop rules" },
                },
                required: ["attendee_name", "meeting_type", "key_takeaways", "next_steps", "email_subject", "email_body"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "process_transcript" } },
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
    let result = {};
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-granola-transcript error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
