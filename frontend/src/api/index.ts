import client from './client';
import type {
  User,
  Payment,
  PaymentFilter,
  PaymentListResponse,
  Contact,
  Note,
  Notification,
  Conversation,
  MessageItem,
  ReportSummary,
  ContactReport,
  TimelinePoint,
  IBANCheckResponse,
} from '../types';

// Auth
export const login = (username: string, password: string) =>
  client.post<{ token: string; user: User }>('/auth/login', { username, password });

export const getMe = () =>
  client.get<User>('/auth/me');

export const changePassword = (oldPassword: string, newPassword: string) =>
  client.patch('/auth/password', { old_password: oldPassword, new_password: newPassword });

// Payments
export const getPayments = (filter: PaymentFilter) =>
  client.get<PaymentListResponse>('/payments', { params: filter });

export const getPayment = (id: string) =>
  client.get<Payment>(`/payments/${id}`);

export const createPayment = (data: Partial<Payment>) =>
  client.post<Payment>('/payments', data);

export const updatePayment = (id: string, data: Partial<Payment>) =>
  client.put<Payment>(`/payments/${id}`, data);

export const updatePaymentStatus = (id: string, status: string, receipt_url?: string) =>
  client.patch<Payment>(`/payments/${id}/status`, { status, receipt_url });

export const confirmPayment = (id: string) =>
  client.patch<Payment>(`/payments/${id}/confirm`);

export const createSubPayment = (parentId: string, data: Partial<Payment>) =>
  client.post<Payment>(`/payments/${parentId}/split`, data);

// Notes
export const getPaymentNotes = (paymentId: string) =>
  client.get<Note[]>(`/payments/${paymentId}/notes`);

export const addPaymentNote = (paymentId: string, content: string) =>
  client.post<Note>(`/payments/${paymentId}/notes`, { content });

// Contacts
export const getContacts = () =>
  client.get<Contact[]>('/contacts');

export const createContact = (data: Partial<Contact>) =>
  client.post<Contact>('/contacts', data);

export const updateContact = (id: string, data: Partial<Contact>) =>
  client.put<Contact>(`/contacts/${id}`, data);

export const deleteContact = (id: string) =>
  client.delete(`/contacts/${id}`);

// Uploads
export const uploadReceipt = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return client.post<{ url: string; filename: string }>('/upload/receipt', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// IBAN Check
export const checkIBAN = (sheba: string) =>
  client.post<IBANCheckResponse>('/iban/check', { sheba });

// Reports
export const getReportSummary = (dateFrom?: string, dateTo?: string) =>
  client.get<ReportSummary>('/reports/summary', { params: { date_from: dateFrom, date_to: dateTo } });

export const getReportByContact = (dateFrom?: string, dateTo?: string) =>
  client.get<ContactReport[]>('/reports/by-contact', { params: { date_from: dateFrom, date_to: dateTo } });

export const getReportTimeline = (dateFrom?: string, dateTo?: string, granularity?: string) =>
  client.get<TimelinePoint[]>('/reports/timeline', { params: { date_from: dateFrom, date_to: dateTo, granularity } });

// Admin - Users
export const getUsers = () =>
  client.get<User[]>('/admin/users');

export const createUser = (data: { username: string; password: string; display_name: string; role: string }) =>
  client.post<User>('/admin/users', data);

export const resetUserPassword = (id: string, password: string) =>
  client.patch(`/admin/users/${id}/password`, { password });

export const deleteUser = (id: string) =>
  client.delete(`/admin/users/${id}`);

// Admin - Notifications
export const adminCreateNotification = (data: { user_ids: string[]; title: string; message: string }) =>
  client.post<{ created: number }>('/admin/notifications', data);

// Notifications (current user)
export const getNotifications = () =>
  client.get<Notification[]>('/notifications');

export const getUnreadCount = () =>
  client.get<{ count: number }>('/notifications/unread-count');

export const markNotificationRead = (id: string) =>
  client.patch(`/notifications/${id}/read`);

export const markAllNotificationsRead = () =>
  client.patch('/notifications/read-all');

// Messaging
export const getConversations = () =>
  client.get<Conversation[]>('/messages/conversations');

export const getConversationMessages = (convId: string, limit = 50, offset = 0) =>
  client.get<MessageItem[]>(`/messages/conversations/${convId}/messages`, { params: { limit, offset } });

export const sendMessage = (convId: string, content: string) =>
  client.post<MessageItem>(`/messages/conversations/${convId}/messages`, { content });

export const createDM = (recipientId: string) =>
  client.post<Conversation>('/messages/dm', { recipient_id: recipientId });

export const createGroup = (name: string, memberIds: string[]) =>
  client.post<Conversation>('/messages/groups', { name, member_ids: memberIds });

export const updateGroup = (groupId: string, data: { name?: string; member_ids?: string[] }) =>
  client.put<Conversation>(`/messages/groups/${groupId}`, data);

export const markConversationRead = (convId: string) =>
  client.post(`/messages/conversations/${convId}/read`);

export const getMessagesUnreadCount = () =>
  client.get<{ count: number }>('/messages/unread-count');

export const getMessageableUsers = () =>
  client.get<User[]>('/messages/users');
