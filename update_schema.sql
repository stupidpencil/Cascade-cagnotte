ALTER TABLE contributions ADD COLUMN display_name VARCHAR(100); ALTER TABLE contributions ADD COLUMN is_anonymous BOOLEAN DEFAULT FALSE;
