"use server"

import { db, storage } from "./firebase"
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  limit,
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import type { Complaint, ComplaintStatus, ComplaintType, Location, Comment } from "./types"

// Helper to convert Firestore data to our Complaint type
const convertComplaintData = (id: string, data: any): Complaint => {
  return {
    id,
    title: data.title,
    description: data.description,
    type: data.type as ComplaintType,
    status: data.status as ComplaintStatus,
    location: data.location as Location,
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
}

// Create a new complaint
export async function createComplaint(
  title: string,
  description: string,
  type: ComplaintType,
  location: Location,
  citizenId: string,
  citizenName: string,
  imageFiles?: File[],
): Promise<string> {
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
    return docRef.id
  } catch (error) {
    console.error("Error creating complaint:", error)
    throw error
  }
}

// Get a complaint by ID
export async function getComplaintById(id: string): Promise<Complaint | null> {
  try {
    const docRef = doc(db, "complaints", id)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return convertComplaintData(docSnap.id, docSnap.data())
    } else {
      return null
    }
  } catch (error) {
    console.error("Error getting complaint:", error)
    throw error
  }
}

// Get complaints by citizen ID
export async function getComplaintsByCitizenId(citizenId: string): Promise<Complaint[]> {
  try {
    const q = query(collection(db, "complaints"), where("citizenId", "==", citizenId), orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(q)
    const complaints: Complaint[] = []

    querySnapshot.forEach((doc) => {
      complaints.push(convertComplaintData(doc.id, doc.data()))
    })

    return complaints
  } catch (error) {
    console.error("Error getting citizen complaints:", error)
    throw error
  }
}

// Get complaints by assigned officer ID
export async function getComplaintsByOfficerId(officerId: string): Promise<Complaint[]> {
  try {
    const q = query(collection(db, "complaints"), where("assignedTo", "==", officerId), orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(q)
    const complaints: Complaint[] = []

    querySnapshot.forEach((doc) => {
      complaints.push(convertComplaintData(doc.id, doc.data()))
    })

    return complaints
  } catch (error) {
    console.error("Error getting officer complaints:", error)
    throw error
  }
}

// Get all complaints (for admin)
export async function getAllComplaints(limitCount?: number): Promise<Complaint[]> {
  try {
    let q = query(collection(db, "complaints"), orderBy("createdAt", "desc"))

    if (limitCount) {
      q = query(q, limit(limitCount))
    }

    const querySnapshot = await getDocs(q)
    const complaints: Complaint[] = []

    querySnapshot.forEach((doc) => {
      complaints.push(convertComplaintData(doc.id, doc.data()))
    })

    return complaints
  } catch (error) {
    console.error("Error getting all complaints:", error)
    throw error
  }
}

// Update complaint status
export async function updateComplaintStatus(
  complaintId: string,
  status: ComplaintStatus,
  officerId?: string,
  officerName?: string,
): Promise<void> {
  try {
    const complaintRef = doc(db, "complaints", complaintId)

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
  } catch (error) {
    console.error("Error updating complaint status:", error)
    throw error
  }
}

// Add a comment to a complaint
export async function addCommentToComplaint(
  complaintId: string,
  text: string,
  userId: string,
  userName: string,
  userRole: string,
): Promise<void> {
  try {
    const complaintRef = doc(db, "complaints", complaintId)
    const complaintSnap = await getDoc(complaintRef)

    if (!complaintSnap.exists()) {
      throw new Error("Complaint not found")
    }

    const complaintData = complaintSnap.data()
    const comments = complaintData.comments || []

    const newComment: Comment = {
      id: `comment_${Date.now()}`,
      text,
      userId,
      userName,
      userRole,
      createdAt: new Date(),
    }

    comments.push({
      ...newComment,
      createdAt: serverTimestamp(),
    })

    await updateDoc(complaintRef, {
      comments,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error adding comment:", error)
    throw error
  }
}

// Get complaints by status
export async function getComplaintsByStatus(status: ComplaintStatus): Promise<Complaint[]> {
  try {
    const q = query(collection(db, "complaints"), where("status", "==", status), orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(q)
    const complaints: Complaint[] = []

    querySnapshot.forEach((doc) => {
      complaints.push(convertComplaintData(doc.id, doc.data()))
    })

    return complaints
  } catch (error) {
    console.error(`Error getting ${status} complaints:`, error)
    throw error
  }
}

// Get complaints by type
export async function getComplaintsByType(type: ComplaintType): Promise<Complaint[]> {
  try {
    const q = query(collection(db, "complaints"), where("type", "==", type), orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(q)
    const complaints: Complaint[] = []

    querySnapshot.forEach((doc) => {
      complaints.push(convertComplaintData(doc.id, doc.data()))
    })

    return complaints
  } catch (error) {
    console.error(`Error getting ${type} complaints:`, error)
    throw error
  }
}

