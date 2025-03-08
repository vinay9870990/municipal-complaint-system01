"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle2, Clock, FileText, PlusCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { getAllComplaints, getComplaintsByCitizenId, getComplaintsByOfficerId } from "@/lib/complaint-service"
import type { Complaint } from "@/lib/types"

export default function DashboardPage() {
  const { user } = useAuth()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  })

  useEffect(() => {
    const fetchComplaints = async () => {
      if (!user) return

      try {
        let fetchedComplaints: Complaint[] = []

        if (user.role === "citizen") {
          fetchedComplaints = await getComplaintsByCitizenId(user.uid)
        } else if (user.role === "municipal_officer") {
          fetchedComplaints = await getComplaintsByOfficerId(user.uid)
        } else if (user.role === "admin") {
          fetchedComplaints = await getAllComplaints(10)
        }

        setComplaints(fetchedComplaints)

        // Calculate stats
        const pending = fetchedComplaints.filter((c) => c.status === "pending").length
        const inProgress = fetchedComplaints.filter((c) => c.status === "in_progress").length
        const resolved = fetchedComplaints.filter((c) => c.status === "resolved").length

        setStats({
          total: fetchedComplaints.length,
          pending,
          inProgress,
          resolved,
        })
      } catch (error) {
        console.error("Error fetching complaints:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchComplaints()
  }, [user])

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.displayName || user.email}!</p>
        </div>
        {user.role === "citizen" && (
          <Button asChild>
            <Link href="/dashboard/complaints/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Complaint
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Complaints</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All complaints {user.role === "citizen" ? "submitted by you" : "in the system"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Complaints awaiting assignment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Complaints being addressed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">Successfully resolved complaints</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Recent Complaints</TabsTrigger>
          {user.role !== "citizen" && <TabsTrigger value="pending">Pending Complaints</TabsTrigger>}
        </TabsList>
        <TabsContent value="recent" className="space-y-4">
          <div className="grid gap-4">
            {loading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  </div>
                </CardContent>
              </Card>
            ) : complaints.length > 0 ? (
              complaints.slice(0, 5).map((complaint) => (
                <Card key={complaint.id}>
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{complaint.title}</CardTitle>
                      <StatusBadge status={complaint.status} />
                    </div>
                    <CardDescription>
                      {new Date(complaint.createdAt).toLocaleDateString()} • {complaint.type.replace("_", " ")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="line-clamp-2 text-sm text-muted-foreground">{complaint.description}</p>
                    <div className="mt-4 flex justify-end">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/complaints/${complaint.id}`}>
                          View Details
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No complaints found</p>
                  {user.role === "citizen" && (
                    <Button className="mt-4" asChild>
                      <Link href="/dashboard/complaints/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Submit a Complaint
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {complaints.length > 0 && (
              <div className="flex justify-center">
                <Button variant="outline" asChild>
                  <Link href="/dashboard/complaints">
                    View All Complaints
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {user.role !== "citizen" && (
          <TabsContent value="pending" className="space-y-4">
            <div className="grid gap-4">
              {loading ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    </div>
                  </CardContent>
                </Card>
              ) : complaints.filter((c) => c.status === "pending").length > 0 ? (
                complaints
                  .filter((c) => c.status === "pending")
                  .slice(0, 5)
                  .map((complaint) => (
                    <Card key={complaint.id}>
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{complaint.title}</CardTitle>
                          <StatusBadge status={complaint.status} />
                        </div>
                        <CardDescription>
                          {new Date(complaint.createdAt).toLocaleDateString()} • {complaint.type.replace("_", " ")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="line-clamp-2 text-sm text-muted-foreground">{complaint.description}</p>
                        <div className="mt-4 flex justify-end">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/complaints/${complaint.id}`}>
                              View Details
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No pending complaints found</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  let bgColor = ""
  let textColor = ""
  let icon = null

  switch (status) {
    case "pending":
      bgColor = "bg-amber-100"
      textColor = "text-amber-800"
      icon = <AlertCircle className="mr-1 h-3 w-3" />
      break
    case "in_progress":
      bgColor = "bg-blue-100"
      textColor = "text-blue-800"
      icon = <Clock className="mr-1 h-3 w-3" />
      break
    case "resolved":
      bgColor = "bg-green-100"
      textColor = "text-green-800"
      icon = <CheckCircle2 className="mr-1 h-3 w-3" />
      break
    default:
      bgColor = "bg-gray-100"
      textColor = "text-gray-800"
  }

  return (
    <div className={`flex items-center rounded-full px-2 py-1 text-xs font-medium ${bgColor} ${textColor}`}>
      {icon}
      <span className="capitalize">{status.replace("_", " ")}</span>
    </div>
  )
}

