import { useEffect, useState, useRef } from 'react';
import { Table, Tag, Space, Button, Input, Select, DatePicker, Row, Col, Tooltip, Avatar } from 'antd';
import { EyeOutlined, PlusOutlined, FilterOutlined, ClearOutlined, CheckCircleFilled, CloseCircleFilled, UserOutlined, SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Payment, PaymentFilter } from '../../types';
import { getPayments } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const statusConfig: Record<string, { color: string; bg: string; border: string }> = {
  unpaid: { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
  paid: { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  unknown: { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  problematic: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

const rowBg: Record<string, string> = {
  unpaid: '#ffffff',
  paid: '#f0fdf4',
  unknown: '#fefce8',
  problematic: '#fef2f2',
};

interface Props {
  type: 'received' | 'request';
}

export default function PaymentTable({ type }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<PaymentFilter>({ type, page: 1, page_size: 20 });
  const [showFilter, setShowFilter] = useState(false);
  const [searchText, setSearchText] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await getPayments({ ...filter, type });
      setPayments(res.data.payments);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, [filter, type]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchText(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setFilter((f) => ({ ...f, search: value || undefined, page: 1 }));
    }, 400);
  };

  const handleStatusSortChange = (value: string | undefined) => {
    setFilter((f) => ({ ...f, sort_by: value || undefined, page: 1 }));
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US').format(amount);
  };

  // Requester can create both request AND received (they request money AND prove they paid)
  // Payer can create received payments
  // Admin manages, doesn't create
  const canAdd =
    (type === 'request' && user?.role === 'requester') ||
    (type === 'received' && (user?.role === 'requester' || user?.role === 'payer'));

  const columns = [
    {
      title: t('payment.name'),
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (name: string, record: Payment) => (
        <Space>
          <Avatar size={32} icon={<UserOutlined />} style={{
            background: record.status === 'paid'
              ? 'linear-gradient(135deg, #10b981, #34d399)'
              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            fontSize: 14,
          }} />
          <div>
            <div style={{ fontWeight: 600, color: '#111827' }}>{name}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>{t(`payment.iban_types.${record.iban_type}`)}</div>
          </div>
        </Space>
      ),
    },
    {
      title: t('payment.amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span style={{ fontWeight: 700, fontSize: 14, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
          {formatAmount(amount)} <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>{t('payment.rials')}</span>
        </span>
      ),
      sorter: (a: Payment, b: Payment) => a.amount - b.amount,
    },
    {
      title: t('payment.reference'),
      dataIndex: 'reference_number',
      key: 'reference_number',
      ellipsis: true,
      render: (v: string | null) => v ? (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#374151', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{v}</span>
      ) : <span style={{ color: '#d1d5db' }}>—</span>,
    },
    {
      title: t('payment.status'),
      dataIndex: 'status',
      key: 'status',
      sorter: (a: Payment, b: Payment) => a.status.localeCompare(b.status),
      render: (status: string) => {
        const cfg = statusConfig[status];
        return (
          <Tag style={{
            color: cfg.color,
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            fontWeight: 600,
            fontSize: 12,
          }}>
            {t(`payment.statuses.${status}`)}
          </Tag>
        );
      },
    },
    {
      title: '✓',
      dataIndex: 'is_confirmed',
      key: 'is_confirmed',
      width: 60,
      align: 'center' as const,
      render: (v: boolean) => v
        ? <CheckCircleFilled style={{ color: '#10b981', fontSize: 18 }} />
        : <CloseCircleFilled style={{ color: '#d1d5db', fontSize: 18 }} />,
    },
    {
      title: t('payment.date'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{dayjs(v).format('YYYY-MM-DD')}</div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>{dayjs(v).format('HH:mm')}</div>
        </div>
      ),
      sorter: (a: Payment, b: Payment) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: t('payment.created_by'),
      dataIndex: 'creator_name',
      key: 'creator_name',
      render: (name: string) => (
        <Tag style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe', fontWeight: 500 }}>
          {name}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: unknown, record: Payment) => (
        <Tooltip title={t('payment.details')}>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={(e) => { e.stopPropagation(); navigate(`/payments/${record.id}`); }}
            style={{
              borderRadius: 8,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6366f1',
            }}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {/* Top bar: search + filter toggle + add button */}
      <Row justify="space-between" align="middle" gutter={[12, 8]}>
        <Col flex="auto">
          <Input
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            placeholder={t('payment.search_placeholder')}
            value={searchText}
            onChange={(e) => handleSearchChange(e.target.value)}
            allowClear
            style={{ borderRadius: 10, maxWidth: 360 }}
          />
        </Col>
        <Col>
          <Space>
            <Button
              icon={<FilterOutlined />}
              onClick={() => setShowFilter(!showFilter)}
              style={{
                borderRadius: 8,
                fontWeight: 500,
                ...(showFilter ? { background: '#eef2ff', color: '#4338ca', borderColor: '#c7d2fe' } : {}),
              }}
            >
              {t('payment.filter')}
            </Button>
            {showFilter && (
              <Button
                icon={<ClearOutlined />}
                onClick={() => {
                  setFilter({ type, page: 1, page_size: 20 });
                  setSearchText('');
                }}
                style={{ borderRadius: 8 }}
              >
                {t('payment.clear_filter')}
              </Button>
            )}
            {canAdd && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate(`/payments/new?type=${type}`)}
                style={{ borderRadius: 10, height: 40, fontWeight: 600, paddingInline: 20 }}
              >
                {type === 'request' ? t('payment.new_request') : t('payment.new')}
              </Button>
            )}
          </Space>
        </Col>
      </Row>

      {showFilter && (
        <div style={{
          padding: 16,
          background: '#f9fafb',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
        }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Select
                style={{ width: '100%' }}
                placeholder={t('payment.status')}
                value={filter.status || undefined}
                onChange={(v) => setFilter({ ...filter, status: v, page: 1 })}
                allowClear
                options={['unpaid', 'paid', 'unknown', 'problematic'].map((s) => ({
                  value: s,
                  label: t(`payment.statuses.${s}`),
                }))}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Select
                style={{ width: '100%' }}
                placeholder={t('payment.sort_by_status')}
                value={filter.sort_by || undefined}
                onChange={handleStatusSortChange}
                allowClear
                options={[
                  { value: 'status', label: t('payment.sort_status_asc') },
                  { value: 'status_desc', label: t('payment.sort_status_desc') },
                  { value: 'amount', label: t('payment.sort_amount_asc') },
                  { value: 'amount_desc', label: t('payment.sort_amount_desc') },
                ]}
              />
            </Col>
            <Col xs={24} sm={8}>
              <DatePicker.RangePicker
                style={{ width: '100%' }}
                onChange={(dates) => {
                  setFilter({
                    ...filter,
                    date_from: dates?.[0]?.toISOString(),
                    date_to: dates?.[1]?.toISOString(),
                    page: 1,
                  });
                }}
              />
            </Col>
          </Row>
        </div>
      )}

      <Table
        dataSource={payments}
        columns={columns}
        rowKey="id"
        loading={loading}
        onRow={(record) => ({
          style: {
            background: rowBg[record.status],
            cursor: 'pointer',
            borderLeft: `3px solid ${statusConfig[record.status].color}`,
          },
          onClick: () => navigate(`/payments/${record.id}`),
        })}
        pagination={{
          current: filter.page,
          pageSize: filter.page_size,
          total,
          onChange: (page, pageSize) => setFilter({ ...filter, page, page_size: pageSize }),
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          style: { marginTop: 16 },
        }}
        scroll={{ x: 900 }}
        style={{ borderRadius: 12, overflow: 'hidden' }}
      />
    </Space>
  );
}
