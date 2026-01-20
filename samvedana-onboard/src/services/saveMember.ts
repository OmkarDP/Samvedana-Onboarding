// src/services/saveMember.ts
import { db } from "@/firebase";
import {
  doc,
  setDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { OnboardingData } from "@/pages/Onboarding";
import { format } from "date-fns";

/** Small normalizers - keep consistent formatting in DB */
const normalizeGenderOut = (g?: string) => {
  if (!g && g !== "") return "Other";
  const s = String(g || "")
    .trim()
    .toLowerCase();
  if (["m", "male", "man"].includes(s)) return "Male";
  if (["f", "female", "woman"].includes(s)) return "Female";
  return "Other";
};

const normalizeBloodOut = (raw?: string) => {
  if (!raw && raw !== "") return "";
  if (!raw) return "";
  let s = String(raw).trim().toUpperCase();
  s = s.replace(/\s+/g, ""); // remove whitespace
  s = s.replace(/VE$/i, ""); // handle "Ove" style
  s = s.replace(/POSITIVE$/i, "+");
  s = s.replace(/NEGATIVE$/i, "-");
  s = s.replace(/PLUS$/i, "+");
  s = s.replace(/MINUS$/i, "-");
  const allowed = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  if (allowed.includes(s)) return s;
  // fallback try to coerce single-letter groups to plus
  if (/^[ABO]$/i.test(s)) return `${s}+`;
  return s;
};

/**
 * Persist member document under a stable SFA memberID.
 * - If sessionStorage has {documentId, pendingNewMemberId}, it will rename old -> new transactionally.
 * - Writes canonical `memberType` (string) + legacy fields for compatibility.
 * - Only writes `paymentId` if a real id is present.
 */
export const saveMemberToFirestore = async (
  data: OnboardingData,
  isExecutive: boolean,
  paymentId: string
) => {
  const oldDocId = sessionStorage.getItem("documentId"); // old doc id e.g. "member_1"
  const pendingNewId = sessionStorage.getItem("pendingNewMemberId"); // desired new SFA id (optional)
  const formattedDob = data.dob ? format(data.dob as any, "yyyy-MM-dd") : "";

  const stableId = pendingNewId || data.memberID;
  const gender = normalizeGenderOut(data.gender);
  const bloodgroup = normalizeBloodOut(data.bloodGroup);

  const finalData = {
    contactnumber: data.phoneNumber,
    name: data.name,
    email: data.email,
    state: data.state,
    district: data.district,
    subdistrict: data.subdistrict,
    village: data.village,
    gender,
    bloodgroup,
    memberID: stableId,

    // canonical + legacy member type fields
    memberType: isExecutive ? "EXECUTIVE" : "CORE",
    membertype: isExecutive ? "EXECUTIVE" : "CORE", // legacy
    isExecutive: !!isExecutive, // legacy boolean

    profession: data.profession,
    pannumber: data.pan,
    renewalDate: data.renewalDate || null,
    photoUrl: data.photoUrl || "",

    // only store paymentId if meaningful
    ...(paymentId && paymentId !== "N/A_Direct_Redirect" ? { paymentId } : {}),

    dob: formattedDob,
    updatedAt: serverTimestamp(),
  };

  const newDocRef = doc(db, "members", stableId);

  if (oldDocId && oldDocId !== stableId) {
    const oldDocRef = doc(db, "members", oldDocId);
    try {
      await runTransaction(db, async (tx) => {
        // create/merge the new document then delete the old one
        tx.set(newDocRef, { createdAt: serverTimestamp(), ...finalData }, {
          merge: true,
        } as any);
        tx.delete(oldDocRef);
      });
      console.log(`✅ Renamed Firestore doc from ${oldDocId} → ${stableId}`);
      // Clear migration markers after success
      sessionStorage.removeItem("documentId");
      sessionStorage.removeItem("pendingNewMemberId");
    } catch (err) {
      console.error("Rename transaction failed, fallback to safe write:", err);
      // Fallback: write the new stable doc (merge) — don't delete old if transaction failed
      await setDoc(
        newDocRef,
        { createdAt: serverTimestamp(), ...finalData },
        { merge: true }
      );
      // Clear markers to avoid repeated renames on retries
      sessionStorage.removeItem("documentId");
      sessionStorage.removeItem("pendingNewMemberId");
    }
  } else {
    // new member or already stable id — write with merge
    await setDoc(
      newDocRef,
      { createdAt: serverTimestamp(), ...finalData },
      { merge: true }
    );
    console.log("Saved member with stable id:", stableId);
    // Clear markers
    sessionStorage.removeItem("documentId");
    sessionStorage.removeItem("pendingNewMemberId");
  }
};
