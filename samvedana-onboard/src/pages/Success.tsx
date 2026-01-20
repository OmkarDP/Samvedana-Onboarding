// src/pages/Success.tsx
import { useEffect } from "react";
import { CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveMemberToFirestore } from "@/services/saveMember";
import { OnboardingData } from "./Onboarding";

// Single helper with fallback to sessionStorage
const getPaymentId = (): string => {
  const fromUrl = new URLSearchParams(window.location.search).get(
    "razorpay_payment_id"
  );
  if (fromUrl) return fromUrl;

  const rp = sessionStorage.getItem("razorpay_response");
  if (rp) {
    try {
      const parsed = JSON.parse(rp);
      if (parsed?.razorpay_payment_id) return parsed.razorpay_payment_id;
    } catch {
      /* ignore JSON parse errors */
    }
  }
  return "N/A_Direct_Redirect";
};

const Success = () => {
  useEffect(() => {
    const finalizeRegistration = async () => {
      try {
        const dataString = localStorage.getItem("samvedana_member_data");
        if (!dataString) {
          console.warn(
            "⚠️ No member data found in localStorage. Cannot finalize registration."
          );
          return;
        }

        const userData: OnboardingData = JSON.parse(dataString);
        const paymentId = getPaymentId();

        // Normalize dates: keep undefined if not provided
        const finalData: OnboardingData = {
          ...userData,
          dob: userData.dob ? new Date(userData.dob as any) : undefined,
          renewalDate: userData.renewalDate
            ? new Date(userData.renewalDate as any)
            : undefined,
          photo: undefined, // never send File to Firestore
        };

        await saveMemberToFirestore(
          finalData,
          !!finalData.memberType, // isExecutive/donating
          paymentId
        );

        console.log(
          "✅ Member data saved to Firestore successfully from the success page."
        );
      } catch (err) {
        console.error(
          "❌ Failed to finalize registration on success page:",
          err
        );
      } finally {
        // Clean up regardless of success/failure
        localStorage.removeItem("samvedana_member_data");
        sessionStorage.clear();
      }
    };

    finalizeRegistration();

    // Redirect to WhatsApp after a short delay to show the success UI
    const timer = setTimeout(() => {
      const whatsappURL = `https://wa.me/919021700800?`;
      window.location.href = whatsappURL;
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center shadow-lg rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <h1 className="text-xl font-bold text-samvedana-blue mr-2">
              संवेदना
            </h1>
            <span className="text-lg font-semibold text-samvedana-orange">
              {" "}
              Foundation
            </span>
          </div>
          <div className="mx-auto mb-4">
            <CheckCircle
              className="h-16 w-16 text-green-500"
              aria-hidden="true"
            />
          </div>
          <CardTitle className="text-xl text-green-600">
            Registration Successful!
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Welcome to the Samvedana Foundation family. Redirecting you to our
            official WhatsApp...
          </p>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg text-left">
            <p className="text-sm font-medium mb-2">What’s Next?</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>You’ll receive confirmation via SMS/email</li>
              <li>Your membership card is being processed</li>
              <li>Our WhatsApp assistant will guide you further</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Success;
