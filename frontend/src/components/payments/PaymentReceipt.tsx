import { useState, useRef } from 'react';
import { Button, Modal, Space, Typography, Spin, Progress, message } from 'antd';
import { CreditCardOutlined, CheckCircleFilled, DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { Payment } from '../../types';
import { updatePaymentStatus } from '../../api';
import dayjs from 'dayjs';

const BANK_COLORS: Record<string, { bg: string; text: string }> = {
  'ملی': { bg: '#003366', text: '#fff' },
  'melli': { bg: '#003366', text: '#fff' },
  'ملت': { bg: '#cc0033', text: '#fff' },
  'mellat': { bg: '#cc0033', text: '#fff' },
  'صادرات': { bg: '#006633', text: '#fff' },
  'saderat': { bg: '#006633', text: '#fff' },
  'تجارت': { bg: '#003399', text: '#fff' },
  'tejarat': { bg: '#003399', text: '#fff' },
  'سپه': { bg: '#0066cc', text: '#fff' },
  'sepah': { bg: '#0066cc', text: '#fff' },
  'پاسارگاد': { bg: '#996600', text: '#fff' },
  'pasargad': { bg: '#996600', text: '#fff' },
  'پارسیان': { bg: '#cc3300', text: '#fff' },
  'parsian': { bg: '#cc3300', text: '#fff' },
  'سامان': { bg: '#0099cc', text: '#fff' },
  'saman': { bg: '#0099cc', text: '#fff' },
  'اقتصاد نوین': { bg: '#660099', text: '#fff' },
  'eghtesad novin': { bg: '#660099', text: '#fff' },
  'شهر': { bg: '#339966', text: '#fff' },
  'shahr': { bg: '#339966', text: '#fff' },
};

function getBankStyle(bankName?: string | null) {
  if (!bankName) return { bg: '#6366f1', text: '#fff' };
  const lower = bankName.toLowerCase().trim();
  for (const [key, val] of Object.entries(BANK_COLORS)) {
    if (lower.includes(key)) return val;
  }
  return { bg: '#6366f1', text: '#fff' };
}

function generateTrackingCode() {
  const chars = '0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

interface ReceiptData {
  date: string;
  time: string;
  trackingCode: string;
  amount: number;
  receiverName: string;
  receiverAccount: string;
  bankName: string;
}

interface Props {
  payment: Payment;
  onComplete: () => void;
}

export default function PaymentReceipt({ payment, onComplete }: Props) {
  const { t } = useTranslation();
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePay = () => {
    setProcessing(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 4;
      });
    }, 200);

    setTimeout(async () => {
      clearInterval(interval);
      setProgress(100);

      const now = dayjs();
      const trackingCode = generateTrackingCode();
      const data: ReceiptData = {
        date: now.format('YYYY/MM/DD'),
        time: now.format('HH:mm'),
        trackingCode,
        amount: payment.amount,
        receiverName: payment.name,
        receiverAccount: payment.iban_value,
        bankName: payment.bank_name || 'Unknown Bank',
      };

      try {
        await updatePaymentStatus(payment.id, 'paid', undefined);
      } catch {
        // best effort
      }

      setReceiptData(data);
      setProcessing(false);
      setShowReceipt(true);
      message.success(t('payment.payment_successful'));

      setTimeout(() => onComplete(), 500);
    }, 5000);
  };

  const showExistingReceipt = () => {
    const data: ReceiptData = {
      date: dayjs(payment.updated_at || payment.created_at).format('YYYY/MM/DD'),
      time: dayjs(payment.updated_at || payment.created_at).format('HH:mm'),
      trackingCode: payment.reference_number || '—',
      amount: payment.amount,
      receiverName: payment.name,
      receiverAccount: payment.iban_value,
      bankName: payment.bank_name || 'Unknown Bank',
    };
    setReceiptData(data);
    setShowReceipt(true);
  };

  const handleDownload = () => {
    if (!receiptRef.current) return;
    const html = receiptRef.current.outerHTML;
    const fullHtml = `<html><head><meta charset="utf-8"><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Vazirmatn, Tahoma, sans-serif; direction: rtl; display: flex; justify-content: center; padding: 40px; background: #f3f4f6; }
    </style></head><body>${html}</body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(fullHtml);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  };

  const bankStyle = getBankStyle(receiptData?.bankName || payment.bank_name);
  const formatAmount = (n: number) => new Intl.NumberFormat('en-US').format(n);

  return (
    <>
      {/* Pay Now button for unpaid payments */}
      {payment.status === 'unpaid' && (
        <Button
          type="primary"
          size="large"
          icon={<CreditCardOutlined />}
          loading={processing}
          onClick={handlePay}
          style={{
            borderRadius: 12,
            height: 48,
            paddingInline: 32,
            fontWeight: 700,
            fontSize: 16,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            border: 'none',
          }}
        >
          {processing ? t('payment.processing') : t('payment.pay_now')}
        </Button>
      )}

      {/* View Receipt button for paid payments */}
      {payment.status === 'paid' && (
        <Button
          icon={<FileTextOutlined />}
          onClick={showExistingReceipt}
          style={{ borderRadius: 10, fontWeight: 600 }}
        >
          {t('payment.view_receipt')}
        </Button>
      )}

      {/* Processing modal */}
      {processing && (
        <Modal open closable={false} footer={null} centered width={360}>
          <div style={{ textAlign: 'center', padding: '30px 20px' }}>
            <Spin size="large" />
            <Typography.Title level={4} style={{ marginTop: 20, color: '#6366f1' }}>
              {t('payment.connecting_bank')}
            </Typography.Title>
            <Progress
              percent={progress}
              strokeColor={{ from: '#6366f1', to: '#10b981' }}
              style={{ marginTop: 16 }}
              showInfo={false}
            />
            <Typography.Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
              {progress < 30 ? t('payment.verifying_account') :
               progress < 60 ? t('payment.processing_payment') :
               progress < 90 ? t('payment.confirming') :
               t('payment.finalizing')}
            </Typography.Text>
          </div>
        </Modal>
      )}

      {/* Receipt modal */}
      <Modal
        open={showReceipt}
        onCancel={() => setShowReceipt(false)}
        footer={
          <Space>
            <Button icon={<DownloadOutlined />} type="primary" onClick={handleDownload} style={{ borderRadius: 8 }}>
              {t('payment.download_receipt')}
            </Button>
            <Button onClick={() => setShowReceipt(false)} style={{ borderRadius: 8 }}>
              {t('common.cancel')}
            </Button>
          </Space>
        }
        width={420}
        centered
      >
        {receiptData && (
          <div ref={receiptRef} style={{
            background: '#fff',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid #e5e7eb',
            maxWidth: 380,
            margin: '0 auto',
          }}>
            <div style={{
              background: bankStyle.bg,
              color: bankStyle.text,
              padding: '20px 24px',
              textAlign: 'center',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: 'rgba(255,255,255,0.15)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12,
                fontSize: 24, fontWeight: 800,
              }}>
                {receiptData.bankName.charAt(0).toUpperCase()}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{receiptData.bankName}</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{t('payment.payment_receipt')}</div>
            </div>

            <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
              <CheckCircleFilled style={{ fontSize: 40, color: '#10b981' }} />
              <div style={{ color: '#10b981', fontWeight: 700, fontSize: 16, marginTop: 8 }}>
                {t('payment.payment_successful')}
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '8px 24px 16px' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                {formatAmount(receiptData.amount)}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>{t('payment.rials')}</div>
            </div>

            <div style={{ padding: '0 24px 20px' }}>
              {[
                [t('payment.date'), receiptData.date],
                [t('payment.time'), receiptData.time],
                [t('payment.tracking_code'), receiptData.trackingCode],
                [t('payment.name'), receiptData.receiverName],
                [t('payment.iban_value'), receiptData.receiverAccount],
                [t('payment.bank_name'), receiptData.bankName],
              ].map(([label, value], i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: i < 5 ? '1px solid #f3f4f6' : 'none',
                }}>
                  <span style={{ color: '#6b7280', fontSize: 13 }}>{label}</span>
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#111827', fontFamily: 'monospace', direction: 'ltr' }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{
              background: '#f9fafb', padding: '12px 24px',
              textAlign: 'center', fontSize: 11, color: '#9ca3af',
              borderTop: '1px solid #e5e7eb',
            }}>
              PAY.IR / PayPlus — {t('payment.demo_receipt')}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
