"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, MapPin, Upload } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createComplaint } from "@/lib/complaint-service"
import type { ComplaintType, Location } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"

export default function NewComplaintPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<ComplaintType | "">("")
  const [address, setAddress] = useState("")
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser")
      return
    }

    setIsGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude)
        setLongitude(position.coords.longitude)
        setIsGettingLocation(false)

        // Try to get address from coordinates using reverse geocoding
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`,
        )
          .then((response) => response.json())
          .then((data) => {
            if (data.display_name) {
              setAddress(data.display_name)
            }
          })
          .catch((error) => {
            console.error("Error getting address:", error)
          })
      },
      (error) => {
        setIsGettingLocation(false)
        setError(`Error getting location: ${error.message}`)
      },
    )
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files)
      setImages((prev) => [...prev, ...fileArray])
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!user) {
      setError("You must be logged in to submit a complaint")
      return
    }

    if (!title || !description || !type || !address) {
      setError("Please fill in all required fields")
      return
    }

    if (!latitude || !longitude) {
      setError("Please provide a location")
      return
    }

    const location: Location = {
      latitude,
      longitude,
      address,
    }

    setIsSubmitting(true)

    try {
      await createComplaint(
        title,
        description,
        type as ComplaintType,
        location,
        user.uid,
        user.displayName || user.email || "Anonymous",
        images,
      )

      toast({
        title: "Complaint submitted",
        description: "Your complaint has been successfully submitted.",
        variant: "default",
      })

      router.push("/dashboard/complaints")
    } catch (error: any) {
      console.error("Error submitting complaint:", error)
      setError(error.message || "Failed to submit complaint")
      setIsSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Submit a New Complaint</h1>
        <p className="text-muted-foreground">Provide details about the issue you want to report</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Complaint Details</CardTitle>
            <CardDescription>Fill in the information about the issue you're experiencing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Brief title of the complaint"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Detailed description of the issue"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Complaint Type</Label>
              <Select value={type} onValueChange={(value) => setType(value as ComplaintType)}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select complaint type" />
                </SelectTrigger>
                <SelectContent>
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

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="flex gap-2">
                <Input
                  id="address"
                  placeholder="Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="flex-1"
                  required
                />
                <Button type="button" variant="outline" onClick={handleGetCurrentLocation} disabled={isGettingLocation}>
                  <MapPin className="mr-2 h-4 w-4" />
                  {isGettingLocation ? "Getting location..." : "Get Current Location"}
                </Button>
              </div>
              {latitude && longitude && (
                <div className="text-sm text-muted-foreground mt-1">
                  Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="images">Images (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
                <Button type="button" variant="outline" onClick={() => document.getElementById("images")?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Images
                </Button>
                <span className="text-sm text-muted-foreground">
                  {images.length} {images.length === 1 ? "file" : "files"} selected
                </span>
              </div>
              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(image) || "/placeholder.svg"}
                        alt={`Preview ${index}`}
                        className="h-24 w-full object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Complaint"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}

