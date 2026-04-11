import { Typography, Space } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PaymentTable from '../components/payments/PaymentTable';

export default function ReceivedPage() {
  const { t } = useTranslation();
  return (
    <>
      <Space align="center" style={{ marginBottom: 24 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <DownloadOutlined style={{ color: '#fff', fontSize: 18 }} />
        </div>
        <div>
          <Typography.Title level={4} style={{ margin: 0, fontWeight: 700 }}>
            {t('nav.received')}
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Payments made to Reza
          </Typography.Text>
        </div>
      </Space>
      <PaymentTable type="received" />
    </>
  );
}
