import { useRef, useEffect, useState } from 'react';
import { Typography, Avatar, Button, Input, Space, Tag, Empty, Popover, List, Upload, message } from 'antd';
import { SendOutlined, TeamOutlined, SettingOutlined, UserOutlined, PaperClipOutlined, AudioOutlined, StopOutlined, FileOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { Conversation, MessageItem } from '../../types';
import { uploadReceipt } from '../../api';
import dayjs from 'dayjs';

interface Props {
  conversation: Conversation | null;
  messages: MessageItem[];
  messageInput: string;
  onInputChange: (value: string) => void;
  onSend: (fileUrl?: string, fileType?: string) => void;
  currentUserId: string;
  isAdmin: boolean;
  onGroupSettings?: () => void;
}

export default function ChatArea({
  conversation, messages, messageInput, onInputChange, onSend, currentUserId, isAdmin, onGroupSettings,
}: Props) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(0);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (messages.length > prevMsgCount.current) {
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      if (isAtBottom || prevMsgCount.current === 0) {
        el.scrollTop = el.scrollHeight;
      }
    }
    prevMsgCount.current = messages.length;
  }, [messages.length]);

  if (!conversation) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <Empty description={t('messaging.select_conversation')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  const getConvName = () => {
    if (conversation.type === 'group') return conversation.name || 'Group';
    const other = conversation.members.find((m) => m.user_id !== currentUserId);
    return other?.display_name || 'Unknown';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadReceipt(file);
      const fileType = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('audio/') ? 'voice'
        : file.type.startsWith('video/') ? 'video'
        : 'file';
      onInputChange(file.name);
      setTimeout(() => onSend(res.data.url, fileType), 50);
    } catch {
      message.error(t('common.error'));
    } finally {
      setUploading(false);
    }
    return false;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        setUploading(true);
        try {
          const res = await uploadReceipt(file);
          onInputChange('🎤 Voice message');
          setTimeout(() => onSend(res.data.url, 'voice'), 50);
        } catch {
          message.error(t('common.error'));
        } finally {
          setUploading(false);
        }
      };

      mediaRecorder.start();
      setRecording(true);

      // Auto-stop after 5 minutes
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setRecording(false);
        }
      }, 5 * 60 * 1000);
    } catch {
      message.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const imageBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api$/, '');

  const renderMessageContent = (msg: MessageItem) => {
    if (msg.file_url) {
      const url = msg.file_url.startsWith('http') ? msg.file_url : `${imageBase}${msg.file_url}`;
      if (msg.file_type === 'voice') {
        return (
          <div>
            <audio controls src={url} style={{ maxWidth: 250 }} />
            {msg.content && msg.content !== '🎤 Voice message' && <div style={{ marginTop: 4 }}>{msg.content}</div>}
          </div>
        );
      }
      if (msg.file_type === 'image') {
        return (
          <div>
            <img src={url} alt="" style={{ maxWidth: 250, borderRadius: 8, cursor: 'pointer' }} onClick={() => window.open(url, '_blank')} />
            {msg.content && <div style={{ marginTop: 4 }}>{msg.content}</div>}
          </div>
        );
      }
      return (
        <div>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileOutlined /> {msg.content || 'File'}
          </a>
        </div>
      );
    }
    return <>{msg.content}</>;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      {/* Chat header */}
      <div style={{
        padding: '12px 20px', background: '#fff', borderBottom: '1px solid #e5e7eb',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Space>
          {conversation.type === 'group' ? (
            <Avatar size={36} icon={<TeamOutlined />} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }} />
          ) : (
            <Avatar size={36} style={{ background: 'linear-gradient(135deg, #10b981, #34d399)', fontWeight: 700 }}>
              {getConvName().charAt(0).toUpperCase()}
            </Avatar>
          )}
          <div>
            <Typography.Text strong style={{ fontSize: 15 }}>{getConvName()}</Typography.Text>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>
              {conversation.type === 'group' ? (
                <Popover
                  trigger="click"
                  placement="bottomLeft"
                  title={<Space><TeamOutlined /> {t('messaging.members')} ({conversation.members.length})</Space>}
                  content={
                    <List
                      size="small"
                      dataSource={conversation.members}
                      style={{ maxHeight: 240, overflowY: 'auto', width: 220 }}
                      renderItem={(m) => (
                        <List.Item style={{ padding: '6px 0', border: 'none' }}>
                          <Space>
                            <Avatar size={24} icon={<UserOutlined />} style={{
                              background: m.role === 'admin' ? '#f59e0b' : m.role === 'payer' ? '#10b981' : '#6366f1',
                              fontSize: 11,
                            }} />
                            <span style={{ fontWeight: m.user_id === currentUserId ? 700 : 400 }}>
                              {m.display_name}
                              {m.user_id === currentUserId && <Tag color="blue" style={{ marginLeft: 4, borderRadius: 20, fontSize: 10 }}>{t('messaging.you')}</Tag>}
                            </span>
                          </Space>
                        </List.Item>
                      )}
                    />
                  }
                >
                  <span style={{ cursor: 'pointer', color: '#6366f1', textDecoration: 'underline dotted' }}>
                    {conversation.members.length} {t('messaging.members')}
                  </span>
                </Popover>
              ) : (
                conversation.members.find((m) => m.user_id !== currentUserId)?.role || ''
              )}
            </div>
          </div>
        </Space>
        <Space>
          {conversation.type === 'group' && isAdmin && (
            <Button type="text" icon={<SettingOutlined />} onClick={onGroupSettings} style={{ color: '#6b7280' }} />
          )}
        </Space>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: 40 }}>{t('messaging.no_messages')}</div>
        ) : (
          messages.map((msg, idx) => {
            const isOwn = msg.sender_id === currentUserId;
            const showSender = conversation.type === 'group' && !isOwn;
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const showDate = !prevMsg || dayjs(msg.created_at).format('YYYY-MM-DD') !== dayjs(prevMsg.created_at).format('YYYY-MM-DD');

            return (
              <div key={msg.id}>
                {showDate && (
                  <div style={{ textAlign: 'center', margin: '16px 0' }}>
                    <Tag style={{ background: '#e5e7eb', color: '#6b7280', border: 'none', borderRadius: 20, fontSize: 11 }}>
                      {dayjs(msg.created_at).format('MMM D, YYYY')}
                    </Tag>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
                  <div style={{ maxWidth: '70%' }}>
                    {showSender && (
                      <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, marginBottom: 2, paddingLeft: 12 }}>{msg.sender_name}</div>
                    )}
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isOwn ? 'linear-gradient(135deg, #6366f1, #818cf8)' : '#ffffff',
                      color: isOwn ? '#fff' : '#111827',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      border: isOwn ? 'none' : '1px solid #e5e7eb',
                      fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                    }}>
                      {renderMessageContent(msg)}
                    </div>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3, textAlign: isOwn ? 'right' : 'left', paddingInline: 4 }}>
                      {dayjs(msg.created_at).format('HH:mm')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input bar */}
      <div style={{
        padding: '12px 20px', background: '#fff', borderTop: '1px solid #e5e7eb',
        display: 'flex', gap: 8, alignItems: 'flex-end',
      }}>
        <Upload showUploadList={false} beforeUpload={handleFileUpload as never} disabled={uploading}>
          <Button type="text" icon={<PaperClipOutlined />} loading={uploading} style={{ color: '#6b7280', width: 40, height: 40 }} />
        </Upload>

        <Button
          type="text"
          icon={recording ? <StopOutlined style={{ color: '#ef4444' }} /> : <AudioOutlined />}
          onClick={recording ? stopRecording : startRecording}
          style={{ color: recording ? '#ef4444' : '#6b7280', width: 40, height: 40, animation: recording ? 'pulse 1s infinite' : 'none' }}
        />

        <Input.TextArea
          value={messageInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('messaging.type_message')}
          autoSize={{ minRows: 1, maxRows: 3 }}
          style={{ borderRadius: 12, resize: 'none' }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={() => onSend()}
          disabled={!messageInput.trim() && !uploading}
          style={{ borderRadius: 12, height: 40, width: 40, background: '#6366f1', borderColor: '#6366f1', flexShrink: 0 }}
        />
      </div>
    </div>
  );
}
