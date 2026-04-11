CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('requester', 'payer')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed PAK (requester) and Reza (payer)
-- Passwords: pak123 and reza123 (bcrypt hashed)
INSERT INTO users (username, password_hash, display_name, role) VALUES
    ('pak', '$2a$10$P51PANpMEKw1shxmW7pBx.Pa0zdzqPXuFpKdI3hHN/biy4wslHt2.', 'PAK', 'requester'),
    ('reza', '$2a$10$tzPqjbwF0FLxlcnYfcYyWe3xkI428wmOwdz8BTvm.6Q4nERRuNvjK', 'Reza', 'payer');
