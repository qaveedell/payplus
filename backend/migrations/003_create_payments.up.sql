CREATE TYPE payment_type AS ENUM ('received', 'request');
CREATE TYPE iban_type AS ENUM ('sheba', 'card', 'account', 'contact');
CREATE TYPE payment_status AS ENUM ('unpaid', 'paid', 'unknown', 'problematic');

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    type payment_type NOT NULL,
    name VARCHAR(200) NOT NULL,
    iban_type iban_type NOT NULL,
    iban_value VARCHAR(50) NOT NULL,
    amount BIGINT NOT NULL,
    reference_number VARCHAR(100),
    national_id VARCHAR(10),
    phone VARCHAR(15),
    status payment_status NOT NULL DEFAULT 'unpaid',
    is_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed_at TIMESTAMPTZ,
    receipt_url TEXT,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_type ON payments(type);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_by ON payments(created_by);
CREATE INDEX idx_payments_parent_id ON payments(parent_id);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_contact_id ON payments(contact_id);
