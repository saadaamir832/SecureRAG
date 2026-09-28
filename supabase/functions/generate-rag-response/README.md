# generate-rag-response

This Supabase Edge Function calls the OpenAI chat-completions API with a secure system prompt and user-scoped document context.

## Setup

1. In your Supabase project dashboard, set the secret:
   - OPENAI_API_KEY
2. Deploy the function:
   - `supabase functions deploy generate-rag-response`
3. Ensure the function is allowed to be invoked by your app.

## Notes

This keeps the API key server-side and never exposes it to the browser.
