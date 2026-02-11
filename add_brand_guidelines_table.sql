-- Luo brand_guidelines -taulu brändiohjedokumenttien hallintaan
CREATE TABLE IF NOT EXISTS brand_guidelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  content TEXT, -- PDF:n sisältö tekstinä
  summary TEXT, -- AI-generoitu tiivistelmä
  uploaded_by_id UUID REFERENCES auth.users(id),
  uploaded_by_email TEXT,
  is_active BOOLEAN DEFAULT true,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Luo storage bucket brändiohjedokumenteille
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-guidelines', 'brand-guidelines', true)
ON CONFLICT (id) DO NOTHING;

-- Aseta storage policies: Kaikki voivat lukea, vain adminit voivat ladata
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-guidelines');

CREATE POLICY "Admin upload access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'brand-guidelines'
  AND auth.uid() IN (
    SELECT id FROM user_profiles WHERE is_admin = true
  )
);

CREATE POLICY "Admin delete access"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'brand-guidelines'
  AND auth.uid() IN (
    SELECT id FROM user_profiles WHERE is_admin = true
  )
);

-- Aseta RLS policies tauluille
ALTER TABLE brand_guidelines ENABLE ROW LEVEL SECURITY;

-- Kaikki voivat lukea aktiiviset dokumentit
CREATE POLICY "Anyone can read active brand guidelines"
ON brand_guidelines FOR SELECT
USING (is_active = true);

-- Vain adminit voivat lisätä
CREATE POLICY "Admins can insert brand guidelines"
ON brand_guidelines FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM user_profiles WHERE is_admin = true
  )
);

-- Vain adminit voivat päivittää
CREATE POLICY "Admins can update brand guidelines"
ON brand_guidelines FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM user_profiles WHERE is_admin = true
  )
);

-- Vain adminit voivat poistaa (soft delete)
CREATE POLICY "Admins can delete brand guidelines"
ON brand_guidelines FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM user_profiles WHERE is_admin = true
  )
);

-- Luo indeksit
CREATE INDEX IF NOT EXISTS idx_brand_guidelines_active ON brand_guidelines(is_active);
CREATE INDEX IF NOT EXISTS idx_brand_guidelines_created_at ON brand_guidelines(created_at DESC);
