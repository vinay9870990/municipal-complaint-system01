"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, CheckCircle2, Clock, PlusCircle, Search, ArrowRight } from "lucide-react"
import Link from "next/link"
import { getAllComplaints, getComplaintsByCitizenId, getComplaintsByOfficerId } from "@/lib/complaint-service"
import type { Complaint, ComplaintStatus, ComplaintType } from "@/lib/types"

export default function ComplaintsPage() {
  const { user } = useAuth()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | "all">("all")
  const [typeFilter, setTypeFilter] = useState<ComplaintType | "all">("all")

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
          fetchedComplaints = await getAllComplaints()
        }

        setComplaints(fetchedComplaints)
        setFilteredComplaints(fetchedComplaints)
      } catch (error) {
        console.error("Error fetching complaints:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchComplaints()
  }, [user])

  useEffect(() => {
    let result = [...complaints]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (complaint) =>
          complaint.title.toLowerCase().includes(query) || complaint.description.toLowerCase().includes(query),
      )
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((complaint) => complaint.status === statusFilter)
    }

    // Apply type filter
    if (typeFilter !== "all") {
      result = result.filter((complaint) => complaint.type === typeFilter)
    }

    setFilteredComplaints(result)
  }, [searchQuery, statusFilter, typeFilter, complaints])

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Complaints</h1>
          <p className="text-muted-foreground">Manage and track all complaints in the system</p>
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

      <Card>
        <CardHeader>
          <CardTitle>Complaint List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search complaints..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ComplaintStatus | "all")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as ComplaintType | "all")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="road">Road</SelectItem>
                  <SelectItem value="water">Water</SelectItem>
                  <SelectItem value="garbage">Garbage</SelectItem>
                  <SelectItem value="electricity">Electricity</SelectItem>
                  <SelectItem value="sewage">Sewage</SelectItem>
                  <SelectItem value="public_property">Public Property</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : filteredComplaints.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredComplaints.map((complaint) => (
                      <TableRow key={complaint.id}>
                        <TableCell className="font-medium">{complaint.title}</TableCell>
                        <TableCell className="capitalize">{complaint.type.replace("_", " ")}</TableCell>
                        <TableCell>
                          <StatusBadge status={complaint.status} />
                        </TableCell>
                        <TableCell>{new Date(complaint.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/complaints/${complaint.id}`}>
                              <span className="sr-only">View details</span>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
                <div className="text-muted-foreground">No complaints found</div>
                {user.role === "citizen" && (
                  <Button className="mt-4" asChild>
                    <Link href="/dashboard/complaints/new">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Submit a Complaint
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
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

