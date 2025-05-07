-- Migration: Add AI Mode table

-- Check if table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_mode'
  ) THEN
    -- Create AI Mode table
    CREATE TABLE ai_mode (
      id SERIAL PRIMARY KEY,
      status BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Insert default value
    INSERT INTO ai_mode (status) VALUES (FALSE);
    
    RAISE NOTICE 'Created AI Mode table and inserted default value';
  ELSE
    RAISE NOTICE 'AI Mode table already exists, skipping migration';
  END IF;
END
$$; 