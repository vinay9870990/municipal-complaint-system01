"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarTrigger,
  SidebarMenuBadge,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Home, FileText, Map, BarChart3, Users, LogOut, PlusCircle, Bell, ThumbsUp, User } from "lucide-react"
import Link from "next/link"
import { getUnreadNotificationsCount } from "@/lib/firebase-service"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchNotificationsCount = async () => {
      if (!user) return

      try {
        const count = await getUnreadNotificationsCount(user.uid)
        setUnreadNotifications(count)
      } catch (error) {
        console.error("Error fetching notifications count:", error)
      } finally {
        setNotificationsLoading(false)
      }
    }

    fetchNotificationsCount()

    // Set up a timer to refresh the count every minute
    const intervalId = setInterval(fetchNotificationsCount, 60000)

    return () => clearInterval(intervalId)
  }, [user])

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2 px-4 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
              </div>
              <div className="flex flex-col">
                <span className="font-medium">{user.displayName || "User"}</span>
                <span className="text-xs text-muted-foreground capitalize">{user.role.replace("_", " ")}</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/dashboard">
                        <Home className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/dashboard/complaints">
                        <FileText className="h-4 w-4" />
                        <span>Complaints</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/dashboard/map">
                        <Map className="h-4 w-4" />
                        <span>Map View</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {(user.role === "admin" || user.role === "municipal_officer") && (
                    <>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <Link href="/dashboard/analytics">
                            <BarChart3 className="h-4 w-4" />
                            <span>Analytics</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {user.role === "admin" && (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild>
                            <Link href="/dashboard/users">
                              <Users className="h-4 w-4" />
                              <span>User Management</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                    </>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {user.role === "citizen" && (
              <SidebarGroup>
                <SidebarGroupLabel>Actions</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link href="/dashboard/complaints/new">
                          <PlusCircle className="h-4 w-4" />
                          <span>New Complaint</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            <SidebarGroup>
              <SidebarGroupLabel>Settings</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/dashboard/profile">
                        <User className="h-4 w-4" />
                        <span>Profile Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/dashboard/notifications">
                        <Bell className="h-4 w-4" />
                        <span>Notifications</span>
                        {!notificationsLoading && unreadNotifications > 0 && (
                          <SidebarMenuBadge>{unreadNotifications}</SidebarMenuBadge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/dashboard/feedback">
                        <ThumbsUp className="h-4 w-4" />
                        <span>Feedback</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 items-center border-b px-4 lg:h-16">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-4">
              <Button variant="outline" size="sm" asChild className="hidden md:flex">
                <Link href="/dashboard/complaints/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Complaint
                </Link>
              </Button>

              <Button variant="ghost" size="icon" asChild className="relative">
                <Link href="/dashboard/notifications">
                  <Bell className="h-5 w-5" />
                  {!notificationsLoading && unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                  <span className="sr-only">Notifications</span>
                </Link>
              </Button>

              <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard/profile">
                  <User className="h-5 w-5" />
                  <span className="sr-only">Profile</span>
                </Link>
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}

