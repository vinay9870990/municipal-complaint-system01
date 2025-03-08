"use client"

import Link from "next/link"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertCircle, Star, ThumbsUp } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { submitFeedback, getFeedbackByUserId, getAllFeedback } from "@/lib/firebase-service"
import type { Feedback } from "@/lib/types"

export default function FeedbackPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [feedbackText, setFeedbackText] = useState("")
  const [rating, setRating] = useState(0)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchFeedback = async () => {
      if (!user) return

      try {
        let fetchedFeedback: Feedback[] = []

        if (user.role === "admin" || user.role === "municipal_officer") {
          fetchedFeedback = await getAllFeedback()
        } else {
          fetchedFeedback = await getFeedbackByUserId(user.uid)
        }

        setFeedbackList(fetchedFeedback)
      } catch (error) {
        console.error("Error fetching feedback:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFeedback()
  }, [user])

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (rating === 0) {
      setError("Please select a rating")
      return
    }

    if (!feedbackText.trim()) {
      setError("Please provide feedback comments")
      return
    }

    setIsSubmitting(true)

    try {
      if (!user) throw new Error("User not authenticated")

      await submitFeedback(
        user.uid,
        user.displayName || user.email || "Anonymous",
        null, // Not related to a specific complaint
        rating,
        feedbackText,
      )

      setFeedbackText("")
      setRating(0)

      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback!",
      })

      // Refresh feedback list
      const newFeedback = await getFeedbackByUserId(user.uid)
      setFeedbackList(newFeedback)
    } catch (error: any) {
      console.error("Error submitting feedback:", error)
      setError(error.message || "Failed to submit feedback")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) {
    router.push("/auth/login")
    return null
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Feedback</h1>
        <p className="text-muted-foreground">
          {user.role === "admin" || user.role === "municipal_officer"
            ? "View feedback from citizens"
            : "Share your experience with our municipal complaint system"}
        </p>
      </div>

      {user.role === "citizen" && (
        <Card className="mb-8">
          <form onSubmit={handleSubmitFeedback}>
            <CardHeader>
              <CardTitle>Submit Feedback</CardTitle>
              <CardDescription>Help us improve our services by sharing your experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button key={value} type="button" onClick={() => setRating(value)} className="focus:outline-none">
                      <Star
                        className={`h-8 w-8 ${value <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">Your Feedback</Label>
                <Textarea
                  id="feedback"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Share your thoughts about our system..."
                  rows={4}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {user.role === "admin" || user.role === "municipal_officer" ? "All Feedback" : "Your Previous Feedback"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : feedbackList.length > 0 ? (
            <div className="space-y-4">
              {feedbackList.map((feedback) => (
                <div key={feedback.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">
                        {user.role === "admin" || user.role === "municipal_officer" ? feedback.userName : "You"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(feedback.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Star
                          key={value}
                          className={`h-5 w-5 ${
                            value <= feedback.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-2">{feedback.comment}</p>
                  {feedback.complaintId && (
                    <div className="mt-2">
                      <Button variant="link" size="sm" asChild className="h-auto p-0">
                        <Link href={`/dashboard/complaints/${feedback.complaintId}`}>View Related Complaint</Link>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ThumbsUp className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {user.role === "admin" || user.role === "municipal_officer"
                  ? "No feedback has been submitted yet"
                  : "You haven't submitted any feedback yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

