import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, Button, message, Modal, List, Space, Upload, Row, Col, Alert } from 'antd';
import { SearchOutlined, UploadOutlined, PaperClipOutlined, CheckCircleFilled } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPayment, getContacts, checkIBAN, uploadReceipt } from '../../api';
import type { Contact } from '../../types';

export default function PaymentForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [ibanType, setIbanType] = useState('sheba');
  const [ibanValue, setIbanValue] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [checkingSheba, setCheckingSheba] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptName, setReceiptName] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const paymentType = searchParams.get('type') || 'request';

  useEffect(() => {
    getContacts().then((res) => setContacts(res.data)).catch(() => {});
  }, []);

  const onIbanTypeChange = (value: string) => {
    setIbanType(value);
    setIbanValue('');
    form.setFieldsValue({ iban_value: '' });
    if (value === 'contact') {
      setContactModalOpen(true);
    }
  };

  const selectContact = (contact: Contact) => {
    const val = contact.sheba || contact.card_number || contact.account_number || '';
    const type = contact.sheba ? 'sheba' : contact.card_number ? 'card' : 'account';
    setIbanType(type);
    setIbanValue(val);
    form.setFieldsValue({
      iban_value: val,
      name: contact.name,
      national_id: contact.national_id,
      phone: contact.phone,
      contact_id: contact.id,
    });
    setContactModalOpen(false);
  };

  const handleCheckSheba = async () => {
    const sheba = ibanValue;
    if (!sheba) return;
    setCheckingSheba(true);
    try {
      const res = await checkIBAN(sheba);
      if (res.data.valid) {
        form.setFieldsValue({ name: res.data.name });
        message.success(`${res.data.bank_name} — ${res.data.name}`);
      }
    } catch {
      message.error(t('common.error'));
    } finally {
      setCheckingSheba(false);
    }
  };

  const handleReceiptUpload = async (file: File) => {
    setUploadingReceipt(true);
    try {
      const res = await uploadReceipt(file);
      setReceiptUrl(res.data.url);
      setReceiptName(file.name);
      message.success(t('payment.receipt_uploaded'));
    } catch {
      message.error(t('common.error'));
    } finally {
      setUploadingReceipt(false);
    }
    return false; // prevent default upload
  };

  // Receipt + tracking code are required for "received" (proof of payment), optional for "request"
  const requiresProof = paymentType === 'received';

  const onFinish = async (values: Record<string, unknown>) => {
    if (requiresProof && !receiptUrl) {
      message.error(t('payment.receipt_required'));
      return;
    }
    setLoading(true);
    try {
      await createPayment({
        ...values,
        iban_value: ibanValue,
        type: paymentType,
        iban_type: ibanType,
        ...(receiptUrl ? { receipt_url: receiptUrl } : {}),
      } as never);
      message.success(t('common.success'));
      navigate(paymentType === 'request' ? '/requests' : '/received');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || t('common.error');
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const ibanPlaceholder: Record<string, string> = {
    sheba: 'IR...',
    card: '6219...',
    account: '...',
    contact: t('payment.select_contact'),
  };

  return (
    <>
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 620 }}>
        <Form.Item name="name" label={t('payment.name')} rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item label={t('payment.iban_type')}>
          <Select value={ibanType} onChange={onIbanTypeChange}>
            <Select.Option value="sheba">{t('payment.iban_types.sheba')}</Select.Option>
            <Select.Option value="card">{t('payment.iban_types.card')}</Select.Option>
            <Select.Option value="account">{t('payment.iban_types.account')}</Select.Option>
            <Select.Option value="contact">{t('payment.iban_types.contact')}</Select.Option>
          </Select>
        </Form.Item>

        {/* IBAN value + optional SHEBA check button */}
        <Form.Item
          name="iban_value"
          label={t('payment.iban_value')}
          rules={[{ required: true }]}
        >
          <Row gutter={8} align="middle" wrap={false}>
            <Col flex="auto">
              <Input
                value={ibanValue}
                placeholder={ibanPlaceholder[ibanType]}
                readOnly={ibanType === 'contact'}
                onClick={() => ibanType === 'contact' && setContactModalOpen(true)}
                onChange={(e) => {
                  setIbanValue(e.target.value);
                  form.setFieldsValue({ iban_value: e.target.value });
                }}
              />
            </Col>
            {ibanType === 'sheba' && (
              <Col>
                <Button icon={<SearchOutlined />} loading={checkingSheba} onClick={handleCheckSheba}>
                  {t('payment.check_sheba')}
                </Button>
              </Col>
            )}
            {ibanType === 'contact' && (
              <Col>
                <Button onClick={() => setContactModalOpen(true)}>
                  {t('payment.select_contact')}
                </Button>
              </Col>
            )}
          </Row>
        </Form.Item>

        <Form.Item name="amount" label={t('payment.amount')} rules={[{ required: true }]}>
          <InputNumber
            style={{ width: '100%' }}
            min={1}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(v) => v?.replace(/,/g, '') as never}
          />
        </Form.Item>

        <Form.Item name="bank_name" label={t('payment.bank_name')} rules={[{ required: true, message: t('payment.bank_name_required') }]}>
          <Input placeholder={t('payment.bank_name_placeholder')} />
        </Form.Item>

        {/* Tracking code — کد رهگیری (required only for received payments) */}
        <Form.Item
          name="reference_number"
          label={t('payment.tracking_code')}
          rules={[{ required: requiresProof, message: t('payment.tracking_code_required') }]}
        >
          <Input placeholder={t('payment.tracking_code_placeholder')} />
        </Form.Item>

        {/* Receipt upload — required for received, optional for request */}
        <Form.Item label={t('payment.receipt')} required={requiresProof}>
          {receiptUrl ? (
            <Alert
              type="success"
              icon={<CheckCircleFilled />}
              message={
                <Space>
                  <span>{t('payment.receipt_uploaded')}</span>
                  <span style={{ color: '#6b7280', fontSize: 12 }}>{receiptName}</span>
                  <Button
                    size="small"
                    type="link"
                    danger
                    onClick={() => { setReceiptUrl(''); setReceiptName(''); }}
                  >
                    {t('common.delete')}
                  </Button>
                </Space>
              }
              showIcon
              style={{ borderRadius: 8 }}
            />
          ) : (
            <Upload
              showUploadList={false}
              beforeUpload={handleReceiptUpload}
              accept="image/*,application/pdf"
              disabled={uploadingReceipt}
            >
              <Button
                icon={<UploadOutlined />}
                loading={uploadingReceipt}
                style={{ borderRadius: 8, height: 44, width: '100%', borderStyle: 'dashed', borderColor: '#6366f1' }}
                type="dashed"
              >
                {uploadingReceipt ? t('common.loading') : (requiresProof ? t('payment.upload_receipt_required') : t('payment.upload_receipt'))}
              </Button>
            </Upload>
          )}
          {requiresProof && !receiptUrl && (
            <div style={{ marginTop: 4, color: '#ef4444', fontSize: 12 }}>
              <PaperClipOutlined /> {t('payment.receipt_required_hint')}
            </div>
          )}
        </Form.Item>

        <Form.Item name="national_id" label={t('payment.national_id')}>
          <Input maxLength={10} />
        </Form.Item>

        <Form.Item name="phone" label={t('payment.phone')}>
          <Input />
        </Form.Item>

        <Form.Item name="contact_id" hidden>
          <Input />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              disabled={requiresProof && !receiptUrl}
              style={{ borderRadius: 10, height: 42, paddingInline: 24, fontWeight: 600 }}
            >
              {t('common.save')}
            </Button>
            <Button onClick={() => navigate(-1)} style={{ borderRadius: 10, height: 42 }}>
              {t('common.cancel')}
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <Modal
        title={t('payment.select_contact')}
        open={contactModalOpen}
        onCancel={() => setContactModalOpen(false)}
        footer={null}
      >
        <List
          dataSource={contacts}
          renderItem={(contact) => (
            <List.Item
              actions={[
                <Button type="primary" size="small" onClick={() => selectContact(contact)}>
                  {t('contact.select')}
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={contact.name}
                description={contact.sheba || contact.card_number || contact.account_number || contact.phone}
              />
            </List.Item>
          )}
        />
      </Modal>
    </>
  );
}
