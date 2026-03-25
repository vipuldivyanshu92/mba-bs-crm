import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const urlUserId = url.searchParams.get("user_id");
    
    // Attempt to parse JSON body
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      throw new Error("Invalid JSON body");
    }

    const { transcript, user_id: bodyUserId } = body as any;
    const userId = urlUserId || bodyUserId;

    if (!userId) throw new Error("user_id is required either in payload or query params");
    if (!transcript?.trim()) throw new Error("Transcript is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    // Vercel apps injected with Supabase will have these standard names or fallback to anon key
    // For auto-inserting bypassing RLS, we prefer SERVICE_ROLE_KEY.
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Supabase configuration missing");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      throw new Error("Failed to process AI request: " + response.status);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result: any = {};
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    }

    if (!result.attendee_name) {
      throw new Error("Could not extract attendee name from transcript.");
    }

    const todayDate = new Date().toISOString().split('T')[0];

    // 1. Find or create contact
    let contactId;
    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userId)
      .ilike('full_name', `%${result.attendee_name}%`)
      .limit(1);

    if (existingContacts && existingContacts.length > 0) {
      contactId = existingContacts[0].id;
      await supabase
        .from('contacts')
        .update({ last_interaction_date: todayDate })
        .eq('id', contactId);
    } else {
      const { data: newContact, error } = await supabase
        .from('contacts')
        .insert({
          user_id: userId,
          full_name: result.attendee_name,
          company: result.attendee_company || null,
          role_title: result.attendee_role || null,
          relationship_strength: 'warm',
          last_interaction_date: todayDate,
        })
        .select()
        .single();
      if (error) throw new Error("Contact insertion failed: " + error.message);
      contactId = newContact.id;
    }

    // Follow-up date: 3 days from now
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 3);
    const followUpDateString = followUpDate.toISOString().split('T')[0];

    // 2. Create Meeting
    const { error: meetingErr } = await supabase.from('meetings').insert({
      user_id: userId,
      contact_id: contactId,
      date: todayDate,
      meeting_type: result.meeting_type,
      key_takeaways: result.key_takeaways,
      promised_next_steps: result.next_steps,
      transcript: transcript,
      source: 'otter',
      sent_thank_you: false,
      followup_date: followUpDateString,
    });
    if (meetingErr) throw new Error("Meeting insertion failed: " + meetingErr.message);

    // 3. Create Follow-up Reminder
    const { error: followUpErr } = await supabase.from('follow_ups').insert({
      user_id: userId,
      contact_id: contactId,
      due_date: followUpDateString,
      description: `Send follow-up to ${result.attendee_name} (from Otter)`,
      status: 'pending',
    });
    if (followUpErr) throw new Error("Follow-up insertion failed: " + followUpErr.message);

    // 4. Save Drafted Message
    const { error: draftErr } = await supabase.from('drafted_messages').insert({
      user_id: userId,
      contact_id: contactId,
      message_type: 'follow_up',
      subject: result.email_subject,
      content: result.email_body,
    });
    if (draftErr) throw new Error("Draft insertion failed: " + draftErr.message);

    return new Response(JSON.stringify({ success: true, message: "Otter meeting logged successfully", result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("otter-webhook error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
