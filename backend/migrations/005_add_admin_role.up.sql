-- Drop old constraint and add admin role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('requester', 'payer', 'admin'));

-- Seed admin user (password: admin123)
INSERT INTO users (username, password_hash, display_name, role) VALUES
    ('admin', '$2a$10$EcWT8yUDXDGap5P76F.nxeD7KAPODTmNmDp7bNSOADDN4/ej1Lo8a', 'Admin', 'admin');
