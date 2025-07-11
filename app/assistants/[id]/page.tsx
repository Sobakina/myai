'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUserFingerprint } from '@/lib/fingerprint';

export default function AssistantRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    async function redirectToUserChat() {
      try {
        const fingerprint = await getUserFingerprint();
        const assistantId = params?.id as string;
        
        // Перенаправляем на новый маршрут с fingerprint
        router.replace(`/assistants/${assistantId}/${fingerprint}`);
      } catch (error) {
        console.error('Error getting fingerprint:', error);
        setIsRedirecting(false);
      }
    }

    if (params?.id) {
      redirectToUserChat();
    }
  }, [params?.id, router]);

  if (isRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Перенаправление...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950">
      <div className="text-center">
        <p className="text-red-400">Ошибка перенаправления</p>
      </div>
    </div>
  );
}