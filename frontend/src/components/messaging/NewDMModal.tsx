import { useState, useEffect } from 'react';
import { Modal, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import type { User } from '../../types';
import { getMessageableUsers } from '../../api';

interface Props {
  open: boolean;
  currentUserId: string;
  onSelect: (userId: string) => void;
  onCancel: () => void;
}

export default function NewDMModal({ open, currentUserId, onSelect, onCancel }: Props) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getMessageableUsers()
        .then((res) => setUsers(res.data.filter((u) => u.id !== currentUserId)))
        .finally(() => setLoading(false));
    }
  }, [open, currentUserId]);

  return (
    <Modal
      title={t('messaging.new_dm')}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={400}
    >
      <Select
        showSearch
        style={{ width: '100%', marginTop: 8 }}
        placeholder={t('messaging.select_user')}
        loading={loading}
        optionFilterProp="label"
        onChange={(val) => onSelect(val as string)}
        options={users.map((u) => ({
          value: u.id,
          label: `${u.display_name} (@${u.username})`,
        }))}
        size="large"
      />
    </Modal>
  );
}
