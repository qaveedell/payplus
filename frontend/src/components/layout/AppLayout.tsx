import { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Button, Dropdown, Space, Avatar, Typography, Badge, Drawer, List, Tag, Empty, Modal, Form, Input, message } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DownloadOutlined,
  UploadOutlined,
  ContactsOutlined,
  BarChartOutlined,
  LogoutOutlined,
  GlobalOutlined,
  UserOutlined,
  BellOutlined,
  SettingOutlined,
  CrownOutlined,
  MessageOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useDirection } from '../../hooks/useDirection';
import { getNotifications, markAllNotificationsRead, markNotificationRead, getMessagesUnreadCount, changePassword } from '../../api';
import type { Notification } from '../../types';
import dayjs from 'dayjs';

const { Header, Sider, Content } = Layout;

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const direction = useDirection();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [msgUnreadCount, setMsgUnreadCount] = useState(0);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwForm] = Form.useForm();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data);
    } catch { /* silent */ }
  };

  const fetchMsgUnread = async () => {
    try {
      const res = await getMessagesUnreadCount();
      setMsgUnreadCount(res.data.count);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchNotifications();
    fetchMsgUnread();
    pollRef.current = setInterval(fetchNotifications, 60_000);
    msgPollRef.current = setInterval(fetchMsgUnread, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (msgPollRef.current) clearInterval(msgPollRef.current);
    };
  }, []);

  const handleOpenNotifications = () => {
    setNotifDrawerOpen(true);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleChangePassword = async (values: { old_password: string; new_password: string }) => {
    try {
      await changePassword(values.old_password, values.new_password);
      message.success(t('common.success'));
      setPwModalOpen(false);
      pwForm.resetFields();
    } catch (err: unknown) {
      const msg2 = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || t('common.error');
      message.error(msg2);
    }
  };

  const handleMarkOneRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  const menuItems = [
    { key: '/received', icon: <DownloadOutlined />, label: t('nav.received') },
    { key: '/requests', icon: <UploadOutlined />, label: t('nav.requests') },
    {
      key: '/messages',
      icon: <Badge count={msgUnreadCount} size="small" offset={[6, 0]}><MessageOutlined /></Badge>,
      label: t('nav.messages'),
    },
    { key: '/contacts', icon: <ContactsOutlined />, label: t('nav.contacts') },
    { key: '/reports', icon: <BarChartOutlined />, label: t('nav.reports') },
    ...(user?.role === 'admin' ? [{ key: '/admin', icon: <SettingOutlined />, label: t('nav.admin') }] : []),
  ];

  const languageLabels: Record<string, string> = { en: 'EN', fa: 'FA', ur: 'UR' };
  const languageMenuItems = [
    { key: 'en', label: 'English', onClick: () => i18n.changeLanguage('en') },
    { key: 'fa', label: 'فارسی', onClick: () => i18n.changeLanguage('fa') },
    { key: 'ur', label: 'اردو', onClick: () => i18n.changeLanguage('ur') },
  ];

  const siderWidth = 240;
  const siderCollapsedWidth = 80;

  return (
    <Layout style={{ minHeight: '100vh', direction, background: '#f3f4f6' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={siderWidth}
        collapsedWidth={siderCollapsedWidth}
        breakpoint="lg"
        onBreakpoint={(broken) => setCollapsed(broken)}
        style={{
          position: 'fixed',
          height: '100vh',
          [direction === 'rtl' ? 'right' : 'left']: 0,
          zIndex: 100,
          background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)',
          borderRight: direction === 'ltr' ? 'none' : 'none',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Logo */}
        <div style={{
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          margin: '0 0 8px',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(129, 140, 248, 0.4)',
            flexShrink: 0,
          }}>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>P</span>
          </div>
          {!collapsed && (
            <Typography.Text style={{
              color: '#fff', fontSize: 20, fontWeight: 700,
              letterSpacing: '-0.3px',
            }}>
              {t('app_name')}
            </Typography.Text>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '0 8px',
          }}
        />

        {/* User area at bottom */}
        {!collapsed && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px 20px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <Avatar
              size={36}
              icon={user?.role === 'admin' ? <CrownOutlined /> : <UserOutlined />}
              style={{
                background: user?.role === 'admin'
                  ? 'linear-gradient(135deg, #f59e0b, #f97316)'
                  : 'linear-gradient(135deg, #818cf8, #a78bfa)',
                flexShrink: 0,
              }}
            />
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.display_name}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textTransform: 'capitalize' }}>
                {user?.role === 'admin' ? 'Admin' : user?.role === 'requester' ? 'Requester' : 'Payer'}
              </div>
            </div>
          </div>
        )}
      </Sider>

      <Layout style={{
        [direction === 'rtl' ? 'marginRight' : 'marginLeft']: collapsed ? siderCollapsedWidth : siderWidth,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        background: '#f3f4f6',
      }}>
        <Header style={{
          padding: '0 28px',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e5e7eb',
          height: 64,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 18, color: '#374151', width: 40, height: 40 }}
          />
          <Space size={4}>
            <Dropdown menu={{ items: languageMenuItems }} placement="bottomRight">
              <Button type="text" style={{
                borderRadius: 8, height: 36, padding: '0 12px',
                background: '#f3f4f6', color: '#6b7280', fontWeight: 500, fontSize: 13,
              }}>
                <GlobalOutlined style={{ marginRight: 4 }} />
                {languageLabels[i18n.language] || 'EN'}
              </Button>
            </Dropdown>
            <Button
              type="text"
              onClick={handleOpenNotifications}
              style={{
                borderRadius: 8, width: 36, height: 36,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Badge count={unreadCount} size="small" overflowCount={9}>
                <BellOutlined style={{ fontSize: 18, color: unreadCount > 0 ? '#6366f1' : '#6b7280' }} />
              </Badge>
            </Button>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'change-password',
                    icon: <KeyOutlined />,
                    label: t('nav.change_password'),
                    onClick: () => { pwForm.resetFields(); setPwModalOpen(true); },
                  },
                  { key: 'divider', type: 'divider' as const },
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: t('nav.logout'),
                    onClick: logout,
                    danger: true,
                  },
                ],
              }}
              placement="bottomRight"
            >
              <Button type="text" style={{
                borderRadius: 8, height: 36, padding: '0 8px 0 4px',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Avatar
                  size={28}
                  icon={<UserOutlined />}
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                />
                <span style={{ fontWeight: 500, color: '#374151', fontSize: 13 }}>
                  {user?.display_name}
                </span>
              </Button>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{
          margin: 24,
          padding: 28,
          background: '#ffffff',
          borderRadius: 16,
          minHeight: 280,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e5e7eb',
        }}>
          <Outlet />
        </Content>
      </Layout>

      {/* Notifications Drawer */}
      <Drawer
        title={
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <BellOutlined style={{ color: '#6366f1' }} />
              <span>{t('notification.title')}</span>
              {unreadCount > 0 && <Badge count={unreadCount} size="small" />}
            </Space>
            {unreadCount > 0 && (
              <Button size="small" type="link" onClick={handleMarkAllRead} style={{ padding: 0 }}>
                {t('notification.mark_all_read')}
              </Button>
            )}
          </Space>
        }
        open={notifDrawerOpen}
        onClose={() => setNotifDrawerOpen(false)}
        width={380}
        placement={direction === 'rtl' ? 'left' : 'right'}
      >
        {notifications.length === 0 ? (
          <Empty description={t('notification.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(notif) => (
              <List.Item
                style={{
                  background: notif.is_read ? '#fff' : '#eef2ff',
                  padding: '12px 16px',
                  borderRadius: 10,
                  marginBottom: 8,
                  border: `1px solid ${notif.is_read ? '#e5e7eb' : '#c7d2fe'}`,
                  cursor: notif.is_read ? 'default' : 'pointer',
                }}
                onClick={() => !notif.is_read && handleMarkOneRead(notif.id)}
              >
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontWeight: notif.is_read ? 500 : 700, color: '#111827', fontSize: 14 }}>
                      {notif.title}
                    </span>
                    {!notif.is_read && <Tag color="blue" style={{ borderRadius: 20, fontSize: 10 }}>New</Tag>}
                  </div>
                  <div style={{ color: '#4b5563', fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
                    {notif.message}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>
                      {notif.created_by_name && `${notif.created_by_name} · `}
                      {dayjs(notif.created_at).format('MMM D, HH:mm')}
                    </span>
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </Drawer>

      {/* Change Password Modal */}
      <Modal
        title={t('nav.change_password')}
        open={pwModalOpen}
        onCancel={() => setPwModalOpen(false)}
        onOk={() => pwForm.submit()}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form form={pwForm} layout="vertical" onFinish={handleChangePassword} style={{ marginTop: 16 }}>
          <Form.Item name="old_password" label={t('nav.current_password')} rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="new_password" label={t('nav.new_password')} rules={[{ required: true, min: 4 }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
