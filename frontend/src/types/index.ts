export interface User {
  id: string;
  username: string;
  display_name: string;
  role: 'requester' | 'payer' | 'admin';
  avatar_url?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  parent_id?: string;
  type: 'received' | 'request';
  name: string;
  iban_type: 'sheba' | 'card' | 'account' | 'contact';
  iban_value: string;
  amount: number;
  reference_number?: string | null;
  bank_name?: string | null;
  national_id?: string;
  phone?: string;
  status: 'unpaid' | 'paid' | 'unknown' | 'problematic';
  is_confirmed: boolean;
  confirmed_at?: string;
  receipt_url?: string;
  contact_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  notes?: Note[];
  sub_payments?: Payment[];
}

export interface PaymentFilter {
  type?: string;
  status?: string;
  name?: string;
  search?: string;
  sort_by?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

export interface PaymentListResponse {
  payments: Payment[];
  total: number;
  page: number;
  page_size: number;
}

export interface Contact {
  id: string;
  name: string;
  sheba?: string;
  card_number?: string;
  account_number?: string;
  national_id?: string;
  phone?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  payment_id: string;
  author_id: string;
  author_name?: string;
  content: string;
  created_at: string;
}

export interface ReportSummary {
  total_payments: number;
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  paid_count: number;
  unpaid_count: number;
  problematic_count: number;
}

export interface ContactReport {
  contact_id?: string;
  contact_name: string;
  total_amount: number;
  paid_amount: number;
  count: number;
}

export interface TimelinePoint {
  period: string;
  total_amount: number;
  paid_amount: number;
  count: number;
}

export interface IBANCheckResponse {
  valid: boolean;
  name: string;
  card_number?: string;
  bank_name?: string;
}

// Messaging
export interface ConversationMember {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  role: string;
  joined_at: string;
}

export interface MessageItem {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  type: 'dm' | 'group';
  name?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  members: ConversationMember[];
  last_message?: MessageItem;
  unread_count: number;
}
