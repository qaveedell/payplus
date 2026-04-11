import { useEffect, useState } from 'react';
import { List, Input, Button, Space, Typography, Avatar } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import type { Note } from '../../types';
import { getPaymentNotes, addPaymentNote } from '../../api';

interface Props {
  paymentId: string;
}

export default function NotesList({ paymentId }: Props) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchNotes = async () => {
    const res = await getPaymentNotes(paymentId);
    setNotes(res.data);
  };

  useEffect(() => { fetchNotes(); }, [paymentId]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await addPaymentNote(paymentId, content);
      setContent('');
      fetchNotes();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <List
        dataSource={notes}
        locale={{ emptyText: t('common.no_data') }}
        renderItem={(note) => (
          <List.Item>
            <List.Item.Meta
              avatar={<Avatar icon={<UserOutlined />} />}
              title={
                <Space>
                  <Typography.Text strong>{note.author_name}</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(note.created_at).format('YYYY-MM-DD HH:mm')}
                  </Typography.Text>
                </Space>
              }
              description={note.content}
            />
          </List.Item>
        )}
      />
      <Space.Compact style={{ width: '100%' }}>
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('note.placeholder')}
          onPressEnter={handleSubmit}
        />
        <Button type="primary" icon={<SendOutlined />} loading={loading} onClick={handleSubmit}>
          {t('note.submit')}
        </Button>
      </Space.Compact>
    </Space>
  );
}
