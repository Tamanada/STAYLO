import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const SYSTEM_PROMPT = `You are STAYLO's AI assistant — friendly, professional, and knowledgeable about the hospitality industry.

STAYLO is the first booking platform owned by hoteliers. Key facts:
- Only 10% commission (vs 15-25% for Booking.com, Expedia, Airbnb)
- Hotels can buy Genesis Shares ($1,000 each) to become co-owners
- Ambassador program: guests get 1 free night + 2% lifetime commission
- Welcome Kit with QR codes for viral growth
- $STAY token for governance (1 hotel = 1 vote)
- Founded by David Deveaux, based in Koh Phangan, Thailand
- Corporate structure: Singapore (Staylo Holdings Pte. Ltd)

Rules:
- Always respond in the same language the user writes in
- Be concise, warm, and professional — never robotic
- If asked about pricing, shares, or legal: give general info but recommend contacting the team
- Never invent features that don't exist
- For technical support, suggest emailing david.dancingelephant@gmail.com`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { messages, language } = await req.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM_PROMPT + `\n\nThe user's interface language is: ${language || 'en'}. Respond in that language unless they write in a different one.`,
        messages: messages.slice(-10),
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return new Response(
        JSON.stringify({ error: `Anthropic API error: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const reply = data.content?.[0]?.text || ''

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
