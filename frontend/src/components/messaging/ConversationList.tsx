import { List, Avatar, Badge, Button, Dropdown, Typography, Empty } from 'antd';
import { PlusOutlined, UserOutlined, TeamOutlined, MessageOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { Conversation } from '../../types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface Props {
  conversations: Conversation[];
  activeConvId: string | null;
  currentUserId: string;
  isAdmin: boolean;
  onSelect: (conv: Conversation) => void;
  onNewDM: () => void;
  onNewGroup: () => void;
}

export default function ConversationList({ conversations, activeConvId, currentUserId, isAdmin, onSelect, onNewDM, onNewGroup }: Props) {
  const { t } = useTranslation();

  const getConvName = (conv: Conversation): string => {
    if (conv.type === 'group') return conv.name || 'Group';
    const other = conv.members.find((m) => m.user_id !== currentUserId);
    return other?.display_name || 'Unknown';
  };

  const getConvAvatar = (conv: Conversation) => {
    if (conv.type === 'group') {
      return (
        <Avatar
          size={44}
          icon={<TeamOutlined />}
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', flexShrink: 0 }}
        />
      );
    }
    const other = conv.members.find((m) => m.user_id !== currentUserId);
    const name = other?.display_name || '?';
    return (
      <Avatar
        size={44}
        style={{
          background: `linear-gradient(135deg, #10b981, #34d399)`,
          flexShrink: 0,
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        {name.charAt(0).toUpperCase()}
      </Avatar>
    );
  };

  const newMenuItems = [
    { key: 'dm', icon: <MessageOutlined />, label: t('messaging.new_dm'), onClick: onNewDM },
    ...(isAdmin ? [{ key: 'group', icon: <TeamOutlined />, label: t('messaging.new_group'), onClick: onNewGroup }] : []),
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Typography.Title level={5} style={{ margin: 0, fontWeight: 700 }}>
          {t('messaging.title')}
        </Typography.Title>
        <Dropdown menu={{ items: newMenuItems }} placement="bottomRight" trigger={['click']}>
          <Button
            type="primary"
            shape="circle"
            icon={<PlusOutlined />}
            size="small"
            style={{ background: '#6366f1', borderColor: '#6366f1' }}
          />
        </Dropdown>
      </div>

      {/* Conversation list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {conversations.length === 0 ? (
          <Empty
            description={t('messaging.no_conversations')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ marginTop: 60 }}
          />
        ) : (
          <List
            dataSource={conversations}
            renderItem={(conv) => {
              const isActive = conv.id === activeConvId;
              const lastMsg = conv.last_message;
              return (
                <div
                  onClick={() => onSelect(conv)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: isActive ? '#eef2ff' : 'transparent',
                    borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                    transition: 'all 0.15s',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <Badge count={conv.unread_count} size="small" offset={[-4, 4]}>
                    {getConvAvatar(conv)}
                  </Badge>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontWeight: conv.unread_count > 0 ? 700 : 500,
                        color: '#111827',
                        fontSize: 14,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {getConvName(conv)}
                      </span>
                      {lastMsg && (
                        <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0, marginLeft: 8 }}>
                          {dayjs(lastMsg.created_at).fromNow(true)}
                        </span>
                      )}
                    </div>
                    {lastMsg && (
                      <div style={{
                        fontSize: 12,
                        color: conv.unread_count > 0 ? '#374151' : '#9ca3af',
                        fontWeight: conv.unread_count > 0 ? 600 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: 2,
                      }}>
                        {lastMsg.sender_name}: {lastMsg.content}
                      </div>
                    )}
                    {conv.type === 'group' && (
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                        <UserOutlined style={{ marginRight: 2 }} />{conv.members.length} {t('messaging.members')}
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
          />
        )}
      </div>
    </div>
  );
}
