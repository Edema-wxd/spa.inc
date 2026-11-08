import { AlertTriangle, CheckCircle2, CheckCheck, Globe, PiggyBank, UserX } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { SummaryCard } from "@/components/shared/summary-card"
import { ShareCard } from "@/components/online-booking/share-card"
import { BookingSettingsForm } from "@/components/online-booking/booking-settings-form"
import { MessageLog } from "@/components/online-booking/message-log"
import { getPageContext } from "@/server/context"
import { getOnlineBookingOverview } from "@/server/services/booking-settings"

function ProviderStatus({ ok, title, detail }: { ok: boolean; title: string; detail: string }) {
  const Icon = ok ? CheckCircle2 : AlertTriangle
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${ok ? "text-emerald-600" : "text-amber-600"}`} />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}

export default async function OnlineBookingPage() {
  const data = await getOnlineBookingOverview(await getPageContext())
  const { stats, providers } = data
  const effect =
    stats.noShowWithDeposit !== null && stats.noShowWithout !== null
      ? `vs ${stats.noShowWithout}% without (${stats.sampleWithDeposit} and ${stats.sampleWithout} visits)`
      : "not enough visits yet"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Online Booking"
        description="Your booking page, deposits and WhatsApp reminders. Share the link anywhere clients find you."
        action={{ label: "Open booking page", href: `/book/${data.org.slug}`, icon: Globe }}
      />

      <ShareCard url={data.bookingUrl} businessName={data.org.name} enabled={data.settings.enabled} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <SummaryCard
          title="Booked Online"
          value={stats.onlineShare !== null ? `${stats.onlineShare}%` : "None yet"}
          icon={Globe}
          description={`${stats.onlineBookings} bookings, last 90 days`}
        />
        <SummaryCard
          title="No-shows With Deposit"
          value={stats.noShowWithDeposit !== null ? `${stats.noShowWithDeposit}%` : "N/A"}
          icon={UserX}
          description={effect}
        />
        <SummaryCard
          title="Deposits Kept"
          value={stats.depositsKeptLabel}
          icon={PiggyBank}
          description="late cancellations and no-shows, 90 days"
        />
        <SummaryCard
          title="Confirmed on WhatsApp"
          value={stats.reminded ? `${Math.round((stats.confirmedByReply / stats.reminded) * 100)}%` : "N/A"}
          icon={CheckCheck}
          description={`${stats.confirmedByReply} of ${stats.reminded} reminded clients replied 1`}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ProviderStatus
          ok={providers.payments.live}
          title={`Deposits: ${providers.payments.label}`}
          detail={
            providers.payments.live
              ? "Clients pay on the provider's secure checkout. Webhooks confirm the booking."
              : providers.payments.id === "DEMO"
                ? `Add ${data.org.currency === "NGN" ? "PAYSTACK_SECRET_KEY" : "STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET"} to take real deposits.`
                : "No payment provider is configured, so deposits are not being collected."
          }
        />
        <ProviderStatus
          ok={providers.whatsapp}
          title={`WhatsApp: ${providers.whatsapp ? "connected" : "not connected"}`}
          detail={
            providers.whatsapp
              ? "Confirmations and reminders are sent from your WhatsApp Business number."
              : "Messages are written to the log below but not sent. Add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID to send them."
          }
        />
      </div>

      <BookingSettingsForm settings={data.settings} features={data.features} currency={data.org.currency} />

      <MessageLog
        messages={data.messages}
        timezone={data.timezone}
        canRunReminders={data.features.whatsappReminders}
      />
    </div>
  )
}
