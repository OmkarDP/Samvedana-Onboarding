// src/services/firestoreService.ts
import { db } from "@/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { OnboardingData, MemberDocument } from "@/pages/Onboarding";

const SFA_PREFIX = "SFA-";

const normalizeGender = (g?: any): "Male" | "Female" | "Other" | "" => {
  if (!g && g !== "") return "";
  if (!g) return "";
  const s = String(g).trim().toLowerCase();
  if (["m", "male", "man"].includes(s)) return "Male";
  if (["f", "female", "woman"].includes(s)) return "Female";
  return "Other";
};

const normalizeBloodGroup = (raw?: any): string => {
  if (!raw && raw !== "") return "";
  if (!raw) return "";
  let s = String(raw).trim().toUpperCase();
  // common normalizations:
  s = s.replace(/\s+/g, ""); // remove spaces
  s = s.replace(/positive/i, "+"); // e.g. "O positive" -> "O+"
  s = s.replace(/negative/i, "-");
  s = s.replace(/\bPOS\b/i, "+");
  s = s.replace(/\bNEG\b/i, "-");
  // sometimes stored as OVE / O VE etc, remove stray "VE"
  s = s.replace(/VE$/i, "");
  // If user typed OPLUS or something:
  s = s.replace(/PLUS$/i, "+");
  s = s.replace(/MINUS$/i, "-");

  // Basic validation: accept only these final values:
  const allowed = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  if (allowed.includes(s)) return s;

  // If s is a single group token like "A", "B", "AB", "O" → default to plus
  if (/^(?:A|B|AB|O)$/i.test(s)) return `${s.toUpperCase()}+`;

  // fallback: return uppercase trimmed
  return s;
};

/**
 * getMemberByPhone - finds a member doc by contactnumber field and normalizes some fields
 */
export const getMemberByPhone = async (
  phone: string
): Promise<MemberDocument | null> => {
  const q = query(
    collection(db, "members"),
    where("contactnumber", "==", phone)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  const data = docSnap.data() as any;

  // Convert Firestore Timestamp objects or date strings to JavaScript Date objects
  const renewalDateRaw = data.renewalDate;
  const dobRaw = data.dob;

  const renewalDate = renewalDateRaw?.toDate
    ? renewalDateRaw.toDate()
    : typeof renewalDateRaw === "string" && renewalDateRaw.length > 0
    ? new Date(renewalDateRaw)
    : undefined;

  let dob: Date | undefined = undefined;
  if (dobRaw) {
    if (dobRaw.toDate) {
      dob = dobRaw.toDate();
    } else if (typeof dobRaw === "string" && dobRaw.length > 0) {
      dob = new Date(dobRaw);
    }
  }

  // Prefer canonical string memberType; fall back to legacy fields
  const memberTypeString: "EXECUTIVE" | "CORE" =
    (data.memberType || data.membertype) === "EXECUTIVE"
      ? "EXECUTIVE"
      : (data.memberType || data.membertype) === "CORE"
      ? "CORE"
      : data.isExecutive
      ? "EXECUTIVE"
      : "CORE";

  return {
    id: docSnap.id,
    phoneNumber: data.contactnumber || data.contactNumber || phone || "",
    name: data.name || "",
    email: data.email || "",
    state: data.state || "Maharashtra",
    district: data.district || "",
    subdistrict: data.subdistrict || data.tahsil || "",
    village: data.village || "",
    gender: normalizeGender(data.gender),
    bloodGroup: normalizeBloodGroup(data.bloodgroup ?? data.bloodGroup),
    memberID: data.memberID || data.memberId || docSnap.id,
    // Keep type as boolean in the component type if you want, but we recommend strings; here we preserve your OnboardingData shape:
    memberType: memberTypeString === "EXECUTIVE", // boolean for your current UI
    profession: data.profession || "",
    pan: data.pannumber || data.pan || "",
    photoUrl: data.photoUrl || undefined,
    renewalDate,
    dob,
    photo: undefined,
  };
};

/**
 * generateSmartMemberId - SFA-mmyyFFLL
 * mm = month, yy = year two digits, FF = first2 of phone, LL = last2 of phone
 */
export const generateSmartMemberId = (phoneNumber: string): string => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const first2 = phoneNumber.slice(0, 2).padStart(2, "0");
  const last2 = phoneNumber.slice(-2).padStart(2, "0");
  return `${SFA_PREFIX}${mm}${yy}${first2}${last2}`;
};

/**
 * ensureSfaMemberIdForDoc
 * - If the member doc already has an SFA- id -> returns it (no-op)
 * - If older memberID exists (e.g., member_XXX) or missing -> generates SFA id,
 *   attempts to avoid collisions, updates member doc transactionally and writes an audit doc.
 */
export const ensureSfaMemberIdForDoc = async (
  docId: string,
  phoneNumber: string,
  opts?: { audit?: boolean }
): Promise<string> => {
  const audit = opts?.audit ?? true;
  const memberRef = doc(db, "members", docId);

  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(memberRef);
    if (!snap.exists()) throw new Error("member_doc_not_found");

    const data = snap.data() as any;
    const currentId: string = data.memberID || "";

    if (typeof currentId === "string" && currentId.startsWith(SFA_PREFIX)) {
      return currentId; // already migrated
    }

    // Generate initial candidate
    let candidate = generateSmartMemberId(phoneNumber);

    // Collision avoidance
    let suffix = 0;
    while (true) {
      const q = query(
        collection(db, "members"),
        where("memberID", "==", candidate)
      );
      const colSnap = await getDocs(q);
      if (colSnap.empty) break;
      suffix++;
      candidate = `${generateSmartMemberId(phoneNumber)}-${suffix}`;
      if (suffix > 50) throw new Error("memberid_collision_exhausted");
    }

    // Update member doc with new memberID
    tx.update(memberRef, { memberID: candidate });

    // Audit
    if (audit) {
      const auditCol = collection(db, "memberIdMigrations");
      const auditRef = doc(auditCol);
      tx.set(auditRef, {
        docId,
        oldMemberID: currentId || null,
        newMemberID: candidate,
        phoneNumber,
        migratedAt: serverTimestamp(),
      } as any);
    }

    return candidate;
  });
};
