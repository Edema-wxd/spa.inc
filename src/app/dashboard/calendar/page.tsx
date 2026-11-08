import { CalendarView } from "@/components/calendar/calendar-view"
import { PageHeader } from "@/components/shared/page-header"
import { getPageContext } from "@/server/context"
import { getBookingOptions, getCalendar } from "@/server/services/appointments"

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; staff?: string; book?: string; client?: string }>
}) {
  const params = await searchParams
  const ctx = await getPageContext()
  const [data, options] = await Promise.all([
    getCalendar(ctx, { view: params.view, date: params.date, staffId: params.staff }),
    getBookingOptions(ctx),
  ])

  return (
    <div className="space-y-6">
      <PageHeader title="Calendar" description="Bookings by therapist. Times are checked against working hours and other bookings." />
      <CalendarView
        // Remount when the visible range changes so local UI state starts fresh
        key={`${data.view}|${data.days[0]}|${data.selectedStaffId}`}
        data={data}
        options={options}
        initialBooking={params.book === "1" ? { clientId: params.client } : null}
      />
    </div>
  )
}
