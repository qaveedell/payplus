import { Typography, Space } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PaymentTable from '../components/payments/PaymentTable';

export default function RequestsPage() {
  const { t } = useTranslation();
  return (
    <>
      <Space align="center" style={{ marginBottom: 24 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'linear-gradient(135deg, #f59e0b, #f97316)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <UploadOutlined style={{ color: '#fff', fontSize: 18 }} />
        </div>
        <div>
          <Typography.Title level={4} style={{ margin: 0, fontWeight: 700 }}>
            {t('nav.requests')}
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Payments asked from Reza
          </Typography.Text>
        </div>
      </Space>
      <PaymentTable type="request" />
    </>
  );
}
