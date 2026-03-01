import { useState, useRef, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getNotifications } from '@/lib/api'
import type { Notification, NotificationType } from '@/types'

const NOTIFICATION_ICONS: Record<NotificationType, { label: string; bg: string; icon: string }> = {
  emergency: { label: 'Emergency', bg: 'bg-red-100 text-red-700', icon: '🚨' },
  medicine_reminder: { label: 'Medicine', bg: 'bg-amber-100 text-amber-800', icon: '💊' },
  appointment_reminder: { label: 'Appointment', bg: 'bg-blue-100 text-blue-800', icon: '📅' },
  stability_alert: { label: 'Stability', bg: 'bg-orange-100 text-orange-800', icon: '⚠️' },
  general: { label: 'Notice', bg: 'bg-slate-100 text-slate-700', icon: '🔔' },
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString()
}

export function NotificationBell() {
  const { id: patientId } = useParams<{ id: string }>()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const { data: items = [] } = useQuery({
    queryKey: ['notifications', patientId ?? 'all'],
    queryFn: () => getNotifications(patientId ?? undefined),
  })

  const markAllRead = () => {} // API does not support read state yet; badge reflects count
  const unreadCount = items.length

  useEffect(() => {
    if (!open) return
    const onOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onOutside)
    return () => document.removeEventListener('click', onOutside)
  }, [open])

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100"
        aria-label={unreadCount ? `${unreadCount} notifications` : 'Notifications'}
      >
        <svg className="h-6 w-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m-6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-medium text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No notifications</p>
            ) : (
              <ul className="py-1">
                {items.map((n) => {
                  const meta = NOTIFICATION_ICONS[n.type]
                  const content = (
                    <>
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.bg} text-base`}>
                        {meta.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${n.read ? 'text-slate-600' : 'text-slate-900'}`}>
                          {n.title}
                        </p>
                        {n.message && (
                          <p className="truncate text-xs text-slate-500">{n.message}</p>
                        )}
                        {n.patient_name && (
                          <p className="text-xs text-slate-400">{n.patient_name}</p>
                        )}
                        <p className="mt-0.5 text-xs text-slate-400">{formatTime(n.created_at)}</p>
                      </div>
                    </>
                  )
                  return (
                    <li key={n.id} className="border-b border-slate-100 last:border-0">
                      {n.link ? (
                        <Link
                          to={n.link}
                          onClick={() => setOpen(false)}
                          className="flex gap-3 px-4 py-3 hover:bg-slate-50"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="flex gap-3 px-4 py-3">{content}</div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <div className="border-t border-slate-200 px-4 py-2">
            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className="block text-center text-sm text-slate-600 hover:text-slate-900"
            >
              View dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
