"use client"

import { useState } from "react"
import { toast } from "sonner"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { users } from "@/lib/mock-data"
import { getInitials, cn } from "@/lib/utils"

const adminUser = users.find((u) => u.id === "admin-001")!

const operatingHours = [
  { day: "Monday", hours: "9:00 AM - 7:00 PM" },
  { day: "Tuesday", hours: "9:00 AM - 7:00 PM" },
  { day: "Wednesday", hours: "9:00 AM - 7:00 PM" },
  { day: "Thursday", hours: "9:00 AM - 8:00 PM" },
  { day: "Friday", hours: "9:00 AM - 8:00 PM" },
  { day: "Saturday", hours: "10:00 AM - 6:00 PM" },
  { day: "Sunday", hours: "Closed" },
]

const roleColorMap: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  STAFF: "bg-blue-100 text-blue-700 hover:bg-blue-100",
}

export default function SettingsPage() {
  // Account tab state
  const [fullName, setFullName] = useState(adminUser.full_name)
  const [email, setEmail] = useState(adminUser.email)
  const [phone, setPhone] = useState(adminUser.phone)

  // Business tab state
  const [businessName, setBusinessName] = useState("Spa.Inc Wellness Center")
  const [businessAddress, setBusinessAddress] = useState(
    "123 Serenity Lane, Suite 100, Beverly Hills, CA 90210"
  )
  const [businessPhone, setBusinessPhone] = useState("5559876543")
  const [businessEmail, setBusinessEmail] = useState("hello@spa-inc.com")

  // Notifications tab state
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsAlerts, setSmsAlerts] = useState(true)
  const [appointmentReminders, setAppointmentReminders] = useState(true)
  const [paymentConfirmations, setPaymentConfirmations] = useState(true)
  const [dailyReports, setDailyReports] = useState(true)

  function handleSaveAccount() {
    console.log("Account saved:", { fullName, email, phone })
    toast.success("Account settings saved")
  }

  function handleSaveBusiness() {
    console.log("Business saved:", {
      businessName,
      businessAddress,
      businessPhone,
      businessEmail,
    })
    toast.success("Business settings saved")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account and business preferences
        </p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Update your personal information and profile settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-spa-primary text-white text-lg">
                    {getInitials(fullName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm" onClick={() => toast.info("Photo upload coming soon")}>
                    Change Photo
                  </Button>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPG, PNG or GIF. Max 2MB.
                  </p>
                </div>
              </div>

              {/* Form */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={handleSaveAccount}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Tab */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                Manage your business details and operating hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessEmail">Email</Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessPhone">Phone</Label>
                  <Input
                    id="businessPhone"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="businessAddress">Address</Label>
                  <Input
                    id="businessAddress"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                  />
                </div>
              </div>

              {/* Operating Hours */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Operating Hours</Label>
                <div className="rounded-md border">
                  {operatingHours.map((schedule) => (
                    <div
                      key={schedule.day}
                      className="flex items-center justify-between border-b px-4 py-2.5 last:border-b-0"
                    >
                      <span className="text-sm font-medium">
                        {schedule.day}
                      </span>
                      <span
                        className={cn(
                          "text-sm",
                          schedule.hours === "Closed"
                            ? "text-muted-foreground"
                            : "text-foreground"
                        )}
                      >
                        {schedule.hours}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleSaveBusiness}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Configure how you receive notifications and alerts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  id: "emailNotifications",
                  label: "Email Notifications",
                  description:
                    "Receive email notifications for important updates",
                  checked: emailNotifications,
                  onChange: setEmailNotifications,
                },
                {
                  id: "smsAlerts",
                  label: "SMS Alerts",
                  description:
                    "Get text message alerts for urgent notifications",
                  checked: smsAlerts,
                  onChange: setSmsAlerts,
                },
                {
                  id: "appointmentReminders",
                  label: "Appointment Reminders",
                  description:
                    "Send reminders before scheduled appointments",
                  checked: appointmentReminders,
                  onChange: setAppointmentReminders,
                },
                {
                  id: "paymentConfirmations",
                  label: "Payment Confirmations",
                  description:
                    "Notify when payments are received or processed",
                  checked: paymentConfirmations,
                  onChange: setPaymentConfirmations,
                },
                {
                  id: "dailyReports",
                  label: "Daily Reports",
                  description:
                    "Receive a daily summary of business activity",
                  checked: dailyReports,
                  onChange: setDailyReports,
                },
              ].map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-0.5">
                    <Label htmlFor={item.id} className="cursor-pointer text-sm font-medium">
                      {item.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <Switch
                    id={item.id}
                    checked={item.checked}
                    onCheckedChange={item.onChange}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Manage your team and their access levels.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => toast.info("Coming soon")}
              >
                <UserPlus className="h-4 w-4" />
                Invite Member
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-spa-light text-spa-accent text-xs">
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {user.full_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            roleColorMap[user.role] || "bg-gray-100 text-gray-600",
                            "font-medium"
                          )}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            user.is_active
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-100",
                            "font-medium"
                          )}
                        >
                          {user.is_active ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
