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
  try {
    const { title, body, icon, url } = await request.json()

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const payload = JSON.stringify({
      title: title || '웹푸쉬 알림',
      body: body || '새로운 알림이 있습니다!',
      icon: icon || '/icon-192x192.png',
      url: url || '/',
      timestamp: new Date().toISOString(),
    })

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

        await webpush.sendNotification(subscriptionData, payload)
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

// 구독자 수 조회
export async function GET() {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      select: {
        endpoint: true,
        keys: true,
      },
    })

    return NextResponse.json({
      totalSubscribers: subscriptions.length,
      subscriptions: subscriptions.map((sub) => ({
        endpoint: sub.endpoint.substring(0, 50) + '...',
        keys: sub.keys ? 'present' : 'missing',
      })),
    })
  } catch (error) {
    console.error('Error getting subscribers:', error)
    return NextResponse.json(
      { error: 'Failed to get subscribers' },
      { status: 500 },
    )
  }
}
