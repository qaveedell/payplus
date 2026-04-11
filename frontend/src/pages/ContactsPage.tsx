import { useEffect, useState } from 'react';
import { Table, Button, Space, Typography, Modal, Form, Input, message, Popconfirm, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ContactsOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { Contact } from '../types';
import { getContacts, createContact, updateContact, deleteContact } from '../api';

export default function ContactsPage() {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form] = Form.useForm();

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await getContacts();
      setContacts(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContacts(); }, []);

  const openCreate = () => {
    setEditingContact(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (contact: Contact) => {
    setEditingContact(contact);
    form.setFieldsValue(contact);
    setModalOpen(true);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editingContact) {
        await updateContact(editingContact.id, values);
      } else {
        await createContact(values);
      }
      message.success(t('common.success'));
      setModalOpen(false);
      fetchContacts();
    } catch {
      message.error(t('common.error'));
    }
  };

  const handleDelete = async (id: string) => {
    await deleteContact(id);
    message.success(t('common.success'));
    fetchContacts();
  };

  const columns = [
    { title: t('contact.name'), dataIndex: 'name', key: 'name' },
    { title: t('contact.sheba'), dataIndex: 'sheba', key: 'sheba', ellipsis: true },
    { title: t('contact.card_number'), dataIndex: 'card_number', key: 'card_number' },
    { title: t('contact.phone'), dataIndex: 'phone', key: 'phone' },
    {
      title: t('payment.actions'),
      key: 'actions',
      render: (_: unknown, record: Contact) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title={t('contact.delete_confirm')} onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
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
              background: 'linear-gradient(135deg, #10b981, #34d399)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ContactsOutlined style={{ color: '#fff', fontSize: 18 }} />
            </div>
            <div>
              <Typography.Title level={4} style={{ margin: 0, fontWeight: 700 }}>{t('contact.title')}</Typography.Title>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>Saved bank details</Typography.Text>
            </div>
          </Space>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
            style={{ borderRadius: 10, height: 40, fontWeight: 600, paddingInline: 20 }}>
            {t('contact.new')}
          </Button>
        </Col>
      </Row>

      <Table dataSource={contacts} columns={columns} rowKey="id" loading={loading} />

      <Modal
        title={editingContact ? t('common.edit') : t('contact.new')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label={t('contact.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sheba" label={t('contact.sheba')}>
            <Input placeholder="IR..." maxLength={26} />
          </Form.Item>
          <Form.Item name="card_number" label={t('contact.card_number')}>
            <Input maxLength={16} />
          </Form.Item>
          <Form.Item name="account_number" label={t('contact.account_number')}>
            <Input />
          </Form.Item>
          <Form.Item name="national_id" label={t('contact.national_id')}>
            <Input maxLength={10} />
          </Form.Item>
          <Form.Item name="phone" label={t('contact.phone')}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
