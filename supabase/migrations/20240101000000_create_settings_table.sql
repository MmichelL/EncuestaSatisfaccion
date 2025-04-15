-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Insert default values
INSERT INTO settings (key, value) VALUES
  ('company_name', 'Mi Empresa'),
  ('default_discount_template', 'DESC{percentage}'),
  ('default_discount_validity_days', '30'),
  ('company_logo_url', '')
ON CONFLICT (key) DO NOTHING;

-- Set up Row Level Security (RLS)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users with admin role
CREATE POLICY "Allow full access to admins" ON settings
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Create storage bucket for logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy for authenticated users
CREATE POLICY "Allow authenticated users to upload logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Allow authenticated users to update logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'logos');

CREATE POLICY "Allow public to view logos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'logos');
