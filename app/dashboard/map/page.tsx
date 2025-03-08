"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle2, Clock, MapPin, ArrowRight } from "lucide-react"
import Link from "next/link"
import { getAllComplaints, getComplaintsByCitizenId, getComplaintsByOfficerId } from "@/lib/complaint-service"
import type { Complaint, ComplaintStatus, ComplaintType } from "@/lib/types"

export default function MapPage() {
  const { user } = useAuth()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | "all">("all")
  const [typeFilter, setTypeFilter] = useState<ComplaintType | "all">("all")
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)

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

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((complaint) => complaint.status === statusFilter)
    }

    // Apply type filter
    if (typeFilter !== "all") {
      result = result.filter((complaint) => complaint.type === typeFilter)
    }

    setFilteredComplaints(result)
  }, [statusFilter, typeFilter, complaints])

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Complaint Map</h1>
          <p className="text-muted-foreground">View complaints by location and identify hotspots</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ComplaintStatus | "all")}>
            <SelectTrigger className="w-[150px]">
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
            <SelectTrigger className="w-[150px]">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="h-[600px]">
            <CardContent className="p-0 h-full">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
              ) : filteredComplaints.length > 0 ? (
                <div className="h-full w-full relative">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src="https://www.openstreetmap.org/export/embed.html?bbox=77.5%2C29.5%2C80.5%2C31.5&layer=mapnik"

                    className="absolute inset-0"
                  ></iframe>
                  <div className="absolute inset-0 pointer-events-none">
                    {filteredComplaints.map((complaint) => (
                      <div
                        key={complaint.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                        style={{
                          left: `${Math.random() * 80 + 10}%`,
                          top: `${Math.random() * 80 + 10}%`,
                        }}
                        onClick={() => setSelectedComplaint(complaint)}
                      >
                        <div
                          className={`
                          w-6 h-6 rounded-full flex items-center justify-center cursor-pointer
                          ${
                            complaint.status === "pending"
                              ? "bg-amber-500"
                              : complaint.status === "in_progress"
                                ? "bg-blue-500"
                                : "bg-green-500"
                          }
                          text-white
                        `}
                        >
                          <MapPin className="h-4 w-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex justify-center items-center h-full">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No complaints found with the selected filters</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle>Complaint Details</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {selectedComplaint ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedComplaint.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={selectedComplaint.status} />
                      <span className="text-sm text-muted-foreground capitalize">
                        {selectedComplaint.type.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-1">Description</div>
                    <p className="text-sm text-muted-foreground line-clamp-4">{selectedComplaint.description}</p>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-1">Location</div>
                    <p className="text-sm text-muted-foreground">{selectedComplaint.location.address}</p>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-1">Submitted By</div>
                    <p className="text-sm text-muted-foreground">{selectedComplaint.citizenName}</p>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-1">Date Submitted</div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedComplaint.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {selectedComplaint.assignedTo && (
                    <div>
                      <div className="text-sm font-medium mb-1">Assigned To</div>
                      <p className="text-sm text-muted-foreground">{selectedComplaint.assignedOfficerName}</p>
                    </div>
                  )}

                  <Button asChild className="w-full mt-4">
                    <Link href={`/dashboard/complaints/${selectedComplaint.id}`}>
                      View Full Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Select a complaint marker on the map to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
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

