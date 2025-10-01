'use client'

import { useEffect, useState } from 'react'

import {
  getSubscriptionCount,
  registerPushSubscription,
  unregisterPushSubscription,
} from '@/lib/actions/push'

export default function PushPage() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  )
  const [publicKey, setPublicKey] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // 브라우저 지원 확인
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      checkSubscription()
      getPublicKey()
    }
  }, [])

  const getPublicKey = async () => {
    try {
      const result = await getSubscriptionCount()
      if (result.publicKey) {
        setPublicKey(result.publicKey)
      }
    } catch (error) {
      console.error('Error getting public key:', error)
    }
  }

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      setSubscription(sub)
      setIsSubscribed(!!sub)
    } catch (error) {
      console.error('Error checking subscription:', error)
    }
  }

  const subscribeToPush = async () => {
    if (!isSupported) {
      setMessage('이 브라우저는 웹푸쉬를 지원하지 않습니다.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // 서비스 워커 등록
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered:', registration)

      // 푸쉬 구독
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      // 서버에 구독 정보 전송
      const result = await registerPushSubscription(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.getKey('p256dh'),
            auth: sub.getKey('auth'),
          },
        },
        navigator.userAgent,
      )

      if (result.success) {
        setSubscription(sub)
        setIsSubscribed(true)
        setMessage('웹푸쉬 구독이 성공적으로 등록되었습니다!')
      } else {
        throw new Error(result.error || 'Failed to register subscription')
      }
    } catch (error) {
      console.error('Error subscribing to push:', error)
      setMessage('웹푸쉬 구독 등록에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const unsubscribeFromPush = async () => {
    if (!subscription) return

    setLoading(true)
    setMessage('')

    try {
      // 브라우저에서 구독 해제
      await subscription.unsubscribe()

      // 서버에서 구독 정보 제거
      const result = await unregisterPushSubscription(subscription.endpoint)

      if (result.success) {
        setSubscription(null)
        setIsSubscribed(false)
        setMessage('웹푸쉬 구독이 해제되었습니다.')
      } else {
        throw new Error(result.error || 'Failed to unregister subscription')
      }
    } catch (error) {
      console.error('Error unsubscribing from push:', error)
      setMessage('웹푸쉬 구독 해제에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            웹푸쉬 미지원
          </h1>
          <p className="text-gray-600">
            이 브라우저는 웹푸쉬를 지원하지 않습니다.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Chrome, Firefox, Safari 등의 최신 브라우저를 사용해주세요.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            웹푸쉬 관리
          </h1>

          <div className="space-y-6">
            {/* 현재 상태 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                현재 상태
              </h2>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${isSubscribed ? 'bg-green-500' : 'bg-red-500'}`}
                ></div>
                <span className="text-gray-600">
                  {isSubscribed ? '웹푸쉬 구독 중' : '웹푸쉬 미구독'}
                </span>
              </div>
            </div>

            {/* 구독/해제 버튼 */}
            <div className="text-center">
              {!isSubscribed ? (
                <button
                  onClick={subscribeToPush}
                  disabled={loading || !publicKey}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  {loading ? '등록 중...' : '웹푸쉬 구독하기'}
                </button>
              ) : (
                <button
                  onClick={unsubscribeFromPush}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  {loading ? '해제 중...' : '웹푸쉬 구독 해제'}
                </button>
              )}
            </div>

            {/* 메시지 */}
            {message && (
              <div
                className={`p-4 rounded-lg ${message.includes('실패') || message.includes('미지원') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
              >
                {message}
              </div>
            )}

            {/* 구독 정보 */}
            {subscription && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  구독 정보
                </h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <strong>Endpoint:</strong>{' '}
                    {subscription.endpoint.substring(0, 50)}...
                  </p>
                  <p>
                    <strong>Keys:</strong>{' '}
                    {subscription.getKey('p256dh') ? 'Present' : 'Missing'}
                  </p>
                </div>
              </div>
            )}

            {/* 안내사항 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-700 mb-2">
                안내사항
              </h3>
              <ul className="text-sm text-blue-600 space-y-1">
                <li>• 웹푸쉬 알림을 받으려면 먼저 구독을 등록해야 합니다.</li>
                <li>• 브라우저에서 알림 권한을 허용해야 합니다.</li>
                <li>• 구독 후 테스트 페이지에서 알림을 발송할 수 있습니다.</li>
              </ul>
            </div>

            {/* 테스트 페이지 링크 */}
            <div className="text-center">
              <a
                href="/push/test"
                className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                푸쉬 알림 테스트 페이지로 이동
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
