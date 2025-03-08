"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertCircle, Camera, User, Mail, Phone, MapPin, Lock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import {
  getUserProfile,
  updateUserProfile,
  updateUserEmail,
  updateUserPassword,
  uploadProfileImage,
} from "@/lib/firebase-service"

export default function ProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState({
    displayName: "",
    email: "",
    phoneNumber: "",
    address: "",
    profileImageUrl: "",
  })

  const [formData, setFormData] = useState({
    displayName: "",
    phoneNumber: "",
    address: "",
  })

  const [emailData, setEmailData] = useState({
    newEmail: "",
    currentPassword: "",
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [error, setError] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [isChangingEmail, setIsChangingEmail] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return

      try {
        const profile = await getUserProfile(user.uid)
        if (profile) {
          setProfileData({
            displayName: profile.displayName || "",
            email: profile.email || "",
            phoneNumber: profile.phoneNumber || "",
            address: profile.address || "",
            profileImageUrl: profile.profileImageUrl || "",
          })

          setFormData({
            displayName: profile.displayName || "",
            phoneNumber: profile.phoneNumber || "",
            address: profile.address || "",
          })

          setEmailData({
            newEmail: profile.email || "",
            currentPassword: "",
          })
        }
      } catch (error) {
        console.error("Error fetching user profile:", error)
        setError("Failed to load profile data")
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [user])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsUpdating(true)

    try {
      if (!user) throw new Error("User not authenticated")

      await updateUserProfile(user.uid, {
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
      })

      setProfileData({
        ...profileData,
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
      })

      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      })
    } catch (error: any) {
      console.error("Error updating profile:", error)
      setError(error.message || "Failed to update profile")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!emailData.newEmail) {
      setError("Email cannot be empty")
      return
    }

    if (!emailData.currentPassword) {
      setError("Current password is required to change email")
      return
    }

    setIsChangingEmail(true)

    try {
      if (!user) throw new Error("User not authenticated")

      await updateUserEmail(user.uid, emailData.newEmail, emailData.currentPassword)

      setProfileData({
        ...profileData,
        email: emailData.newEmail,
      })

      setEmailData({
        ...emailData,
        currentPassword: "",
      })

      toast({
        title: "Email updated",
        description: "Your email address has been updated successfully.",
      })
    } catch (error: any) {
      console.error("Error updating email:", error)
      setError(error.message || "Failed to update email")
    } finally {
      setIsChangingEmail(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!passwordData.currentPassword) {
      setError("Current password is required")
      return
    }

    if (!passwordData.newPassword) {
      setError("New password cannot be empty")
      return
    }

    if (passwordData.newPassword.length < 6) {
      setError("New password must be at least 6 characters")
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match")
      return
    }

    setIsChangingPassword(true)

    try {
      if (!user) throw new Error("User not authenticated")

      await updateUserPassword(user.uid, passwordData.currentPassword, passwordData.newPassword)

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      })
    } catch (error: any) {
      console.error("Error updating password:", error)
      setError(error.message || "Failed to update password")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    setIsUploadingImage(true)

    try {
      if (!user) throw new Error("User not authenticated")

      const imageUrl = await uploadProfileImage(user.uid, file)

      setProfileData({
        ...profileData,
        profileImageUrl: imageUrl,
      })

      toast({
        title: "Profile image updated",
        description: "Your profile image has been updated successfully.",
      })
    } catch (error: any) {
      console.error("Error uploading profile image:", error)
      toast({
        title: "Error",
        description: "Failed to upload profile image",
        variant: "destructive",
      })
    } finally {
      setIsUploadingImage(false)
    }
  }

  if (!user) {
    router.push("/auth/login")
    return null
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account information and preferences</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                {profileData.profileImageUrl ? (
                  <AvatarImage src={profileData.profileImageUrl} alt={profileData.displayName} />
                ) : (
                  <AvatarFallback className="text-2xl">
                    {profileData.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="absolute -bottom-2 -right-2">
                <Input
                  type="file"
                  accept="image/*"
                  id="profile-image"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isUploadingImage}
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 rounded-full"
                  onClick={() => document.getElementById("profile-image")?.click()}
                  disabled={isUploadingImage}
                >
                  <Camera className="h-4 w-4" />
                  <span className="sr-only">Upload profile image</span>
                </Button>
              </div>
            </div>
            <div>
              <CardTitle>{profileData.displayName || "User"}</CardTitle>
              <CardDescription>
                {profileData.email}
                <div className="mt-1 capitalize">{user.role.replace("_", " ")}</div>
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <form onSubmit={handleProfileUpdate}>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="displayName">
                      <User className="h-4 w-4 inline mr-2" />
                      Full Name
                    </Label>
                    <Input
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="Your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">
                      <Phone className="h-4 w-4 inline mr-2" />
                      Phone Number
                    </Label>
                    <Input
                      id="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="Your phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">
                      <MapPin className="h-4 w-4 inline mr-2" />
                      Address
                    </Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Your address"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? "Updating..." : "Update Profile"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="email">
            <Card>
              <form onSubmit={handleEmailUpdate}>
                <CardHeader>
                  <CardTitle>Email Address</CardTitle>
                  <CardDescription>Change your email address</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="newEmail">
                      <Mail className="h-4 w-4 inline mr-2" />
                      New Email Address
                    </Label>
                    <Input
                      id="newEmail"
                      type="email"
                      value={emailData.newEmail}
                      onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
                      placeholder="your.new.email@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentPasswordEmail">
                      <Lock className="h-4 w-4 inline mr-2" />
                      Current Password
                    </Label>
                    <Input
                      id="currentPasswordEmail"
                      type="password"
                      value={emailData.currentPassword}
                      onChange={(e) => setEmailData({ ...emailData, currentPassword: e.target.value })}
                      placeholder="Enter your current password"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isChangingEmail}>
                    {isChangingEmail ? "Updating..." : "Update Email"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="password">
            <Card>
              <form onSubmit={handlePasswordUpdate}>
                <CardHeader>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>Change your password</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder="Enter your current password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="Enter your new password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="Confirm your new password"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isChangingPassword}>
                    {isChangingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

