import { useState, useEffect } from 'react';
import { Modal, Input, Select, Form, message } from 'antd';
import { useTranslation } from 'react-i18next';
import type { User } from '../../types';
import { getMessageableUsers, createGroup } from '../../api';
import type { Conversation } from '../../types';

interface Props {
  open: boolean;
  onCreated: (conv: Conversation) => void;
  onCancel: () => void;
}

export default function NewGroupModal({ open, onCreated, onCancel }: Props) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      form.resetFields();
      getMessageableUsers()
        .then((res) => setUsers(res.data))
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleCreate = async (values: { name: string; member_ids: string[] }) => {
    setCreating(true);
    try {
      const res = await createGroup(values.name, values.member_ids);
      message.success(t('common.success'));
      onCreated(res.data);
    } catch {
      message.error(t('common.error'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      title={t('messaging.new_group')}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={creating}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
    >
      <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
        <Form.Item name="name" label={t('messaging.group_name')} rules={[{ required: true }]}>
          <Input placeholder={t('messaging.group_name_placeholder')} />
        </Form.Item>
        <Form.Item name="member_ids" label={t('messaging.select_members')} rules={[{ required: true }]}>
          <Select
            mode="multiple"
            loading={loading}
            placeholder={t('messaging.select_members')}
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
