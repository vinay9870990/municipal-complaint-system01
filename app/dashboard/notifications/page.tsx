"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell, CheckCircle, Clock, FileText, MessageSquare, Trash2, CheckCheck } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "@/lib/firebase-service"
import type { Notification } from "@/lib/types"

export default function NotificationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false)

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return

      try {
        const fetchedNotifications = await getUserNotifications(user.uid)
        setNotifications(fetchedNotifications)
      } catch (error) {
        console.error("Notifications Not Found:", error)
        toast({
          //title: "Error",
          description: " No Notification ",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [user, toast])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId)

      // Update local state
      setNotifications(
        notifications.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification,
        ),
      )

      toast({
        title: "Notification marked as read",
        description: "The notification has been marked as read",
      })
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      })
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user) return

    setIsMarkingAllRead(true)

    try {
      await markAllNotificationsAsRead(user.uid)

      // Update local state
      setNotifications(notifications.map((notification) => ({ ...notification, read: true })))

      toast({
        title: "All notifications marked as read",
        description: "All notifications have been marked as read",
      })
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      })
    } finally {
      setIsMarkingAllRead(false)
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId)

      // Update local state
      setNotifications(notifications.filter((notification) => notification.id !== notificationId))

      toast({
        title: "Notification deleted",
        description: "The notification has been deleted",
      })
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      })
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "complaint_new":
        return <FileText className="h-5 w-5 text-blue-500" />
      case "complaint_update":
        return <Clock className="h-5 w-5 text-amber-500" />
      case "complaint_resolved":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "complaint_comment":
        return <MessageSquare className="h-5 w-5 text-purple-500" />
      case "complaint_assigned":
        return <FileText className="h-5 w-5 text-indigo-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  if (!user) {
    router.push("/auth/login")
    return null
  }

  const unreadNotifications = notifications.filter((notification) => !notification.read)
  const readNotifications = notifications.filter((notification) => notification.read)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">Stay updated with your complaint status and system alerts</p>
        </div>

        {unreadNotifications.length > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead} disabled={isMarkingAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            {isMarkingAllRead ? "Marking..." : "Mark all as read"}
          </Button>
        )}
      </div>

      <Tabs defaultValue="unread" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="unread" className="relative">
            Unread
            {unreadNotifications.length > 0 && (
              <span className="ml-2 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs">
                {unreadNotifications.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="unread">
          <Card>
            <CardHeader>
              <CardTitle>Unread Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
              ) : unreadNotifications.length > 0 ? (
                <div className="space-y-4">
                  {unreadNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onDelete={handleDeleteNotification}
                      getIcon={getNotificationIcon}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">You have no unread notifications</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
              ) : notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onDelete={handleDeleteNotification}
                      getIcon={getNotificationIcon}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">You have no notifications</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  getIcon: (type: string) => React.ReactNode
}

function NotificationItem({ notification, onMarkAsRead, onDelete, getIcon }: NotificationItemProps) {
  const formattedDate = new Date(notification.createdAt).toLocaleString()

  return (
    <div
      className={`
      relative rounded-lg border p-4 
      ${notification.read ? "bg-background" : "bg-muted/30"}
    `}
    >
      <div className="flex items-start gap-4">
        <div className="mt-0.5">{getIcon(notification.type)}</div>
        <div className="flex-1">
          <div className="font-medium">{notification.title}</div>
          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs text-muted-foreground">{formattedDate}</span>
            {notification.referenceId && (
              <Button variant="link" size="sm" asChild className="h-auto p-0">
                <Link href={`/dashboard/complaints/${notification.referenceId}`}>View Details</Link>
              </Button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!notification.read && (
            <Button variant="ghost" size="icon" onClick={() => onMarkAsRead(notification.id)} className="h-8 w-8">
              <CheckCircle className="h-4 w-4" />
              <span className="sr-only">Mark as read</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(notification.id)}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

