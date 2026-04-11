import { useState } from 'react';
import { Input, Button, Typography, Dropdown, Alert } from 'antd';
import { UserOutlined, LockOutlined, GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useDirection } from '../hooks/useDirection';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const direction = useDirection();

  const onSubmit = async () => {
    // Read directly from DOM to handle autofill
    const usernameEl = document.querySelector<HTMLInputElement>('#login_username');
    const passwordEl = document.querySelector<HTMLInputElement>('#login_password');
    const username = usernameEl?.value?.trim() || '';
    const password = passwordEl?.value || '';

    if (!username) {
      setError(t('login.username_required'));
      return;
    }
    if (!password) {
      setError(t('login.password_required'));
      return;
    }

    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/received');
    } catch (err: unknown) {
      const serverMsg = (err as { response?: { data?: { error?: string }; status?: number } })?.response?.data?.error;
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setError(t('login.error'));
      } else if (serverMsg) {
        setError(serverMsg);
      } else {
        setError(t('login.network_error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      direction,
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4338ca 60%, #6366f1 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -120, right: -120,
        width: 400, height: 400, borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
      }} />
      <div style={{
        position: 'absolute', bottom: -80, left: -80,
        width: 300, height: 300, borderRadius: '50%',
        background: 'rgba(255,255,255,0.03)',
      }} />

      <div style={{
        width: 420,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 20,
        padding: '48px 40px 36px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
          }}>
            <span style={{ color: '#fff', fontSize: 28, fontWeight: 800 }}>P</span>
          </div>
          <Typography.Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1e1b4b', letterSpacing: '-0.5px' }}>
            {t('app_name')}
          </Typography.Title>
          <Typography.Text style={{ color: '#6b7280', fontSize: 15, marginTop: 4, display: 'block' }}>
            {t('login.title')}
          </Typography.Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError('')}
            style={{ marginBottom: 20, borderRadius: 10 }}
          />
        )}

        <div>
          <div style={{ marginBottom: 20 }}>
            <Input
              id="login_username"
              prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
              placeholder={t('login.username')}
              size="large"
              style={{ height: 48, borderRadius: 10, fontSize: 15 }}
              onPressEnter={onSubmit}
              onChange={() => error && setError('')}
              autoComplete="username"
            />
          </div>
          <div style={{ marginBottom: 28 }}>
            <Input.Password
              id="login_password"
              prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
              placeholder={t('login.password')}
              size="large"
              style={{ height: 48, borderRadius: 10, fontSize: 15 }}
              onPressEnter={onSubmit}
              onChange={() => error && setError('')}
              autoComplete="current-password"
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              block
              size="large"
              loading={loading}
              onClick={onSubmit}
              style={{
                height: 48,
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: '0.3px',
              }}
            >
              {t('login.submit')}
            </Button>
          </div>
        </div>

        <div style={{ textAlign: 'center', paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
          <Dropdown menu={{ items: [
            { key: 'en', label: 'English', onClick: () => i18n.changeLanguage('en') },
            { key: 'fa', label: 'فارسی', onClick: () => i18n.changeLanguage('fa') },
            { key: 'ur', label: 'اردو', onClick: () => i18n.changeLanguage('ur') },
          ]}}>
            <Button type="text" icon={<GlobalOutlined />} style={{ color: '#6b7280' }}>
              {{ en: 'English', fa: 'فارسی', ur: 'اردو' }[i18n.language] || 'English'}
            </Button>
          </Dropdown>
        </div>
      </div>
    </div>
  );
}
