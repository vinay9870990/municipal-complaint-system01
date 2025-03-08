import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
  orderBy,
  limit,
  deleteDoc,
  setDoc,
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth"
import { auth, db, storage } from "./firebase"
import type { Complaint, ComplaintStatus, ComplaintType, Notification, Feedback } from "./types"

// User Authentication Services
export const registerUser = async (email: string, password: string, displayName: string, role: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Update profile with display name
    await updateProfile(user, { displayName })

    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email,
      displayName,
      role,
      phoneNumber: null,
      address: null,
      profileImageUrl: null,
      createdAt: serverTimestamp(),
    })

    return user
  } catch (error) {
    console.error("Error registering user:", error)
    throw error
  }
}

export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return userCredential.user
  } catch (error) {
    console.error("Error logging in:", error)
    throw error
  }
}

export const logoutUser = async () => {
  try {
    await signOut(auth)
  } catch (error) {
    console.error("Error logging out:", error)
    throw error
  }
}

export const resetUserPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (error) {
    console.error("Error resetting password:", error)
    throw error
  }
}

// User Profile Services
export const getUserProfile = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId))
    if (userDoc.exists()) {
      const userData = userDoc.data()
      return {
        uid: userId,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        phoneNumber: userData.phoneNumber || null,
        address: userData.address || null,
        profileImageUrl: userData.profileImageUrl || null,
        createdAt: userData.createdAt?.toDate() || new Date(),
      }
    }
    return null
  } catch (error) {
    console.error("Error getting user profile:", error)
    throw error
  }
}

export const updateUserProfile = async (
  userId: string,
  data: {
    displayName?: string
    phoneNumber?: string
    address?: string
  },
) => {
  try {
    const userRef = doc(db, "users", userId)

    // Update Firestore document
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })

    // Update Firebase Auth profile if displayName is provided
    if (data.displayName && auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: data.displayName,
      })
    }

    return true
  } catch (error) {
    console.error("Error updating user profile:", error)
    throw error
  }
}

export const updateUserEmail = async (userId: string, newEmail: string, currentPassword: string) => {
  try {
    if (!auth.currentUser) {
      throw new Error("No authenticated user")
    }

    // Re-authenticate user before changing email
    const credential = EmailAuthProvider.credential(auth.currentUser.email || "", currentPassword)

    await reauthenticateWithCredential(auth.currentUser, credential)

    // Update email in Firebase Auth
    await updateEmail(auth.currentUser, newEmail)

    // Update email in Firestore
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      email: newEmail,
      updatedAt: serverTimestamp(),
    })

    return true
  } catch (error) {
    console.error("Error updating user email:", error)
    throw error
  }
}

export const updateUserPassword = async (userId: string, currentPassword: string, newPassword: string) => {
  try {
    if (!auth.currentUser) {
      throw new Error("No authenticated user")
    }

    // Re-authenticate user before changing password
    const credential = EmailAuthProvider.credential(auth.currentUser.email || "", currentPassword)

    await reauthenticateWithCredential(auth.currentUser, credential)

    // Update password in Firebase Auth
    await updatePassword(auth.currentUser, newPassword)

    return true
  } catch (error) {
    console.error("Error updating user password:", error)
    throw error
  }
}

export const uploadProfileImage = async (userId: string, imageFile: File) => {
  try {
    // Upload image to Firebase Storage
    const storageRef = ref(storage, `profile_images/${userId}_${Date.now()}`)
    const snapshot = await uploadBytes(storageRef, imageFile)
    const downloadUrl = await getDownloadURL(snapshot.ref)

    // Update user profile with image URL
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      profileImageUrl: downloadUrl,
      updatedAt: serverTimestamp(),
    })

    // Update Firebase Auth profile
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, {
        photoURL: downloadUrl,
      })
    }

    return downloadUrl
  } catch (error) {
    console.error("Error uploading profile image:", error)
    throw error
  }
}

// Complaint Services
export const createComplaint = async (
  title: string,
  description: string,
  type: ComplaintType,
  location: { latitude: number; longitude: number; address: string },
  citizenId: string,
  citizenName: string,
  imageFiles?: File[],
): Promise<string> => {
  try {
    // Upload images if provided
    const imageUrls: string[] = []

    if (imageFiles && imageFiles.length > 0) {
      for (const file of imageFiles) {
        const storageRef = ref(storage, `complaints/${Date.now()}_${file.name}`)
        const snapshot = await uploadBytes(storageRef, file)
        const downloadUrl = await getDownloadURL(snapshot.ref)
        imageUrls.push(downloadUrl)
      }
    }

    // Create complaint document
    const complaintData = {
      title,
      description,
      type,
      status: "pending" as ComplaintStatus,
      location,
      imageUrls,
      citizenId,
      citizenName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      comments: [],
    }

    const docRef = await addDoc(collection(db, "complaints"), complaintData)

    // Create notification for admin and municipal officers
    await createNotificationForAdminsAndOfficers(
      `New complaint submitted: ${title}`,
      `A new complaint has been submitted by ${citizenName}`,
      "complaint_new",
      docRef.id,
    )

    return docRef.id
  } catch (error) {
    console.error("Error creating complaint:", error)
    throw error
  }
}

export const getComplaintById = async (id: string): Promise<Complaint | null> => {
  try {
    const docRef = doc(db, "complaints", id)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        title: data.title,
        description: data.description,
        type: data.type,
        status: data.status,
        location: data.location,
        imageUrls: data.imageUrls || [],
        citizenId: data.citizenId,
        citizenName: data.citizenName,
        assignedTo: data.assignedTo,
        assignedOfficerName: data.assignedOfficerName,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        resolvedAt: data.resolvedAt?.toDate() || undefined,
        comments: (data.comments || []).map((comment: any) => ({
          ...comment,
          createdAt: comment.createdAt?.toDate() || new Date(),
        })),
      }
    } else {
      return null
    }
  } catch (error) {
    console.error("Error getting complaint:", error)
    throw error
  }
}

export const getComplaintsByCitizenId = async (citizenId: string): Promise<Complaint[]> => {
  try {
    const q = query(collection(db, "complaints"), where("citizenId", "==", citizenId), orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(q)
    const complaints: Complaint[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      complaints.push({
        id: doc.id,
        title: data.title,
        description: data.description,
        type: data.type,
        status: data.status,
        location: data.location,
        imageUrls: data.imageUrls || [],
        citizenId: data.citizenId,
        citizenName: data.citizenName,
        assignedTo: data.assignedTo,
        assignedOfficerName: data.assignedOfficerName,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        resolvedAt: data.resolvedAt?.toDate() || undefined,
        comments: (data.comments || []).map((comment: any) => ({
          ...comment,
          createdAt: comment.createdAt?.toDate() || new Date(),
        })),
      })
    })

    return complaints
  } catch (error) {
    console.error("Error getting citizen complaints:", error)
    throw error
  }
}

export const getComplaintsByOfficerId = async (officerId: string): Promise<Complaint[]> => {
  try {
    const q = query(collection(db, "complaints"), where("assignedTo", "==", officerId), orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(q)
    const complaints: Complaint[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      complaints.push({
        id: doc.id,
        title: data.title,
        description: data.description,
        type: data.type,
        status: data.status,
        location: data.location,
        imageUrls: data.imageUrls || [],
        citizenId: data.citizenId,
        citizenName: data.citizenName,
        assignedTo: data.assignedTo,
        assignedOfficerName: data.assignedOfficerName,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        resolvedAt: data.resolvedAt?.toDate() || undefined,
        comments: (data.comments || []).map((comment: any) => ({
          ...comment,
          createdAt: comment.createdAt?.toDate() || new Date(),
        })),
      })
    })

    return complaints
  } catch (error) {
    console.error("Error getting officer complaints:", error)
    throw error
  }
}

export const getAllComplaints = async (limitCount?: number): Promise<Complaint[]> => {
  try {
    let q = query(collection(db, "complaints"), orderBy("createdAt", "desc"))

    if (limitCount) {
      q = query(q, limit(limitCount))
    }

    const querySnapshot = await getDocs(q)
    const complaints: Complaint[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      complaints.push({
        id: doc.id,
        title: data.title,
        description: data.description,
        type: data.type,
        status: data.status,
        location: data.location,
        imageUrls: data.imageUrls || [],
        citizenId: data.citizenId,
        citizenName: data.citizenName,
        assignedTo: data.assignedTo,
        assignedOfficerName: data.assignedOfficerName,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        resolvedAt: data.resolvedAt?.toDate() || undefined,
        comments: (data.comments || []).map((comment: any) => ({
          ...comment,
          createdAt: comment.createdAt?.toDate() || new Date(),
        })),
      })
    })

    return complaints
  } catch (error) {
    console.error("Error getting all complaints:", error)
    throw error
  }
}

export const updateComplaintStatus = async (
  complaintId: string,
  status: ComplaintStatus,
  officerId?: string,
  officerName?: string,
): Promise<void> => {
  try {
    const complaintRef = doc(db, "complaints", complaintId)
    const complaintSnap = await getDoc(complaintRef)

    if (!complaintSnap.exists()) {
      throw new Error("Complaint not found")
    }

    const complaintData = complaintSnap.data()

    const updateData: any = {
      status,
      updatedAt: serverTimestamp(),
    }

    if (status === "in_progress" && officerId && officerName) {
      updateData.assignedTo = officerId
      updateData.assignedOfficerName = officerName
    }

    if (status === "resolved") {
      updateData.resolvedAt = serverTimestamp()
    }

    await updateDoc(complaintRef, updateData)

    // Create notification for the citizen
    let notificationMessage = ""
    if (status === "in_progress") {
      notificationMessage = `Your complaint "${complaintData.title}" is now being processed by ${officerName}`
    } else if (status === "resolved") {
      notificationMessage = `Your complaint "${complaintData.title}" has been resolved`
    }

    if (notificationMessage) {
      await createNotification(
        complaintData.citizenId,
        `Complaint status updated to ${status.replace("_", " ")}`,
        notificationMessage,
        "complaint_update",
        complaintId,
      )
    }

    // If assigned to an officer, notify them
    if (status === "in_progress" && officerId) {
      await createNotification(
        officerId,
        "Complaint assigned to you",
        `You have been assigned to handle the complaint: ${complaintData.title}`,
        "complaint_assigned",
        complaintId,
      )
    }
  } catch (error) {
    console.error("Error updating complaint status:", error)
    throw error
  }
}

export const addCommentToComplaint = async (
  complaintId: string,
  text: string,
  userId: string,
  userName: string,
  userRole: string,
): Promise<void> => {
  try {
    const complaintRef = doc(db, "complaints", complaintId)
    const complaintSnap = await getDoc(complaintRef)

    if (!complaintSnap.exists()) {
      throw new Error("Complaint not found")
    }

    const complaintData = complaintSnap.data()
    const comments = complaintData.comments || []

    const newComment = {
      id: `comment_${Date.now()}`,
      text,
      userId,
      userName,
      userRole,
      createdAt: serverTimestamp(),
    }

    comments.push(newComment)

    await updateDoc(complaintRef, {
      comments,
      updatedAt: serverTimestamp(),
    })

    // Create notification for the citizen if comment is from officer/admin
    if (userRole !== "citizen" && userId !== complaintData.citizenId) {
      await createNotification(
        complaintData.citizenId,
        "New comment on your complaint",
        `${userName} commented on your complaint: "${complaintData.title}"`,
        "complaint_comment",
        complaintId,
      )
    }

    // Create notification for the assigned officer if comment is from citizen
    if (userRole === "citizen" && complaintData.assignedTo && userId !== complaintData.assignedTo) {
      await createNotification(
        complaintData.assignedTo,
        "New comment on assigned complaint",
        `${userName} commented on the complaint: "${complaintData.title}"`,
        "complaint_comment",
        complaintId,
      )
    }
  } catch (error) {
    console.error("Error adding comment:", error)
    throw error
  }
}

export const deleteComplaint = async (complaintId: string): Promise<void> => {
  try {
    // First get the complaint to delete image references
    const complaintRef = doc(db, "complaints", complaintId)
    const complaintSnap = await getDoc(complaintRef)

    if (!complaintSnap.exists()) {
      throw new Error("Complaint not found")
    }

    const complaintData = complaintSnap.data()

    // Delete images from storage if they exist
    if (complaintData.imageUrls && complaintData.imageUrls.length > 0) {
      for (const imageUrl of complaintData.imageUrls) {
        try {
          // Extract the path from the URL
          const imagePath = imageUrl.split("?")[0].split("/o/")[1]
          if (imagePath) {
            const decodedPath = decodeURIComponent(imagePath)
            const imageRef = ref(storage, decodedPath)
            await deleteObject(imageRef)
          }
        } catch (imageError) {
          console.error("Error deleting image:", imageError)
          // Continue with other images even if one fails
        }
      }
    }

    // Delete the complaint document
    await deleteDoc(complaintRef)

    // Create notification for the citizen
    await createNotification(
      complaintData.citizenId,
      "Complaint deleted",
      `Your complaint "${complaintData.title}" has been deleted`,
      "complaint_deleted",
      "",
    )
  } catch (error) {
    console.error("Error deleting complaint:", error)
    throw error
  }
}

// Notification Services
export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string,
  referenceId: string,
): Promise<string> => {
  try {
    const notificationData = {
      userId,
      title,
      message,
      type,
      referenceId,
      read: false,
      createdAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, "notifications"), notificationData)
    return docRef.id
  } catch (error) {
    console.error("Error creating notification:", error)
    throw error
  }
}

export const createNotificationForAdminsAndOfficers = async (
  title: string,
  message: string,
  type: string,
  referenceId: string,
): Promise<void> => {
  try {
    // Get all admin and municipal officer users
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("role", "in", ["admin", "municipal_officer"]))

    const querySnapshot = await getDocs(q)

    // Create a notification for each admin and officer
    const promises = querySnapshot.docs.map((doc) => {
      const userData = doc.data()
      return createNotification(userData.uid, title, message, type, referenceId)
    })

    await Promise.all(promises)
  } catch (error) {
    console.error("Error creating notifications for admins and officers:", error)
    throw error
  }
}

export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const q = query(collection(db, "notifications"), where("userId", "==", userId), orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(q)
    const notifications: Notification[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      notifications.push({
        id: doc.id,
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        referenceId: data.referenceId,
        read: data.read,
        createdAt: data.createdAt?.toDate() || new Date(),
      })
    })

    return notifications
  } catch (error) {
    console.error("Error getting user notifications:", error)
    throw error
  }
}

export const getUnreadNotificationsCount = async (userId: string): Promise<number> => {
  try {
    const q = query(collection(db, "notifications"), where("userId", "==", userId), where("read", "==", false))

    const querySnapshot = await getDocs(q)
    return querySnapshot.size
  } catch (error) {
    console.error("Error getting unread notifications count:", error)
    throw error
  }
}

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(db, "notifications", notificationId)
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    throw error
  }
}

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const q = query(collection(db, "notifications"), where("userId", "==", userId), where("read", "==", false))

    const querySnapshot = await getDocs(q)

    const batch = db.batch()
    querySnapshot.forEach((doc) => {
      const notificationRef = doc.ref
      batch.update(notificationRef, {
        read: true,
        readAt: serverTimestamp(),
      })
    })

    await batch.commit()
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    throw error
  }
}

export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "notifications", notificationId))
  } catch (error) {
    console.error("Error deleting notification:", error)
    throw error
  }
}

// Feedback Services
export const submitFeedback = async (
  userId: string,
  userName: string,
  complaintId: string | null,
  rating: number,
  comment: string,
): Promise<string> => {
  try {
    const feedbackData = {
      userId,
      userName,
      complaintId,
      rating,
      comment,
      createdAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, "feedback"), feedbackData)

    // If this is feedback for a specific complaint, update the complaint
    if (complaintId) {
      const complaintRef = doc(db, "complaints", complaintId)
      const complaintSnap = await getDoc(complaintRef)

      if (complaintSnap.exists()) {
        await updateDoc(complaintRef, {
          hasFeedback: true,
          feedbackId: docRef.id,
          feedbackRating: rating,
          updatedAt: serverTimestamp(),
        })
      }
    }

    return docRef.id
  } catch (error) {
    console.error("Error submitting feedback:", error)
    throw error
  }
}

export const getFeedbackById = async (feedbackId: string): Promise<Feedback | null> => {
  try {
    const docRef = doc(db, "feedback", feedbackId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        userId: data.userId,
        userName: data.userName,
        complaintId: data.complaintId,
        rating: data.rating,
        comment: data.comment,
        createdAt: data.createdAt?.toDate() || new Date(),
      }
    } else {
      return null
    }
  } catch (error) {
    console.error("Error getting feedback:", error)
    throw error
  }
}

export const getAllFeedback = async (limitCount?: number): Promise<Feedback[]> => {
  try {
    let q = query(collection(db, "feedback"), orderBy("createdAt", "desc"))

    if (limitCount) {
      q = query(q, limit(limitCount))
    }

    const querySnapshot = await getDocs(q)
    const feedback: Feedback[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      feedback.push({
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        complaintId: data.complaintId,
        rating: data.rating,
        comment: data.comment,
        createdAt: data.createdAt?.toDate() || new Date(),
      })
    })

    return feedback
  } catch (error) {
    console.error("Error getting all feedback:", error)
    throw error
  }
}

export const getFeedbackByUserId = async (userId: string): Promise<Feedback[]> => {
  try {
    const q = query(collection(db, "feedback"), where("userId", "==", userId), orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(q)
    const feedback: Feedback[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      feedback.push({
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        complaintId: data.complaintId,
        rating: data.rating,
        comment: data.comment,
        createdAt: data.createdAt?.toDate() || new Date(),
      })
    })

    return feedback
  } catch (error) {
    console.error("Error getting user feedback:", error)
    throw error
  }
}

export const getFeedbackByComplaintId = async (complaintId: string): Promise<Feedback[]> => {
  try {
    const q = query(collection(db, "feedback"), where("complaintId", "==", complaintId), orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(q)
    const feedback: Feedback[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      feedback.push({
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        complaintId: data.complaintId,
        rating: data.rating,
        comment: data.comment,
        createdAt: data.createdAt?.toDate() || new Date(),
      })
    })

    return feedback
  } catch (error) {
    console.error("Error getting complaint feedback:", error)
    throw error
  }
}

// Analytics Services
export const getComplaintStats = async () => {
  try {
    const complaintsRef = collection(db, "complaints")
    const querySnapshot = await getDocs(complaintsRef)

    let total = 0
    let pending = 0
    let inProgress = 0
    let resolved = 0
    let resolvedWithTimes = 0
    let totalResolutionTime = 0

    const byType: Record<string, number> = {
      road: 0,
      water: 0,
      garbage: 0,
      electricity: 0,
      sewage: 0,
      public_property: 0,
      other: 0,
    }

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      total++

      // Count by status
      if (data.status === "pending") pending++
      else if (data.status === "in_progress") inProgress++
      else if (data.status === "resolved") {
        resolved++

        // Calculate resolution time if both dates exist
        if (data.createdAt && data.resolvedAt) {
          const createdDate = data.createdAt.toDate()
          const resolvedDate = data.resolvedAt.toDate()
          const timeDiff = resolvedDate.getTime() - createdDate.getTime()
          const daysDiff = timeDiff / (1000 * 3600 * 24)

          totalResolutionTime += daysDiff
          resolvedWithTimes++
        }
      }

      // Count by type
      if (data.type && byType[data.type] !== undefined) {
        byType[data.type]++
      }
    })

    // Calculate average resolution time
    const averageResolutionTime = resolvedWithTimes > 0 ? totalResolutionTime / resolvedWithTimes : 0

    return {
      total,
      pending,
      inProgress,
      resolved,
      byType,
      averageResolutionTime,
    }
  } catch (error) {
    console.error("Error getting complaint stats:", error)
    throw error
  }
}

