export type UserRole = "citizen" | "municipal_officer" | "admin"

export interface User {
  uid: string
  email: string | null
  displayName: string | null
  role: UserRole
  phoneNumber?: string | null
  address?: string | null
  profileImageUrl?: string | null
  createdAt?: Date
}

export type ComplaintStatus = "pending" | "in_progress" | "resolved"

export type ComplaintType = "road" | "water" | "garbage" | "electricity" | "sewage" | "public_property" | "other"

export interface Location {
  latitude: number
  longitude: number
  address: string
}

export interface Complaint {
  id: string
  title: string
  description: string
  type: ComplaintType
  status: ComplaintStatus
  location: Location
  imageUrls: string[]
  citizenId: string
  citizenName: string
  assignedTo?: string
  assignedOfficerName?: string
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
  comments: Comment[]
  hasFeedback?: boolean
  feedbackId?: string
  feedbackRating?: number
}

export interface Comment {
  id: string
  text: string
  userId: string
  userName: string
  userRole: UserRole
  createdAt: Date
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: string
  referenceId: string
  read: boolean
  createdAt: Date
  readAt?: Date
}

export interface Feedback {
  id: string
  userId: string
  userName: string
  complaintId: string | null
  rating: number
  comment: string
  createdAt: Date
}

export interface ComplaintStats {
  total: number
  pending: number
  inProgress: number
  resolved: number
  byType: Record<ComplaintType, number>
  averageResolutionTime: number // in days
}

