'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import Navbar from '@/components/Navbar';

interface NotificationSettings {
  enableInApp: boolean;
  enableEmail: boolean;
  enablePush: boolean;
  notifyOnMessage: boolean;
  notifyOnTransaction: boolean;
  notifyOnReview: boolean;
}

export default function NotificationSettingsPage() {
  const { user, fetchUser } = useAuthStore();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const data = await apiFetch('/api/notifications/settings');
        setSettings(data);
      } catch {
        // error
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);

    setSaving(true);
    try {
      await apiFetch('/api/notifications/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
    } catch {
      // revert
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <>
        <Navbar />
        <div className="max-w-xl mx-auto p-6 text-center text-gray-500">로딩 중...</div>
      </>
    );
  }

  const Toggle = ({
    label,
    description,
    checked,
    onChange,
  }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (val: boolean) => void;
  }) => (
    <div className="flex items-center justify-between py-4 border-b last:border-b-0">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={
          'relative w-11 h-6 rounded-full transition-colors ' +
          (checked ? 'bg-purple-600' : 'bg-gray-300')
        }
      >
        <span
          className={
            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ' +
            (checked ? 'translate-x-5' : 'translate-x-0')
          }
        />
      </button>
    </div>
  );

  return (
    <>
      <Navbar />
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-8">알림 설정</h1>

        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">알림 채널</h2>
          <Toggle
            label="인앱 알림"
            description="앱 내에서 알림을 받습니다"
            checked={settings.enableInApp}
            onChange={(v) => updateSetting('enableInApp', v)}
          />
          <Toggle
            label="이메일 알림"
            description="이메일로 알림을 받습니다"
            checked={settings.enableEmail}
            onChange={(v) => updateSetting('enableEmail', v)}
          />
          <Toggle
            label="푸시 알림"
            description="브라우저 푸시 알림을 받습니다"
            checked={settings.enablePush}
            onChange={(v) => updateSetting('enablePush', v)}
          />
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">알림 종류</h2>
          <Toggle
            label="메시지 알림"
            description="새 채팅 메시지가 도착하면 알림"
            checked={settings.notifyOnMessage}
            onChange={(v) => updateSetting('notifyOnMessage', v)}
          />
          <Toggle
            label="거래 알림"
            description="의뢰 요청/수락/완료 시 알림"
            checked={settings.notifyOnTransaction}
            onChange={(v) => updateSetting('notifyOnTransaction', v)}
          />
          <Toggle
            label="후기 알림"
            description="후기가 작성되면 알림"
            checked={settings.notifyOnReview}
            onChange={(v) => updateSetting('notifyOnReview', v)}
          />
        </div>

        {saving && (
          <p className="text-sm text-gray-400 text-center mt-4">저장 중...</p>
        )}
      </div>
    </>
  );
}
