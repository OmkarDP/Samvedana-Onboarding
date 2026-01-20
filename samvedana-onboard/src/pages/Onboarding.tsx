import { useEffect, useMemo, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PersonalDetailsStep from "@/components/onboarding/PersonalDetailsStep";
import LocationStep from "@/components/onboarding/LocationStep";
import MembershipStep from "@/components/onboarding/MembershipStep";
import {
  getMemberByPhone,
  generateSmartMemberId,
} from "@/services/firestoreService";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

export interface OnboardingData {
  phoneNumber: string;
  name: string;
  email: string;
  state: string;
  district: string;
  subdistrict: string;
  village: string;
  gender: string;
  bloodGroup: string;
  memberID: string;
  profession: string;
  pan: string;
  renewalDate: Date | string;
  photo?: File;
  photoUrl?: string;
  dob?: Date | string;
  memberType?: boolean; // true = donating member (₹1000)
}
export interface MemberDocument extends OnboardingData {
  id: string;
}

const totalSteps = 3;

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpay = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Razorpay script failed to load"));
    document.body.appendChild(s);
  });

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formLoaded, setFormLoaded] = useState(false);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [formData, setFormData] = useState<OnboardingData>({
    phoneNumber: "",
    name: "",
    email: "",
    state: "Maharashtra",
    district: "",
    subdistrict: "",
    village: "",
    gender: "",
    bloodGroup: "",
    memberID: "",
    profession: "",
    pan: "",
    renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    photo: undefined,
    photoUrl: undefined,
    dob: undefined,
    memberType: false,
  });

  useEffect(() => {
    (async () => {
      const storedPhone = sessionStorage.getItem("phoneNumber");
      const storedRegistrationType = sessionStorage.getItem("registrationType");
      const openMembershipModalFlag = sessionStorage.getItem(
        "openMembershipModal"
      );

      if (!storedPhone || !storedRegistrationType) {
        navigate("/");
        return;
      }

      try {
        const existing = await getMemberByPhone(storedPhone);

        // ==== CHANGED: lock SFA ID before any further operations ====
        if (existing) {
          // Decide final SFA ID
          const existingId = existing.memberID || existing.id || "";
          const alreadySfa =
            typeof existingId === "string" && existingId.startsWith("SFA-");
          let finalSfaId = existingId;

          if (!alreadySfa) {
            // Generate new SFA ID and mark migration
            finalSfaId = generateSmartMemberId(storedPhone);

            // Old doc id to be renamed later by your saver
            sessionStorage.setItem("documentId", existing.id); // e.g., "member_123"
            sessionStorage.setItem("pendingNewMemberId", finalSfaId);
          } else {
            // Clear any stale migration markers
            sessionStorage.removeItem("documentId");
            sessionStorage.removeItem("pendingNewMemberId");
          }

          setFormData((prev) => ({
            ...prev,
            ...existing,
            phoneNumber: storedPhone,
            memberID: finalSfaId, // ensure SFA from here on
          }));

          if (
            storedRegistrationType === "renewal" &&
            openMembershipModalFlag === "true"
          ) {
            setCurrentStep(totalSteps);
            setTimeout(() => setIsMembershipModalOpen(true), 80);
          }
        } else {
          // New user: assign SFA immediately and mark as pending new id
          const sfaId = generateSmartMemberId(storedPhone || "");
          sessionStorage.removeItem("documentId");
          sessionStorage.setItem("pendingNewMemberId", sfaId);

          setFormData((prev) => ({
            ...prev,
            phoneNumber: storedPhone,
            memberID: sfaId, // SFA from the start
          }));
        }
        // ==== /CHANGED ====
      } catch (e) {
        console.error("Onboarding init failed:", e);
      } finally {
        setFormLoaded(true);
      }
    })();
  }, [navigate]);

  const progress = (currentStep / totalSteps) * 100;
  const updateFormData = (data: Partial<OnboardingData>) =>
    setFormData((prev) => ({ ...prev, ...data }));

  const { registrationType, amountInRupees } = useMemo(() => {
    const rType = sessionStorage.getItem("registrationType") || "new";
    const amt = formData.memberType ? 1000 : rType === "renewal" ? 200 : 250;
    return { registrationType: rType, amountInRupees: amt };
  }, [formData.memberType]);

  const launchRazorpay = async () => {
    if (paying) return;
    setPaying(true);

    try {
      const backend = (import.meta.env.VITE_BACKEND_URL as string) || "";
      if (!backend) throw new Error("VITE_BACKEND_URL missing");

      const snapshot = {
        ...formData,
        photo: undefined,
        dob: formData.dob ? new Date(formData.dob).toISOString() : undefined,
        renewalDate: formData.renewalDate
          ? new Date(formData.renewalDate).toISOString()
          : new Date().toISOString(),
      };
      localStorage.setItem("samvedana_member_data", JSON.stringify(snapshot));

      if (!Number.isFinite(amountInRupees) || amountInRupees <= 0) {
        throw new Error(`Invalid amount computed: ${amountInRupees}`);
      }

      const res = await fetch(`${backend}/api/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amountInRupees) }),
      });

      if (!res.ok) {
        let detail = "";
        try {
          const j = await res.json();
          detail = JSON.stringify(j);
        } catch {
          detail = await res.text();
        }
        throw new Error(`create-order failed: HTTP ${res.status} ${detail}`);
      }

      const { orderId, amount, key } = await res.json();
      if (!orderId || !Number.isFinite(amount)) {
        throw new Error("Backend returned invalid order payload");
      }

      await loadRazorpay();
      if (!window.Razorpay) throw new Error("Razorpay checkout.js not loaded");

      const options: any = {
        key,
        order_id: orderId,
        amount,
        currency: "INR",
        name: "Samvedana Foundation",
        description: "Membership Payment",
        prefill: {
          name: formData.name || "",
          email: formData.email || "",
          contact: formData.phoneNumber || "",
        },
        notes: {
          name: formData.name || "",
          phonenumber: `91${(formData.phoneNumber || "").trim()}`,
          memberid: formData.memberID || "",
          bloodgroup: formData.bloodGroup || "",
          village: formData.village || "",
          subdistrict: formData.subdistrict || "",
          district: formData.district || "",
          photourl: formData.photoUrl || "",
        },
        handler: async (rp: any) => {
          try {
            // optional: keep backend verify non-blocking
            fetch(`${backend}/api/verify-and-capture`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(rp),
            }).catch(() => undefined);

            // put the full rp in sessionStorage (extra safety/fallback)
            sessionStorage.setItem("razorpay_response", JSON.stringify(rp));

            // ✅ include payment id in URL so Success can read it
            navigate(
              `/success?razorpay_payment_id=${encodeURIComponent(
                rp.razorpay_payment_id
              )}`
            );
          } catch (e) {
            console.error("payment handler failed:", e);
            alert(
              "Payment captured, but saving failed. Please contact support."
            );
          }
        },
        modal: { ondismiss: () => navigate("/payment-cancelled") },
      };

      new window.Razorpay(options).open();
    } catch (e: any) {
      console.error("launchRazorpay failed:", e?.message || e);
      alert(e?.message || "Payment could not be initiated. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) setCurrentStep((s) => s + 1);
    else launchRazorpay();
  };
  const prevStep = () =>
    currentStep > 1 ? setCurrentStep((s) => s - 1) : navigate("/");

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <PersonalDetailsStep
            data={formData}
            updateData={updateFormData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 2:
        return (
          <LocationStep
            data={formData}
            updateData={updateFormData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 3:
        return (
          <MembershipStep
            data={formData}
            updateData={updateFormData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      default:
        return null;
    }
  };

  const stepTitles = [
    "Personal Details",
    "Location Information",
    "Membership Details",
  ];
  const closeMembershipModal = () => {
    setIsMembershipModalOpen(false);
    sessionStorage.removeItem("openMembershipModal");
  };


  
  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* SECTION 1: Main Page Content (this will be blurred) */}
      <div
        className="flex flex-col items-center justify-center p-4"
        style={{
          filter: isMembershipModalOpen ? "blur(5px)" : "none",
          transition: "filter 0.3s ease-out",
        }}
      >
        <Card className="w-full max-w-md rounded-xl shadow-lg border-0 overflow-hidden">
          <CardHeader className="text-center bg-white p-6">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <h1 className="text-3xl font-bold text-samvedana-blue">
                संवेदना
              </h1>
              <span className="text-2xl font-semibold text-samvedana-orange pt-1">
                Foundation
              </span>
            </div>
            <CardTitle className="text-xl font-semibold">
              Member Registration
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Step {currentStep} of {totalSteps}:{" "}
              <span className="font-medium text-foreground">
                {stepTitles[currentStep - 1]}
              </span>
            </p>
            <Progress
              value={progress}
              className="w-full mt-4 h-2"
            />
          </CardHeader>
          <CardContent className="p-6 bg-gray-50">
            <div
              key={currentStep}
              className="animate-in fade-in duration-500"
            >
              {formLoaded ? renderStep() : <div>Loading form...</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 2: The Modal (renders on top and is scrollable) */}
      {isMembershipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-12 pb-12">
          <div className="relative rounded-xl shadow-xl bg-background w-full max-w-md animate-in zoom-in-95 fade-in-0">
            <button
              onClick={closeMembershipModal}
              className="absolute top-3 right-3 p-1 rounded-full text-muted-foreground hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            {/* The MembershipStep component is now rendered inside this scrollable modal */}
            <MembershipStep
              data={formData}
              updateData={updateFormData}
              onNext={() => {
                nextStep();
                closeMembershipModal();
              }}
              onBack={() => {
                closeMembershipModal();
                prevStep();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
