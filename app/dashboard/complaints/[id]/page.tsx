"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle2, Clock, MapPin, ArrowLeft, MessageSquare, ImageIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getComplaintById, updateComplaintStatus, addCommentToComplaint } from "@/lib/complaint-service"
import type { Complaint, ComplaintStatus } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"

export default function ComplaintDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [newStatus, setNewStatus] = useState<ComplaintStatus | "">("")
  const [newComment, setNewComment] = useState("")
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  useEffect(() => {
    const fetchComplaint = async () => {
      try {
        const data = await getComplaintById(params.id)
        if (data) {
          setComplaint(data)
          setNewStatus(data.status)
        } else {
          setError("Complaint not found")
        }
      } catch (error) {
        console.error("Error fetching complaint:", error)
        setError("Failed to load complaint details")
      } finally {
        setLoading(false)
      }
    }

    fetchComplaint()
  }, [params.id])

  const handleStatusUpdate = async () => {
    if (!user || !complaint || !newStatus || newStatus === complaint.status) return

    setIsUpdatingStatus(true)
    try {
      await updateComplaintStatus(complaint.id, newStatus, user.uid, user.displayName || user.email || "Anonymous")

      toast({
        title: "Status updated",
        description: `Complaint status updated to ${newStatus.replace("_", " ")}`,
        variant: "default",
      })

      // Refresh complaint data
      const updatedComplaint = await getComplaintById(params.id)
      if (updatedComplaint) {
        setComplaint(updatedComplaint)
      }
    } catch (error) {
      console.error("Error updating status:", error)
      setError("Failed to update status")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleAddComment = async () => {
    if (!user || !complaint || !newComment.trim()) return

    setIsAddingComment(true)
    try {
      await addCommentToComplaint(
        complaint.id,
        newComment,
        user.uid,
        user.displayName || user.email || "Anonymous",
        user.role,
      )

      toast({
        title: "Comment added",
        description: "Your comment has been added to the complaint",
        variant: "default",
      })

      setNewComment("")

      // Refresh complaint data
      const updatedComplaint = await getComplaintById(params.id)
      if (updatedComplaint) {
        setComplaint(updatedComplaint)
      }
    } catch (error) {
      console.error("Error adding comment:", error)
      setError("Failed to add comment")
    } finally {
      setIsAddingComment(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (error || !complaint) {
    return (
      <Alert variant="destructive" className="max-w-3xl mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error || "Complaint not found"}</AlertDescription>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </Alert>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{complaint.title}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Submitted on {new Date(complaint.createdAt).toLocaleDateString()}</span>
            <span>•</span>
            <span className="capitalize">{complaint.type.replace("_", " ")}</span>
            <span>•</span>
            <StatusBadge status={complaint.status} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Complaint Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line">{complaint.description}</p>
            </CardContent>
          </Card>

          <Tabs defaultValue="comments">
            <TabsList>
              <TabsTrigger value="comments">
                <MessageSquare className="mr-2 h-4 w-4" />
                Comments
              </TabsTrigger>
              {complaint.imageUrls.length > 0 && (
                <TabsTrigger value="images">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Images
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="comments" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Discussion</CardTitle>
                  <CardDescription>
                    {complaint.comments.length} {complaint.comments.length === 1 ? "comment" : "comments"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {complaint.comments.length > 0 ? (
                    complaint.comments.map((comment) => (
                      <div key={comment.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium flex items-center gap-2">
                            {comment.userName}
                            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full capitalize">
                              {comment.userRole.replace("_", " ")}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <p className="text-sm">{comment.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-4">No comments yet</div>
                  )}
                </CardContent>
                <CardFooter>
                  <div className="w-full space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || isAddingComment}
                      className="ml-auto"
                    >
                      {isAddingComment ? "Adding..." : "Add Comment"}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
            {complaint.imageUrls.length > 0 && (
              <TabsContent value="images" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Images</CardTitle>
                    <CardDescription>
                      {complaint.imageUrls.length} {complaint.imageUrls.length === 1 ? "image" : "images"} attached
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center">
                      <div className="w-full h-64 md:h-80 mb-4 relative">
                        <img
                          src={complaint.imageUrls[activeImageIndex] || "/placeholder.svg"}
                          alt={`Complaint image ${activeImageIndex + 1}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      {complaint.imageUrls.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 w-full">
                          {complaint.imageUrls.map((url, index) => (
                            <button
                              key={index}
                              onClick={() => setActiveImageIndex(index)}
                              className={`h-16 w-16 flex-shrink-0 rounded-md overflow-hidden border-2 ${
                                index === activeImageIndex ? "border-primary" : "border-transparent"
                              }`}
                            >
                              <img
                                src={url || "/placeholder.svg"}
                                alt={`Thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <StatusBadge status={complaint.status} />
                <span className="text-sm text-muted-foreground">
                  Last updated: {new Date(complaint.updatedAt).toLocaleDateString()}
                </span>
              </div>

              {(user.role === "admin" || user.role === "municipal_officer") && (
                <div className="space-y-2">
                  <Select value={newStatus} onValueChange={(value) => setNewStatus(value as ComplaintStatus)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Update status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={!newStatus || newStatus === complaint.status || isUpdatingStatus}
                    className="w-full"
                  >
                    {isUpdatingStatus ? "Updating..." : "Update Status"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{complaint.location.address}</span>
              </div>
              <div className="aspect-video w-full bg-muted rounded-md overflow-hidden">
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${complaint.location.longitude - 0.01}%2C${complaint.location.latitude - 0.01}%2C${complaint.location.longitude + 0.01}%2C${complaint.location.latitude + 0.01}&layer=mapnik&marker=${complaint.location.latitude}%2C${complaint.location.longitude}`}
                ></iframe>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Submitted By</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <div className="font-medium">{complaint.citizenName}</div>
                {complaint.assignedTo && (
                  <div className="mt-4">
                    <div className="text-muted-foreground mb-1">Assigned To:</div>
                    <div className="font-medium">{complaint.assignedOfficerName}</div>
                  </div>
                )}
              </div>
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

