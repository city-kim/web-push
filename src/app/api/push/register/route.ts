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
    const { subscription } = await request.json()

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription is required' },
        { status: 400 },
      )
    }

    // 중복 구독 확인 및 저장/업데이트
    const existingSubscription = await prisma.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint },
    })

    if (!existingSubscription) {
      await prisma.pushSubscription.create({
        data: {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          userAgent: request.headers.get('user-agent') || null,
        },
      })
    } else {
      // 기존 구독 정보 업데이트
      await prisma.pushSubscription.update({
        where: { endpoint: subscription.endpoint },
        data: {
          keys: subscription.keys,
          userAgent: request.headers.get('user-agent') || null,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Push subscription registered successfully',
      publicKey: vapidKeys.publicKey,
    })
  } catch (error) {
    console.error('Error registering push subscription:', error)
    return NextResponse.json(
      { error: 'Failed to register push subscription' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json()

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 },
      )
    }

    // 구독 해제
    await prisma.pushSubscription.delete({
      where: { endpoint },
    })

    return NextResponse.json({
      success: true,
      message: 'Push subscription unregistered successfully',
    })
  } catch (error) {
    console.error('Error unregistering push subscription:', error)
    return NextResponse.json(
      { error: 'Failed to unregister push subscription' },
      { status: 500 },
    )
  }
}

// 구독 목록 조회 (테스트용)
export async function GET() {
  try {
    const subscriptionCount = await prisma.pushSubscription.count()
    
    return NextResponse.json({
      subscriptions: subscriptionCount,
      publicKey: vapidKeys.publicKey,
    })
  } catch (error) {
    console.error('Error getting subscription count:', error)
    return NextResponse.json(
      { error: 'Failed to get subscription count' },
      { status: 500 },
    )
  }
}
