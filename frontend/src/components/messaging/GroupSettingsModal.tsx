import { useState, useEffect } from 'react';
import { Modal, Input, Select, Form, message } from 'antd';
import { useTranslation } from 'react-i18next';
import type { User, Conversation } from '../../types';
import { getMessageableUsers, updateGroup } from '../../api';

interface Props {
  open: boolean;
  conversation: Conversation | null;
  onUpdated: () => void;
  onCancel: () => void;
}

export default function GroupSettingsModal({ open, conversation, onUpdated, onCancel }: Props) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (open && conversation) {
      setLoading(true);
      form.setFieldsValue({
        name: conversation.name,
        member_ids: conversation.members.map((m) => m.user_id),
      });
      getMessageableUsers()
        .then((res) => setUsers(res.data))
        .finally(() => setLoading(false));
    }
  }, [open, conversation]);

  const handleUpdate = async (values: { name: string; member_ids: string[] }) => {
    if (!conversation) return;
    setUpdating(true);
    try {
      await updateGroup(conversation.id, { name: values.name, member_ids: values.member_ids });
      message.success(t('common.success'));
      onUpdated();
    } catch {
      message.error(t('common.error'));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Modal
      title={t('messaging.group_settings')}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={updating}
      okText={t('messaging.update_group')}
      cancelText={t('common.cancel')}
    >
      <Form form={form} layout="vertical" onFinish={handleUpdate} style={{ marginTop: 16 }}>
        <Form.Item name="name" label={t('messaging.group_name')} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="member_ids" label={t('messaging.select_members')} rules={[{ required: true }]}>
          <Select
            mode="multiple"
            loading={loading}
            optionFilterProp="label"
            options={users.map((u) => ({
              value: u.id,
              label: `${u.display_name} (@${u.username})`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
