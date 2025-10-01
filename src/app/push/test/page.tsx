'use client'

import { useState } from 'react'

import { sendPushNotification } from '@/lib/actions/push'

export default function PushTestPage() {
  const [body, setBody] = useState('이것은 테스트 웹푸쉬 알림입니다!')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  async function handleSendPushNotification() {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const data = await sendPushNotification(body.trim())

      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || '푸쉬 알림 발송에 실패했습니다.')
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.')
      console.error('Error sending push notification:', err)
    } finally {
      setLoading(false)
    }
  }

  return process.env.NODE_ENV === 'development' ? (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            웹푸쉬 알림 테스트
          </h1>

          <div className="space-y-6">
            {/* 알림 설정 폼 */}
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="body"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  내용
                </label>
                <textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="알림 내용을 입력하세요"
                />
              </div>
            </div>

            {/* 발송 버튼 */}
            <div className="text-center">
              <button
                onClick={handleSendPushNotification}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-lg transition-colors"
              >
                {loading ? '발송 중...' : '푸쉬 알림 발송'}
              </button>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* 결과 */}
            {result && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                <h3 className="font-semibold mb-2">발송 결과</h3>
                <p className="mb-2">{result.message}</p>
                <div className="text-sm">
                  <p>
                    <strong>총 구독자 수:</strong> {result.totalSubscribers}
                  </p>
                  <p>
                    <strong>성공:</strong>{' '}
                    {
                      result.results.filter((r: any) => r.status === 'success')
                        .length
                    }
                  </p>
                  <p>
                    <strong>실패:</strong>{' '}
                    {
                      result.results.filter((r: any) => r.status === 'failed')
                        .length
                    }
                  </p>
                </div>

                {result.results.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer font-semibold">
                      상세 결과
                    </summary>
                    <div className="mt-2 text-xs">
                      {result.results.map((r: any, index: number) => (
                        <div key={index} className="mb-1">
                          <span
                            className={`inline-block w-16 px-2 py-1 rounded text-xs ${
                              r.status === 'success'
                                ? 'bg-green-200 text-green-800'
                                : 'bg-red-200 text-red-800'
                            }`}
                          >
                            {r.status}
                          </span>
                          <span className="ml-2">{r.endpoint}</span>
                          {r.error && (
                            <span className="ml-2 text-red-600">
                              ({r.error})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* 안내사항 */}
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-700 mb-2">
                테스트 안내
              </h3>
              <ul className="text-sm text-yellow-600 space-y-1">
                <li>• 먼저 웹푸쉬 관리 페이지에서 구독을 등록해주세요.</li>
                <li>• 브라우저에서 알림 권한을 허용해야 합니다.</li>
                <li>• 구독한 모든 사용자에게 동시에 알림이 발송됩니다.</li>
                <li>• 알림을 클릭하면 지정한 URL로 이동합니다.</li>
              </ul>
            </div>

            {/* 관리 페이지 링크 */}
            <div className="text-center">
              <a
                href="/push"
                className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                웹푸쉬 관리 페이지로 돌아가기
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div>development 환경이 아닙니다.</div>
  )
}
