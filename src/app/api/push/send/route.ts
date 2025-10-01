import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'

import { prisma } from '@/lib/prisma'

// VAPID 키 설정 (실제 프로덕션에서는 환경변수로 관리해야 합니다)
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
}

// web-push 설정
webpush.setVapidDetails(
  'mailto:nkdevil@naver.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey,
)

export async function POST(request: NextRequest) {
  if (request.headers.get('x-api-key') !== process.env.API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { body } = await request.json()

    const results = []

    // DB에서 모든 구독자 조회
    const subscriptions = await prisma.pushSubscription.findMany()

    // 모든 구독자에게 푸쉬 알림 발송
    for (const subscription of subscriptions) {
      try {
        const subscriptionData = {
          endpoint: subscription.endpoint,
          keys: subscription.keys as { p256dh: string; auth: string },
        }

        await webpush.sendNotification(subscriptionData, body || '')
        results.push({
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          status: 'success',
        })
      } catch (error: any) {
        console.error('Error sending push notification:', error)

        // 구독이 만료되었거나 유효하지 않은 경우 DB에서 제거
        if (error.statusCode === 410 || error.statusCode === 404) {
          await prisma.pushSubscription.delete({
            where: { endpoint: subscription.endpoint },
          })
        }

        results.push({
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          status: 'failed',
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Push notifications sent to ${results.filter((r) => r.status === 'success').length} subscribers`,
      results: results,
      totalSubscribers: subscriptions.length,
    })
  } catch (error) {
    console.error('Error sending push notifications:', error)
    return NextResponse.json(
      { error: 'Failed to send push notifications' },
      { status: 500 },
    )
  }
}
