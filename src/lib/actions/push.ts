'use server'

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

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: ArrayBuffer | null
    auth: ArrayBuffer | null
  }
}

export interface RegisterPushSubscriptionResult {
  success: boolean
  message: string
  publicKey?: string
  error?: string
}

export interface SendPushNotificationResult {
  success: boolean
  message: string
  results: Array<{
    endpoint: string
    status: 'success' | 'failed'
    error?: string
  }>
  totalSubscribers: number
  error?: string
}

export interface GetSubscriptionCountResult {
  subscriptions: number
  publicKey: string
  error?: string
}

export interface GetSubscribersResult {
  totalSubscribers: number
  subscriptions: Array<{
    endpoint: string
    keys: string
  }>
  error?: string
}

function abToBase64Url(ab: ArrayBuffer | null): string {
  if (!ab) return ''
  const u8 = new Uint8Array(ab)
  // 1) 바이트 → base64
  const b64 = Buffer.from(u8).toString('base64')
  // 2) base64 → base64url(+/→-_, '=' 제거)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

/**
 * 푸시 구독을 등록합니다.
 */
export async function registerPushSubscription(
  subscription: PushSubscriptionData,
  userAgent?: string,
): Promise<RegisterPushSubscriptionResult> {
  try {
    if (!subscription) {
      return {
        success: false,
        message: 'Subscription is required',
        error: 'Subscription is required',
      }
    }

    // 중복 구독 확인 및 저장/업데이트
    const existingSubscription = await prisma.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint },
    })

    const toStringObject = {
      p256dh: abToBase64Url(subscription.keys.p256dh),
      auth: abToBase64Url(subscription.keys.auth),
    }
    console.log(toStringObject.auth, 'toStringObject')

    if (!existingSubscription) {
      await prisma.pushSubscription.create({
        data: {
          endpoint: subscription.endpoint,
          keys: toStringObject,
          userAgent: userAgent || null,
        },
      })
    } else {
      // 기존 구독 정보 업데이트
      await prisma.pushSubscription.update({
        where: { endpoint: subscription.endpoint },
        data: {
          keys: toStringObject,
          userAgent: userAgent || null,
        },
      })
    }

    return {
      success: true,
      message: 'Push subscription registered successfully',
      publicKey: vapidKeys.publicKey,
    }
  } catch (error) {
    console.error('Error registering push subscription:', error)
    return {
      success: false,
      message: 'Failed to register push subscription',
      error: 'Failed to register push subscription',
    }
  }
}

/**
 * 푸시 구독을 해제합니다.
 */
export async function unregisterPushSubscription(
  endpoint: string,
): Promise<RegisterPushSubscriptionResult> {
  try {
    if (!endpoint) {
      return {
        success: false,
        message: 'Endpoint is required',
        error: 'Endpoint is required',
      }
    }

    // 구독 해제
    await prisma.pushSubscription.delete({
      where: { endpoint },
    })

    return {
      success: true,
      message: 'Push subscription unregistered successfully',
    }
  } catch (error) {
    console.error('Error unregistering push subscription:', error)
    return {
      success: false,
      message: 'Failed to unregister push subscription',
      error: 'Failed to unregister push subscription',
    }
  }
}

/**
 * 구독 목록을 조회합니다. (테스트용)
 */
export async function getSubscriptionCount(): Promise<GetSubscriptionCountResult> {
  try {
    const subscriptionCount = await prisma.pushSubscription.count()

    return {
      subscriptions: subscriptionCount,
      publicKey: vapidKeys.publicKey,
    }
  } catch (error) {
    console.error('Error getting subscription count:', error)
    return {
      subscriptions: 0,
      publicKey: vapidKeys.publicKey,
      error: 'Failed to get subscription count',
    }
  }
}

/**
 * 푸시 알림을 발송합니다.
 */
export async function sendPushNotification(
  body?: string,
): Promise<SendPushNotificationResult> {
  try {
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

        await webpush.sendNotification(subscriptionData, body)
        results.push({
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          status: 'success' as const,
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
          status: 'failed' as const,
          error: error.message,
        })
      }
    }

    return {
      success: true,
      message: `Push notifications sent to ${results.filter((r) => r.status === 'success').length} subscribers`,
      results: results,
      totalSubscribers: subscriptions.length,
    }
  } catch (error) {
    console.error('Error sending push notifications:', error)
    return {
      success: false,
      message: 'Failed to send push notifications',
      error: 'Failed to send push notifications',
      results: [],
      totalSubscribers: 0,
    }
  }
}

/**
 * 구독자 수를 조회합니다.
 */
export async function getSubscribers(): Promise<GetSubscribersResult> {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      select: {
        endpoint: true,
        keys: true,
      },
    })

    return {
      totalSubscribers: subscriptions.length,
      subscriptions: subscriptions.map((sub) => ({
        endpoint: sub.endpoint.substring(0, 50) + '...',
        keys: sub.keys ? 'present' : 'missing',
      })),
    }
  } catch (error) {
    console.error('Error getting subscribers:', error)
    return {
      totalSubscribers: 0,
      subscriptions: [],
      error: 'Failed to get subscribers',
    }
  }
}
