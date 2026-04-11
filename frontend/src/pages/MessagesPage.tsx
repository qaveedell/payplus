import { useState, useEffect, useRef, useCallback } from 'react';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import type { Conversation, MessageItem } from '../types';
import {
  getConversations,
  getConversationMessages,
  sendMessage as apiSendMessage,
  createDM,
  markConversationRead,
} from '../api';
import ConversationList from '../components/messaging/ConversationList';
import ChatArea from '../components/messaging/ChatArea';
import NewDMModal from '../components/messaging/NewDMModal';
import NewGroupModal from '../components/messaging/NewGroupModal';
import GroupSettingsModal from '../components/messaging/GroupSettingsModal';

export default function MessagesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [dmModalOpen, setDmModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);

  const convPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeConvIdRef = useRef<string | null>(null);

  // Keep ref in sync
  useEffect(() => {
    activeConvIdRef.current = activeConv?.id || null;
  }, [activeConv?.id]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await getConversations();
      setConversations(res.data);
    } catch { /* silent */ }
  }, []);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async () => {
    const convId = activeConvIdRef.current;
    if (!convId) return;
    try {
      const res = await getConversationMessages(convId);
      setMessages(res.data);
      // Mark as read
      markConversationRead(convId).catch(() => {});
    } catch { /* silent */ }
  }, []);

  // Initial load + polling
  useEffect(() => {
    fetchConversations();
    convPollRef.current = setInterval(fetchConversations, 8000);
    return () => { if (convPollRef.current) clearInterval(convPollRef.current); };
  }, [fetchConversations]);

  // Message polling when a conversation is active
  useEffect(() => {
    if (activeConv) {
      fetchMessages();
      msgPollRef.current = setInterval(fetchMessages, 5000);
    }
    return () => { if (msgPollRef.current) clearInterval(msgPollRef.current); };
  }, [activeConv?.id, fetchMessages]);

  const handleSelectConv = (conv: Conversation) => {
    setActiveConv(conv);
    setMessages([]);
    setMessageInput('');
  };

  const handleSendMessage = async () => {
    if (!activeConv || !messageInput.trim()) return;
    try {
      await apiSendMessage(activeConv.id, messageInput.trim());
      setMessageInput('');
      fetchMessages();
      fetchConversations(); // refresh last_message preview
    } catch {
      message.error(t('common.error'));
    }
  };

  const handleCreateDM = async (recipientId: string) => {
    try {
      const res = await createDM(recipientId);
      setDmModalOpen(false);
      fetchConversations();
      setActiveConv(res.data);
    } catch {
      message.error(t('common.error'));
    }
  };

  const handleGroupCreated = (conv: Conversation) => {
    setGroupModalOpen(false);
    fetchConversations();
    setActiveConv(conv);
  };

  const handleGroupUpdated = () => {
    setGroupSettingsOpen(false);
    fetchConversations();
    // Refresh active conv
    if (activeConv) {
      getConversations().then((res) => {
        const updated = res.data.find((c) => c.id === activeConv.id);
        if (updated) setActiveConv(updated);
      });
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 160px)',
      margin: -28,
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid #e5e7eb',
    }}>
      {/* Left: conversation list */}
      <div style={{
        width: 320,
        flexShrink: 0,
        borderRight: '1px solid #e5e7eb',
        background: '#fff',
      }}>
        <ConversationList
          conversations={conversations}
          activeConvId={activeConv?.id || null}
          currentUserId={user?.id || ''}
          isAdmin={user?.role === 'admin'}
          onSelect={handleSelectConv}
          onNewDM={() => setDmModalOpen(true)}
          onNewGroup={() => setGroupModalOpen(true)}
        />
      </div>

      {/* Right: chat area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <ChatArea
          conversation={activeConv}
          messages={messages}
          messageInput={messageInput}
          onInputChange={setMessageInput}
          onSend={handleSendMessage}
          currentUserId={user?.id || ''}
          isAdmin={user?.role === 'admin'}
          onGroupSettings={() => setGroupSettingsOpen(true)}
        />
      </div>

      {/* Modals */}
      <NewDMModal
        open={dmModalOpen}
        currentUserId={user?.id || ''}
        onSelect={handleCreateDM}
        onCancel={() => setDmModalOpen(false)}
      />
      <NewGroupModal
        open={groupModalOpen}
        onCreated={handleGroupCreated}
        onCancel={() => setGroupModalOpen(false)}
      />
      <GroupSettingsModal
        open={groupSettingsOpen}
        conversation={activeConv}
        onUpdated={handleGroupUpdated}
        onCancel={() => setGroupSettingsOpen(false)}
      />
    </div>
  );
}
