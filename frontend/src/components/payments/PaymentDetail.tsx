import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Descriptions, Tag, Button, Space, Tabs, Upload, message, Image, Divider, Card, Typography, Popconfirm, Alert, Badge, Modal, Form, Input, InputNumber, Select } from 'antd';
import { ArrowLeftOutlined, UploadOutlined, CheckCircleOutlined, PlusOutlined, PictureOutlined, WarningOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import type { Payment } from '../../types';
import { getPayment, updatePayment, updatePaymentStatus, confirmPayment, uploadReceipt, createSubPayment, deletePayment } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import NotesList from '../notes/NotesList';
import SubPaymentForm from './SubPaymentForm';
import PaymentReceipt from './PaymentReceipt';

const statusTagColors: Record<string, string> = {
  unpaid: 'default',
  paid: 'success',
  unknown: 'warning',
  problematic: 'error',
};

// Build image base URL — strip /api suffix from API base
const imageBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api$/, '');

export default function PaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSubForm, setShowSubForm] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();

  const fetchPayment = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getPayment(id);
      setPayment(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayment(); }, [id]);

  const handleStatusChange = async (status: string) => {
    if (!id) return;
    await updatePaymentStatus(id, status);
    message.success(t('common.success'));
    fetchPayment();
  };

  const handleConfirm = async () => {
    if (!id) return;
    await confirmPayment(id);
    message.success(t('common.success'));
    fetchPayment();
  };

  const handleReceiptUpload = async (file: File) => {
    try {
      const res = await uploadReceipt(file);
      await updatePaymentStatus(id!, 'paid', res.data.url);
      message.success(t('common.success'));
      fetchPayment();
    } catch {
      message.error(t('common.error'));
    }
  };

  const handleReceiptUploadOnly = async (file: File) => {
    try {
      const res = await uploadReceipt(file);
      // Just attach receipt without changing status
      await updatePaymentStatus(id!, payment!.status, res.data.url);
      message.success(t('common.success'));
      fetchPayment();
    } catch {
      message.error(t('common.error'));
    }
  };

  const handleCreateSubPayment = async (values: Record<string, unknown>) => {
    if (!id) return;
    await createSubPayment(id, values as never);
    message.success(t('common.success'));
    setShowSubForm(false);
    fetchPayment();
  };

  if (loading || !payment) return <div>{t('common.loading')}</div>;

  const canManage = user?.role === 'payer' || user?.role === 'admin';
  const formatAmount = (amount: number) => new Intl.NumberFormat('en-US').format(amount) + ' ' + t('payment.rials');
  const hasReceipt = !!payment.receipt_url;

  const receiptTab = {
    key: 'receipt',
    label: (
      <Badge dot={!hasReceipt} offset={[6, 0]}>
        <Space size={4}>
          <PictureOutlined />
          {t('payment.receipt')}
        </Space>
      </Badge>
    ),
    children: hasReceipt ? (
      <div style={{ textAlign: 'center', padding: 16 }}>
        <Image
          src={`${imageBase}${payment.receipt_url}`}
          style={{ maxWidth: 500, borderRadius: 12 }}
          placeholder
        />
        <div style={{ marginTop: 12, color: '#6b7280', fontSize: 13 }}>
          Uploaded receipt
        </div>
      </div>
    ) : (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Alert
          message="No receipt uploaded"
          description="A receipt photo is required before this payment can be marked as paid."
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ maxWidth: 500, margin: '0 auto 24px', borderRadius: 12 }}
        />
        {canManage && (
          <Upload
            showUploadList={false}
            beforeUpload={(file) => { handleReceiptUploadOnly(file); return false; }}
            accept="image/*"
          >
            <Button type="primary" icon={<UploadOutlined />} size="large" style={{ borderRadius: 10 }}>
              {t('payment.upload_receipt')}
            </Button>
          </Upload>
        )}
      </div>
    ),
  };

  const tabItems = [
    {
      key: 'details',
      label: t('payment.details'),
      children: (
        <Descriptions bordered column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label={t('payment.name')}>{payment.name}</Descriptions.Item>
          <Descriptions.Item label={t('payment.iban_type')}>{t(`payment.iban_types.${payment.iban_type}`)}</Descriptions.Item>
          <Descriptions.Item label={t('payment.iban_value')}>{payment.iban_value}</Descriptions.Item>
          <Descriptions.Item label={t('payment.bank_name')}>{payment.bank_name || '—'}</Descriptions.Item>
          <Descriptions.Item label={t('payment.amount')}>{formatAmount(payment.amount)}</Descriptions.Item>
          <Descriptions.Item label={t('payment.reference')}>{payment.reference_number || '—'}</Descriptions.Item>
          <Descriptions.Item label={t('payment.national_id')}>{payment.national_id || '—'}</Descriptions.Item>
          <Descriptions.Item label={t('payment.phone')}>{payment.phone || '—'}</Descriptions.Item>
          <Descriptions.Item label={t('payment.status')}>
            <Tag color={statusTagColors[payment.status]}>{t(`payment.statuses.${payment.status}`)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('payment.confirmed')}>
            {payment.is_confirmed ? <Tag color="green">✓ {dayjs(payment.confirmed_at).format('YYYY-MM-DD HH:mm')}</Tag> : '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('payment.created_by')}>{payment.creator_name}</Descriptions.Item>
          <Descriptions.Item label={t('payment.date')}>{dayjs(payment.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
        </Descriptions>
      ),
    },
    receiptTab,
    {
      key: 'notes',
      label: t('note.title'),
      children: <NotesList paymentId={id!} />,
    },
    {
      key: 'sub_payments',
      label: `${t('payment.sub_payments')} (${payment.sub_payments?.length || 0})`,
      children: (
        <Space direction="vertical" style={{ width: '100%' }}>
          {payment.sub_payments?.map((sub) => (
            <Card key={sub.id} size="small" hoverable onClick={() => navigate(`/payments/${sub.id}`)}>
              <Space>
                <span>{sub.name}</span>
                <Tag color={statusTagColors[sub.status]}>{t(`payment.statuses.${sub.status}`)}</Tag>
                <span>{formatAmount(sub.amount)}</span>
              </Space>
            </Card>
          ))}
          {showSubForm ? (
            <SubPaymentForm onSubmit={handleCreateSubPayment} onCancel={() => setShowSubForm(false)} />
          ) : (
            <Button icon={<PlusOutlined />} onClick={() => setShowSubForm(true)}>
              {t('payment.add_sub_payment')}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ borderRadius: 8 }}>
          {t('common.back')}
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>{payment.name}</Typography.Title>
        {!hasReceipt && (
          <Tag color="warning" icon={<WarningOutlined />}>No Receipt</Tag>
        )}
        <Button
          icon={<EditOutlined />}
          onClick={() => {
            editForm.setFieldsValue({
              name: payment.name,
              iban_type: payment.iban_type,
              iban_value: payment.iban_value,
              amount: payment.amount,
              bank_name: payment.bank_name,
              national_id: payment.national_id,
              phone: payment.phone,
            });
            setEditModalOpen(true);
          }}
          style={{ borderRadius: 8 }}
        >
          {t('common.edit')}
        </Button>
        <Popconfirm
          title={t('payment.delete_confirm')}
          onConfirm={async () => {
            try {
              await deletePayment(id!);
              message.success(t('common.success'));
              navigate(-1);
            } catch {
              message.error(t('common.error'));
            }
          }}
          okButtonProps={{ danger: true }}
        >
          <Button danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }}>
            {t('common.delete')}
          </Button>
        </Popconfirm>
      </Space>

      {canManage && (
        <>
          <Space wrap>
            {payment.status !== 'paid' && (
              <Upload
                showUploadList={false}
                beforeUpload={(file) => { handleReceiptUpload(file); return false; }}
                accept="image/*"
              >
                <Button type="primary" icon={<UploadOutlined />} style={{ borderRadius: 10 }}>
                  {t('payment.mark_paid')}
                </Button>
              </Upload>
            )}
            {payment.status !== 'problematic' && (
              <Button danger onClick={() => handleStatusChange('problematic')} style={{ borderRadius: 10 }}>
                {t('payment.mark_problematic')}
              </Button>
            )}
            {!payment.is_confirmed && (
              <Popconfirm title={t('payment.confirm') + '?'} onConfirm={handleConfirm}>
                <Button icon={<CheckCircleOutlined />} style={{ background: '#10b981', color: '#fff', borderRadius: 10, border: 'none' }}>
                  {t('payment.confirm')}
                </Button>
              </Popconfirm>
            )}
          </Space>
          <Divider style={{ margin: '8px 0' }} />
        </>
      )}

      {/* Pay button — demo receipt generator */}
      <PaymentReceipt payment={payment} onComplete={fetchPayment} />

      <Tabs items={tabItems} defaultActiveKey="details" />

      {/* Edit Modal */}
      <Modal
        title={t('common.edit')}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={() => editForm.submit()}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={async (values) => {
            try {
              await updatePayment(id!, values);
              message.success(t('common.success'));
              setEditModalOpen(false);
              fetchPayment();
            } catch {
              message.error(t('common.error'));
            }
          }}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="name" label={t('payment.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="iban_type" label={t('payment.iban_type')} rules={[{ required: true }]}>
            <Select>
              <Select.Option value="sheba">{t('payment.iban_types.sheba')}</Select.Option>
              <Select.Option value="card">{t('payment.iban_types.card')}</Select.Option>
              <Select.Option value="account">{t('payment.iban_types.account')}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="iban_value" label={t('payment.iban_value')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="amount" label={t('payment.amount')} rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v?.replace(/,/g, '') as never} />
          </Form.Item>
          <Form.Item name="bank_name" label={t('payment.bank_name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="national_id" label={t('payment.national_id')}>
            <Input maxLength={10} />
          </Form.Item>
          <Form.Item name="phone" label={t('payment.phone')}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
