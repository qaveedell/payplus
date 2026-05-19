import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Typography, DatePicker, Select, Space, Tabs, Button } from 'antd';
import { BarChartOutlined, CheckCircleFilled, CloseCircleFilled, WarningFilled, DollarOutlined, FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ReportSummary, ContactReport, TimelinePoint } from '../types';
import { getReportSummary, getReportByContact, getReportTimeline } from '../api';

const statCardStyle = (gradient: string, shadowColor: string) => ({
  borderRadius: 14,
  border: 'none',
  background: gradient,
  boxShadow: `0 4px 14px ${shadowColor}`,
});

function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(',')),
  ].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportToPDF(title: string, data: Record<string, unknown>[], columns: string[]) {
  const html = `
    <html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      body { font-family: Vazirmatn, sans-serif; direction: rtl; padding: 20px; }
      h1 { color: #6366f1; font-size: 24px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th { background: #6366f1; color: white; padding: 10px 12px; text-align: right; font-size: 13px; }
      td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
      tr:nth-child(even) { background: #f9fafb; }
      .footer { margin-top: 20px; font-size: 11px; color: #9ca3af; text-align: center; }
    </style></head><body>
    <h1>${title}</h1>
    <p style="color:#6b7280;font-size:13px;">${new Date().toLocaleString()}</p>
    <table><thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${data.map(row => `<tr>${columns.map(c => `<td>${row[c] ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <div class="footer">PAY.IR / PayPlus Report</div>
    </body></html>`;
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  }
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [contactReport, setContactReport] = useState<ContactReport[]>([]);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();
  const [granularity, setGranularity] = useState('day');

  const fetchData = async () => {
    const [s, c, tl] = await Promise.all([
      getReportSummary(dateFrom, dateTo),
      getReportByContact(dateFrom, dateTo),
      getReportTimeline(dateFrom, dateTo, granularity),
    ]);
    setSummary(s.data);
    setContactReport(c.data);
    setTimeline(tl.data);
  };

  useEffect(() => { fetchData(); }, [dateFrom, dateTo, granularity]);

  const formatAmount = (amount: number) => new Intl.NumberFormat('en-US').format(amount);

  const contactColumns = [
    {
      title: t('report.contact_name'), dataIndex: 'contact_name', key: 'contact_name',
      sorter: (a: ContactReport, b: ContactReport) => a.contact_name.localeCompare(b.contact_name),
      render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span>,
    },
    {
      title: t('report.total_amount'), dataIndex: 'total_amount', key: 'total_amount',
      sorter: (a: ContactReport, b: ContactReport) => a.total_amount - b.total_amount,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{formatAmount(v)}</span>,
    },
    {
      title: t('report.paid_amount'), dataIndex: 'paid_amount', key: 'paid_amount',
      sorter: (a: ContactReport, b: ContactReport) => a.paid_amount - b.paid_amount,
      render: (v: number) => <span style={{ color: '#059669', fontWeight: 600 }}>{formatAmount(v)}</span>,
    },
    {
      title: t('report.count'), dataIndex: 'count', key: 'count',
      sorter: (a: ContactReport, b: ContactReport) => a.count - b.count,
    },
  ];

  const timelineColumns = [
    {
      title: t('payment.date'), dataIndex: 'period', key: 'period',
      sorter: (a: TimelinePoint, b: TimelinePoint) => a.period.localeCompare(b.period),
      render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      title: t('report.total_amount'), dataIndex: 'total_amount', key: 'total_amount',
      sorter: (a: TimelinePoint, b: TimelinePoint) => a.total_amount - b.total_amount,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{formatAmount(v)}</span>,
    },
    {
      title: t('report.paid_amount'), dataIndex: 'paid_amount', key: 'paid_amount',
      sorter: (a: TimelinePoint, b: TimelinePoint) => a.paid_amount - b.paid_amount,
      render: (v: number) => <span style={{ color: '#059669', fontWeight: 600 }}>{formatAmount(v)}</span>,
    },
    {
      title: t('report.count'), dataIndex: 'count', key: 'count',
      sorter: (a: TimelinePoint, b: TimelinePoint) => a.count - b.count,
    },
  ];

  const tabItems = [
    {
      key: 'summary',
      label: t('report.summary'),
      children: summary && (
        <Row gutter={[20, 20]}>
          <Col xs={12} sm={6}>
            <Card style={statCardStyle('linear-gradient(135deg, #6366f1, #818cf8)', 'rgba(99,102,241,0.2)')}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{t('report.total_payments')}</span>}
                value={summary.total_payments}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#fff', fontWeight: 800, fontSize: 28 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={statCardStyle('linear-gradient(135deg, #8b5cf6, #a78bfa)', 'rgba(139,92,246,0.2)')}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{t('report.total_amount')}</span>}
                value={formatAmount(summary.total_amount)}
                suffix={<span style={{ fontSize: 12, opacity: 0.7 }}>{t('payment.rials')}</span>}
                valueStyle={{ color: '#fff', fontWeight: 800, fontSize: 22 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={statCardStyle('linear-gradient(135deg, #10b981, #34d399)', 'rgba(16,185,129,0.2)')}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{t('report.paid_amount')}</span>}
                value={formatAmount(summary.paid_amount)}
                prefix={<CheckCircleFilled />}
                valueStyle={{ color: '#fff', fontWeight: 800, fontSize: 22 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={statCardStyle('linear-gradient(135deg, #ef4444, #f87171)', 'rgba(239,68,68,0.2)')}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{t('report.unpaid_amount')}</span>}
                value={formatAmount(summary.unpaid_amount)}
                prefix={<CloseCircleFilled />}
                valueStyle={{ color: '#fff', fontWeight: 800, fontSize: 22 }}
              />
            </Card>
          </Col>
          <Col xs={8}>
            <Card style={{ borderRadius: 14 }}>
              <Statistic title={<span style={{ fontSize: 13, color: '#6b7280' }}>{t('report.paid_count')}</span>} value={summary.paid_count} valueStyle={{ color: '#059669', fontWeight: 700 }} />
            </Card>
          </Col>
          <Col xs={8}>
            <Card style={{ borderRadius: 14 }}>
              <Statistic title={<span style={{ fontSize: 13, color: '#6b7280' }}>{t('report.unpaid_count')}</span>} value={summary.unpaid_count} valueStyle={{ fontWeight: 700 }} />
            </Card>
          </Col>
          <Col xs={8}>
            <Card style={{ borderRadius: 14 }}>
              <Statistic title={<span style={{ fontSize: 13, color: '#6b7280' }}>{t('report.problematic_count')}</span>} value={summary.problematic_count} prefix={<WarningFilled style={{ color: '#ef4444' }} />} valueStyle={{ color: '#ef4444', fontWeight: 700 }} />
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'by_contact',
      label: t('report.by_contact'),
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Row justify="end">
            <Space>
              <Button icon={<FileExcelOutlined />} onClick={() => exportToCSV(contactReport as unknown as Record<string, unknown>[], 'report-by-contact')} size="small" style={{ borderRadius: 8 }}>
                Excel/CSV
              </Button>
              <Button icon={<FilePdfOutlined />} onClick={() => exportToPDF(t('report.by_contact'), contactReport as unknown as Record<string, unknown>[], ['contact_name', 'total_amount', 'paid_amount', 'count'])} size="small" style={{ borderRadius: 8 }}>
                PDF
              </Button>
            </Space>
          </Row>
          <Table dataSource={contactReport} columns={contactColumns} rowKey="contact_name" pagination={false} style={{ borderRadius: 12 }} />
        </Space>
      ),
    },
    {
      key: 'timeline',
      label: t('report.timeline'),
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Row justify="space-between">
            <Select value={granularity} onChange={setGranularity} style={{ width: 150, borderRadius: 8 }}>
              <Select.Option value="day">{t('report.day')}</Select.Option>
              <Select.Option value="week">{t('report.week')}</Select.Option>
              <Select.Option value="month">{t('report.month')}</Select.Option>
            </Select>
            <Space>
              <Button icon={<FileExcelOutlined />} onClick={() => exportToCSV(timeline as unknown as Record<string, unknown>[], 'report-timeline')} size="small" style={{ borderRadius: 8 }}>
                Excel/CSV
              </Button>
              <Button icon={<FilePdfOutlined />} onClick={() => exportToPDF(t('report.timeline'), timeline as unknown as Record<string, unknown>[], ['period', 'total_amount', 'paid_amount', 'count'])} size="small" style={{ borderRadius: 8 }}>
                PDF
              </Button>
            </Space>
          </Row>
          <Table dataSource={timeline} columns={timelineColumns} rowKey="period" pagination={false} style={{ borderRadius: 12 }} />
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
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BarChartOutlined style={{ color: '#fff', fontSize: 18 }} />
            </div>
            <div>
              <Typography.Title level={4} style={{ margin: 0, fontWeight: 700 }}>{t('report.title')}</Typography.Title>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>Analytics & summaries</Typography.Text>
            </div>
          </Space>
        </Col>
        <Col>
          <DatePicker.RangePicker
            style={{ borderRadius: 8 }}
            onChange={(dates) => {
              setDateFrom(dates?.[0]?.toISOString());
              setDateTo(dates?.[1]?.toISOString());
            }}
          />
        </Col>
      </Row>
      <Tabs items={tabItems} defaultActiveKey="summary" />
    </>
  );
}
