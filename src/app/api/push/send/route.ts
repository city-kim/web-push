import { NextResponse } from 'next/server'
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

const API_KEY = process.env.GOOGLE_API_KEY
const CALENDAR_ID = 'qduatr3seur835pk4aolok2900@group.calendar.google.com'
export async function POST() {
  try {
    const results = []

    const now = new Date()
    const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
    const timeMin = `${today}T00:00:00Z`
    const timeMax = `${today}T23:59:59Z`

    const base = 'https://www.googleapis.com/calendar/v3/calendars'
    const url = new URL(`${base}/${encodeURIComponent(CALENDAR_ID)}/events`)
    url.searchParams.set('key', API_KEY || '')
    url.searchParams.set('singleEvents', 'true')
    url.searchParams.set('orderBy', 'startTime')
    url.searchParams.set('timeMin', timeMin)
    url.searchParams.set('timeMax', timeMax)
    url.searchParams.set('maxResults', '2500')

    const r = await fetch(url)
    const calendarData = await r.json()

    // 공휴일 아닌경우만 진행함
    if (calendarData.items.length < 1) {
      // DB에서 모든 구독자 조회
      const subscriptions = await prisma.pushSubscription.findMany()

      // 모든 구독자에게 푸쉬 알림 발송
      for (const subscription of subscriptions) {
        try {
          const subscriptionData = {
            endpoint: subscription.endpoint,
            keys: subscription.keys as { p256dh: string; auth: string },
          }

          await webpush.sendNotification(subscriptionData, '근태관리할시간')
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
    }
  } catch (error) {
    console.error('Error sending push notifications:', error)
    return NextResponse.json(
      { error: 'Failed to send push notifications' },
      { status: 500 },
    )
  }
}

// AIzaSyAwcMthUigNNNZvSWLfLwsurSPULuBOPoQ
