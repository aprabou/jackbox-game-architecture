-- Create core tables for the Jackbox game

-- Models table
CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'openai', 'anthropic', etc
  model_identifier TEXT NOT NULL, -- e.g., 'gpt-4-turbo'
  config JSONB DEFAULT '{}'::jsonb, -- temperature, max_tokens, etc
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL, -- 4-6 char code for easy joining
  host_session_id TEXT NOT NULL, -- anonymous session ID
  settings JSONB DEFAULT '{}'::jsonb, -- game settings
  state TEXT DEFAULT 'lobby', -- lobby, playing, finished
  current_round_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Room players (anonymous)
CREATE TABLE room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'player', -- player, spectator, judge
  score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Rounds
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  round_index INT NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  state TEXT DEFAULT 'submission', -- submission, voting, revealed
  created_at TIMESTAMP DEFAULT NOW()
);

-- Submissions (responses to prompts)
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  room_player_id UUID REFERENCES room_players(id) ON DELETE CASCADE,
  model_id UUID REFERENCES models(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  anonymized_id TEXT NOT NULL, -- e.g., 'sub_abc123'
  score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Votes
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  voter_session_id TEXT NOT NULL, -- anonymous voter
  vote_value INT DEFAULT 1, -- +1 per vote
  created_at TIMESTAMP DEFAULT NOW()
);

-- Model runs (track API calls)
CREATE TABLE model_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  latency_ms INT,
  tokens_used INT,
  raw_response JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_rooms_code ON rooms(room_code);
CREATE INDEX idx_room_players_room_id ON room_players(room_id);
CREATE INDEX idx_room_players_session_id ON room_players(session_id);
CREATE INDEX idx_rounds_room_id ON rounds(room_id);
CREATE INDEX idx_submissions_round_id ON submissions(round_id);
CREATE INDEX idx_submissions_model_id ON submissions(model_id);
CREATE INDEX idx_votes_submission_id ON votes(submission_id);
