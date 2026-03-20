"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  CalendarClock,
  GraduationCap,
  IndianRupee,
  Megaphone,
  School,
  Users,
  UserPlus,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { authApi, dashboardApi } from "@/lib/api";

const feeChartColors = ["#16a34a", "#dc2626"];

const compactNumber = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DashboardView() {
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: authApi.profile,
  });

  const statsQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.get,
  });

  if (statsQuery.isLoading || profileQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (statsQuery.isError || profileQuery.isError) {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30">
        <p className="text-sm font-medium text-red-700 dark:text-red-300">Unable to load dashboard data</p>
        <p className="mt-1 text-sm text-red-600/90 dark:text-red-300/90">
          Please refresh the page. If the issue continues, verify admin session and API connectivity.
        </p>
      </Card>
    );
  }

  const profile = profileQuery.data;
  const stats = statsQuery.data || {};
  const totalStudents = Number(stats.totalStudents || 0);
  const totalTeachers = Number(stats.totalTeachers || 0);
  const totalClasses = Number(stats.totalClasses || 0);
  const totalSubjects = Number(stats.totalSubjects || 0);
  const newStudentsToday = Number(stats.newStudentsToday || 0);
  const newTeachersToday = Number(stats.newTeachersToday || 0);
  const attendanceTodayPercentage = Number(stats.attendanceTodayPercentage || 0);
  const feesCollectedThisMonth = Number(stats.feesCollectedThisMonth || 0);
  const pendingFees = Number(stats.pendingFees || 0);
  const pendingEnquiries = Number(stats.pendingEnquiries || 0);

  const cards = [
    {
      label: "Total Students",
      value: compactNumber.format(totalStudents),
      hint: `+${newStudentsToday} new today`,
      icon: GraduationCap,
      color: "from-blue-500/15 to-sky-500/10 text-blue-700 dark:text-blue-300",
    },
    {
      label: "Total Teachers",
      value: compactNumber.format(totalTeachers),
      hint: `+${newTeachersToday} new today`,
      icon: Users,
      color: "from-emerald-500/15 to-green-500/10 text-emerald-700 dark:text-emerald-300",
    },
    {
      label: "Attendance Today",
      value: `${attendanceTodayPercentage}%`,
      hint: "Current day attendance",
      icon: Activity,
      color: "from-amber-500/15 to-yellow-500/10 text-amber-700 dark:text-amber-300",
    },
    {
      label: "Pending Fees",
      value: inr.format(pendingFees),
      hint: "Outstanding amount",
      icon: IndianRupee,
      color: "from-rose-500/15 to-red-500/10 text-rose-700 dark:text-rose-300",
    },
  ];

  const academicComposition = [
    { label: "Classes", value: totalClasses },
    { label: "Subjects", value: totalSubjects },
    { label: "Teachers", value: totalTeachers },
    { label: "Students", value: totalStudents },
  ];

  const feeSplit = [
    { name: "Collected", value: feesCollectedThisMonth },
    { name: "Pending", value: pendingFees },
  ];

  const activitySnapshot = [
    { name: "New Students", value: newStudentsToday },
    { name: "New Teachers", value: newTeachersToday },
    { name: "Enquiries", value: pendingEnquiries },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-zinc-500">Live analytics, charts, and key operations overview</p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Live API Data</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="animate-rise-in overflow-hidden p-0">
            <div className={`bg-gradient-to-br p-4 ${card.color}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.15em]">{card.label}</p>
                <card.icon size={18} />
              </div>
              <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{card.value}</p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{card.hint}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="space-y-3 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Academic Composition</h2>
            <School size={16} className="text-zinc-500" />
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={academicComposition}>
                <CartesianGrid strokeDasharray="3 3" stroke="#8884" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Fee Status</h2>
            <IndianRupee size={16} className="text-zinc-500" />
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={feeSplit} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={3}>
                  {feeSplit.map((entry, index) => (
                    <Cell key={entry.name} fill={feeChartColors[index % feeChartColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => {
                    const amount = typeof value === "number" ? value : Number(value || 0);
                    return inr.format(Number.isFinite(amount) ? amount : 0);
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 text-sm">
            <p className="flex items-center justify-between"><span className="text-zinc-500">Collected this month</span><span className="font-medium">{inr.format(feesCollectedThisMonth)}</span></p>
            <p className="flex items-center justify-between"><span className="text-zinc-500">Pending</span><span className="font-medium">{inr.format(pendingFees)}</span></p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Admin Profile</h2>
            <UserPlus size={16} className="text-zinc-500" />
          </div>
          <p className="text-sm text-zinc-500">Session-backed profile from /admin/profile</p>
          <div className="grid gap-2 text-sm">
            <p>Name: {profile?.name || "-"}</p>
            <p>Email: {profile?.email || "-"}</p>
            <p>Role: {profile?.role || "-"}</p>
            <p>Status: {profile?.isActive ? "Active" : "Inactive"}</p>
            <p>ID: {profile?._id || "-"}</p>
          </div>
        </Card>

        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Notices</h2>
            <Megaphone size={16} className="text-zinc-500" />
          </div>
          <p className="text-sm text-zinc-500">Broadcasts and updates from live dashboard data</p>
          <div className="space-y-2">
            {(stats.recentNotices ?? []).slice(0, 4).map((notice) => (
              <div key={notice._id} className="rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{notice.title}</p>
                  <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">{notice.status || "active"}</Badge>
                </div>
                <p className="text-xs text-zinc-500">{notice.message}</p>
                {notice.createdAt ? <p className="mt-1 text-[11px] text-zinc-400">{formatDate(notice.createdAt)}</p> : null}
              </div>
            ))}
            {!stats.recentNotices?.length ? (
              <p className="text-sm text-zinc-500">No notices available.</p>
            ) : null}
          </div>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Today Activity Snapshot</h2>
          <CalendarClock size={16} className="text-zinc-500" />
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <AreaChart data={activitySnapshot}>
              <CartesianGrid strokeDasharray="3 3" stroke="#8884" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#f97316" fill="#fb923c66" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {activitySnapshot.map((item) => (
            <div key={item.name} className="rounded-lg border border-zinc-200 p-3 text-center dark:border-zinc-800">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{item.name}</p>
              <p className="mt-1 text-xl font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upcoming Meetings</h2>
            <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">{stats.upcomingMeetings?.length || 0}</Badge>
          </div>
          <p className="text-sm text-zinc-500">
            {stats.upcomingMeetings?.length
              ? "Meetings are available in your upcoming schedule."
              : "No upcoming meetings scheduled."}
          </p>
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Enquiries</h2>
            <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">{stats.recentEnquiries?.length || 0}</Badge>
          </div>
          <p className="text-sm text-zinc-500">
            {stats.recentEnquiries?.length
              ? "New enquiries are available for follow-up."
              : "No recent enquiries found."}
          </p>
        </Card>
      </div>
    </div>
  );
}
