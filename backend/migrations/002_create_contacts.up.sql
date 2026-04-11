CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    sheba VARCHAR(26),
    card_number VARCHAR(16),
    account_number VARCHAR(30),
    national_id VARCHAR(10),
    phone VARCHAR(15),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contacts_created_by ON contacts(created_by);
CREATE INDEX idx_contacts_name ON contacts(name);
