-- Clear existing models and seed fresh data
DELETE FROM public.models;

-- Seed default AI models for battles
INSERT INTO public.models (name, provider, model_identifier, is_enabled, config) VALUES
  -- OpenAI Models
  (
    'GPT-4o',
    'openai',
    'gpt-4o',
    true,
    '{"temperature": 0.8, "max_tokens": 200}'::jsonb
  ),

  -- Anthropic Models
  (
    'Claude 3.5 Sonnet',
    'anthropic',
    'claude-3-5-sonnet-20241022',
    true,
    '{"temperature": 0.8, "max_tokens": 200}'::jsonb
  ),

  -- Google Models
  (
    'Gemini 2.5',
    'google',
    'gemini-2.5-flash-lite',
    true,
    '{"temperature": 0.8, "max_tokens": 200}'::jsonb
  ),

  -- Groq Models (fast inference)
  (
    'Llama 3.1 8B',
    'meta',
    'llama-3.1-8b',
    true,
    '{"temperature": 0.8, "max_tokens": 200}'::jsonb
  ),

  -- xAI Models
  (
    'Grok 4',
    'xai',
    'grok-4-fast-reasoning',
    true,
    '{"temperature": 0.8, "max_tokens": 200}'::jsonb
  );

-- Verify the data was inserted
SELECT name, provider, model_identifier, is_enabled FROM public.models ORDER BY provider, name;
