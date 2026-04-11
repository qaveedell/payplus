import { useEffect, useState } from 'react';
import { Table, Button, Space, Typography, Modal, Form, Input, Select, message, Popconfirm, Tag, Row, Col, Avatar, Tabs, Card, Checkbox } from 'antd';
import { PlusOutlined, DeleteOutlined, SettingOutlined, UserOutlined, CrownOutlined, BellOutlined, SendOutlined, KeyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { User } from '../types';
import { getUsers, createUser, deleteUser, resetUserPassword, adminCreateNotification } from '../api';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const roleColors: Record<string, string> = {
  admin: '#6366f1',
  payer: '#10b981',
  requester: '#f59e0b',
};

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  payer: 'Payer',
  requester: 'Requester',
};

export default function AdminPage() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [sendingNotif, setSendingNotif] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [broadcastAll, setBroadcastAll] = useState(true);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwUserId, setPwUserId] = useState('');
  const [pwUserName, setPwUserName] = useState('');
  const [form] = Form.useForm();
  const [notifForm] = Form.useForm();
  const [pwForm] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers();
      setUsers(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (values: { username: string; password: string; display_name: string; role: string }) => {
    try {
      await createUser(values);
      message.success(t('common.success'));
      setModalOpen(false);
      form.resetFields();
      fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || t('common.error');
      message.error(msg);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUser(id);
      message.success(t('common.success'));
      fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || t('common.error');
      message.error(msg);
    }
  };

  const handleResetPassword = async (values: { password: string }) => {
    try {
      await resetUserPassword(pwUserId, values.password);
      message.success(t('common.success'));
      setPwModalOpen(false);
      pwForm.resetFields();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || t('common.error');
      message.error(msg);
    }
  };

  const handleSendNotification = async (values: { title: string; message: string }) => {
    setSendingNotif(true);
    try {
      const userIds = broadcastAll ? [] : selectedUserIds;
      const res = await adminCreateNotification({ user_ids: userIds, title: values.title, message: values.message });
      message.success(`${t('notification.sent_to')} ${res.data.created} ${t('notification.users')}`);
      setNotifModalOpen(false);
      notifForm.resetFields();
      setSelectedUserIds([]);
      setBroadcastAll(true);
    } catch {
      message.error(t('common.error'));
    } finally {
      setSendingNotif(false);
    }
  };

  const userColumns = [
    {
      title: 'User',
      key: 'user',
      render: (_: unknown, record: User) => (
        <Space>
          <Avatar
            size={36}
            icon={record.role === 'admin' ? <CrownOutlined /> : <UserOutlined />}
            style={{
              background: `linear-gradient(135deg, ${roleColors[record.role]}, ${roleColors[record.role]}aa)`,
            }}
          />
          <div>
            <div style={{ fontWeight: 600, color: '#111827' }}>{record.display_name}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>@{record.username}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag style={{
          color: roleColors[role],
          background: `${roleColors[role]}15`,
          border: `1px solid ${roleColors[role]}40`,
          fontWeight: 600,
          borderRadius: 20,
          padding: '2px 12px',
        }}>
          {role === 'admin' && <CrownOutlined style={{ marginRight: 4 }} />}
          {roleLabels[role] || role}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD'),
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: User) => (
        record.id !== currentUser?.id ? (
          <Space size={4}>
            <Button
              type="text"
              icon={<KeyOutlined />}
              style={{ borderRadius: 8, color: '#6366f1' }}
              onClick={() => { setPwUserId(record.id); setPwUserName(record.display_name); pwForm.resetFields(); setPwModalOpen(true); }}
              title={t('admin.reset_password')}
            />
            <Popconfirm
              title={`Delete ${record.display_name}?`}
              onConfirm={() => handleDelete(record.id)}
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }} />
            </Popconfirm>
          </Space>
        ) : (
          <Tag color="blue" style={{ borderRadius: 20 }}>You</Tag>
        )
      ),
    },
  ];

  return (
    <>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Space align="center">
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <SettingOutlined style={{ color: '#fff', fontSize: 18 }} />
            </div>
            <div>
              <Typography.Title level={4} style={{ margin: 0, fontWeight: 700 }}>
                {t('nav.admin')}
              </Typography.Title>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                Manage users and system settings
              </Typography.Text>
            </div>
          </Space>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'users',
            label: (
              <Space>
                <UserOutlined />
                {t('admin.users')}
              </Space>
            ),
            children: (
              <>
                <Row justify="end" style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => { form.resetFields(); setModalOpen(true); }}
                    style={{ borderRadius: 10, height: 40, fontWeight: 600, paddingInline: 20 }}
                  >
                    {t('admin.add_user')}
                  </Button>
                </Row>
                <Table
                  dataSource={users}
                  columns={userColumns}
                  rowKey="id"
                  loading={loading}
                  style={{ borderRadius: 12, overflow: 'hidden' }}
                />
              </>
            ),
          },
          {
            key: 'notifications',
            label: (
              <Space>
                <BellOutlined />
                {t('admin.notifications')}
              </Space>
            ),
            children: (
              <Card
                style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
                styles={{ body: { padding: 28 } }}
              >
                <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                  <div>
                    <Typography.Title level={5} style={{ margin: 0 }}>{t('admin.send_notification')}</Typography.Title>
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                      {t('admin.send_notification_desc')}
                    </Typography.Text>
                  </div>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={() => { notifForm.resetFields(); setBroadcastAll(true); setSelectedUserIds([]); setNotifModalOpen(true); }}
                    style={{ borderRadius: 10, height: 40, fontWeight: 600, paddingInline: 20 }}
                  >
                    {t('notification.send')}
                  </Button>
                </Row>
                <div style={{ padding: 16, background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    {t('admin.notification_info')}
                  </Typography.Text>
                </div>
              </Card>
            ),
          },
        ]}
      />

      {/* Add User Modal */}
      <Modal
        title={t('admin.add_user')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input placeholder="e.g. john" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 4 }]}>
            <Input.Password placeholder="Min 4 characters" />
          </Form.Item>
          <Form.Item name="display_name" label="Display Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. John Doe" />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select placeholder="Select role">
              <Select.Option value="requester">Requester</Select.Option>
              <Select.Option value="payer">Payer</Select.Option>
              <Select.Option value="admin">Admin</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Send Notification Modal */}
      <Modal
        title={
          <Space>
            <BellOutlined style={{ color: '#6366f1' }} />
            {t('notification.send')}
          </Space>
        }
        open={notifModalOpen}
        onCancel={() => setNotifModalOpen(false)}
        onOk={() => notifForm.submit()}
        okText={t('notification.send')}
        cancelText={t('common.cancel')}
        confirmLoading={sendingNotif}
      >
        <Form form={notifForm} layout="vertical" onFinish={handleSendNotification} style={{ marginTop: 16 }}>
          <Form.Item label={t('notification.recipients')}>
            <Checkbox
              checked={broadcastAll}
              onChange={(e) => { setBroadcastAll(e.target.checked); if (e.target.checked) setSelectedUserIds([]); }}
              style={{ marginBottom: 8 }}
            >
              {t('notification.all_users')}
            </Checkbox>
            {!broadcastAll && (
              <Select
                mode="multiple"
                placeholder={t('notification.select_users')}
                style={{ width: '100%' }}
                value={selectedUserIds}
                onChange={setSelectedUserIds}
                options={users.map((u) => ({
                  value: u.id,
                  label: `${u.display_name} (@${u.username})`,
                }))}
              />
            )}
          </Form.Item>
          <Form.Item name="title" label={t('notification.title')} rules={[{ required: true }]}>
            <Input placeholder={t('notification.title_placeholder')} />
          </Form.Item>
          <Form.Item name="message" label={t('notification.message')} rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder={t('notification.message_placeholder')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        title={
          <Space>
            <KeyOutlined style={{ color: '#6366f1' }} />
            {t('admin.reset_password')} — {pwUserName}
          </Space>
        }
        open={pwModalOpen}
        onCancel={() => setPwModalOpen(false)}
        onOk={() => pwForm.submit()}
        okText={t('admin.reset_password')}
        cancelText={t('common.cancel')}
      >
        <Form form={pwForm} layout="vertical" onFinish={handleResetPassword} style={{ marginTop: 16 }}>
          <Form.Item name="password" label={t('admin.new_password')} rules={[{ required: true, min: 4 }]}>
            <Input.Password placeholder={t('admin.new_password_placeholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
