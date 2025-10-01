import { schedules } from '@trigger.dev/sdk/v3'

export const firstScheduledTask = schedules.task({
  id: 'next-scheduled-task',
  cron: {
    pattern: '50 9 * * *',
    timezone: 'Asia/Seoul',
  },
  maxDuration: 300,
  run: async () => {
    await fetch('https://web-push-liard.vercel.app/api/push/send', {
      method: 'POST',
    })
  },
})
