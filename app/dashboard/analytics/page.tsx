"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle2, Clock, FileText } from "lucide-react"
import { getComplaintStats } from "@/lib/firebase-service"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    byType: {
      road: 0,
      water: 0,
      garbage: 0,
      electricity: 0,
      sewage: 0,
      public_property: 0,
      other: 0,
    },
    averageResolutionTime: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      if (!user || (user.role !== "admin" && user.role !== "municipal_officer")) {
        return
      }

      try {
        const data = await getComplaintStats()
        setStats(data)
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user])

  if (!user || (user.role !== "admin" && user.role !== "municipal_officer")) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-muted-foreground">You don't have permission to view this page</p>
      </div>
    )
  }

  // Prepare data for charts
  const statusData = [
    { name: "Pending", value: stats.pending, color: "#f59e0b" },
    { name: "In Progress", value: stats.inProgress, color: "#3b82f6" },
    { name: "Resolved", value: stats.resolved, color: "#10b981" },
  ]

  const typeData = Object.entries(stats.byType).map(([key, value]) => ({
    name: key.replace("_", " ").charAt(0).toUpperCase() + key.replace("_", " ").slice(1),
    value,
  }))

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658"]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Overview of complaint statistics and trends</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Complaints</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">All complaints in the system</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pending}</div>
                <p className="text-xs text-muted-foreground">
                  {((stats.pending / stats.total) * 100).toFixed(1)}% of total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.inProgress}</div>
                <p className="text-xs text-muted-foreground">
                  {((stats.inProgress / stats.total) * 100).toFixed(1)}% of total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.resolved}</div>
                <p className="text-xs text-muted-foreground">
                  {((stats.resolved / stats.total) * 100).toFixed(1)}% of total
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Average Resolution Time</CardTitle>
              <CardDescription>Average time to resolve complaints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.averageResolutionTime.toFixed(1)} days</div>
            </CardContent>
          </Card>

          <Tabs defaultValue="status" className="space-y-4">
            <TabsList>
              <TabsTrigger value="status">Status Distribution</TabsTrigger>
              <TabsTrigger value="type">Complaint Types</TabsTrigger>
            </TabsList>
            <TabsContent value="status">
              <Card>
                <CardHeader>
                  <CardTitle>Complaints by Status</CardTitle>
                  <CardDescription>Distribution of complaints by their current status</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ChartContainer
                    config={{
                      pending: { color: "#f59e0b" },
                      inProgress: { color: "#3b82f6" },
                      resolved: { color: "#10b981" },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="type">
              <Card>
                <CardHeader>
                  <CardTitle>Complaints by Type</CardTitle>
                  <CardDescription>Distribution of complaints by category</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ChartContainer
                    config={{
                      road: { color: "#0088FE" },
                      water: { color: "#00C49F" },
                      garbage: { color: "#FFBB28" },
                      electricity: { color: "#FF8042" },
                      sewage: { color: "#8884d8" },
                      public_property: { color: "#82ca9d" },
                      other: { color: "#ffc658" },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={typeData}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="value" fill="#8884d8">
                          {typeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

