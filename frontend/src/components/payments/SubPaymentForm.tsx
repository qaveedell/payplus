import { useState } from 'react';
import { Form, Input, InputNumber, Select, Button, Space, Upload, Alert, message } from 'antd';
import { UploadOutlined, PaperClipOutlined, CheckCircleFilled } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { uploadReceipt } from '../../api';

interface Props {
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
}

export default function SubPaymentForm({ onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptName, setReceiptName] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

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
    return false;
  };

  const handleFinish = (values: Record<string, unknown>) => {
    if (!receiptUrl) {
      message.error(t('payment.receipt_required'));
      return;
    }
    onSubmit({ ...values, receipt_url: receiptUrl });
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      style={{ maxWidth: 500, padding: 16, border: '1px solid #e5e7eb', borderRadius: 12, background: '#fafafa' }}
    >
      <Form.Item name="name" label={t('payment.name')} rules={[{ required: true }]}>
        <Input />
      </Form.Item>

      <Form.Item name="iban_type" label={t('payment.iban_type')} rules={[{ required: true }]} initialValue="sheba">
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

      {/* Tracking code — کد رهگیری */}
      <Form.Item
        name="reference_number"
        label={t('payment.tracking_code')}
        rules={[{ required: true, message: t('payment.tracking_code_required') }]}
      >
        <Input placeholder={t('payment.tracking_code_placeholder')} />
      </Form.Item>

      {/* Receipt upload — required */}
      <Form.Item label={t('payment.receipt')} required>
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
              {uploadingReceipt ? t('common.loading') : t('payment.upload_receipt_required')}
            </Button>
          </Upload>
        )}
        {!receiptUrl && (
          <div style={{ marginTop: 4, color: '#ef4444', fontSize: 12 }}>
            <PaperClipOutlined /> {t('payment.receipt_required_hint')}
          </div>
        )}
      </Form.Item>

      <Form.Item>
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            disabled={!receiptUrl}
            style={{ borderRadius: 10 }}
          >
            {t('common.save')}
          </Button>
          <Button onClick={onCancel} style={{ borderRadius: 10 }}>{t('common.cancel')}</Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
