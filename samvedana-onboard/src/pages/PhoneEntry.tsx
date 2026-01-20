import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import logo from "@/logo.png";
import {
  getMemberByPhone,
  ensureSfaMemberIdForDoc,
  generateSmartMemberId,
} from "@/services/firestoreService";

const PhoneEntry = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [registrationType, setRegistrationType] = useState<
    "new" | "renewal" | ""
  >("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [detectedMember, setDetectedMember] = useState<any | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const debounceRef = useRef<number | null>(null);

  const validatePhoneNumber = (phone: string) => /^[6-9]\d{9}$/.test(phone);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    if (!phoneNumber || phoneNumber.length < 10) {
      setDetectedMember(null);
      setRegistrationType("");
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      await runPhoneCheck(phoneNumber);
    }, 400);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneNumber]);

  const upgradeMemberIdIfNeeded = async (member: any, phone: string) => {
    let finalMemberId = member.memberID || member.id || "";
    if (!finalMemberId.startsWith("SFA-")) {
      try {
        const upgraded = await ensureSfaMemberIdForDoc(member.id, phone, {
          audit: true,
        });
        finalMemberId = upgraded;
      } catch (err) {
        finalMemberId = generateSmartMemberId(phone);
      }
    }
    return {
      id: member.id || "",
      memberID: finalMemberId,
      shortName:
        typeof member.name === "string" && member.name?.length > 0
          ? member.name.split(" ")[0]
          : undefined,
    };
  };

  const runPhoneCheck = async (phone: string) => {
    if (!validatePhoneNumber(phone)) {
      setDetectedMember(null);
      setRegistrationType("");
      return;
    }

    setCheckingPhone(true);
    try {
      const existingMember = await getMemberByPhone(phone);
      if (existingMember) {
        const upgradedMember = await upgradeMemberIdIfNeeded(
          existingMember,
          phone
        );

        setDetectedMember(upgradedMember);
        setRegistrationType("renewal");
      } else {
        setDetectedMember(null);
        setRegistrationType("new");
      }
    } catch (error) {
      console.error("Phone lookup failed:", error);
      setDetectedMember(null);
      setRegistrationType("");
    } finally {
      setCheckingPhone(false);
    }
  };

  const handleContinue = async () => {
    if (!registrationType) {
      toast({
        title: "Registration type required",
        description:
          "Please enter a 10-digit phone to detect registration type.",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber.trim() || !validatePhoneNumber(phoneNumber)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid 10-digit phone number.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    sessionStorage.removeItem("donateChoiceMade");
    sessionStorage.setItem("phoneNumber", phoneNumber);
    sessionStorage.setItem("registrationType", registrationType);

    if (registrationType === "renewal") {
      sessionStorage.setItem("openMembershipModal", "true");
    } else {
      sessionStorage.removeItem("openMembershipModal");
    }

    navigate("/onboarding");
  };

  const radiosDisabled = true;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-sm sm:max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex flex-col items-center gap-1">
            <img
              src={logo}
              alt="Samvedana Logo"
              className="h-16 w-auto"
            />
          </div>
          <CardTitle className="text-xl">
            Welcome to Member Registration
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your phone number — selection will be chosen automatically.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Registration Type *</Label>

            <div
              aria-disabled={radiosDisabled}
              className={`space-y-2 rounded-md p-2 ${
                radiosDisabled ? "opacity-60 pointer-events-none" : ""
              }`}
            >
              <RadioGroup
                value={registrationType}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value="new"
                    id="new"
                    disabled
                  />
                  <Label
                    htmlFor="new"
                    className={radiosDisabled ? "text-muted-foreground" : ""}
                    aria-disabled={radiosDisabled}
                  >
                    New Registration – ₹250
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value="renewal"
                    id="renewal"
                    disabled
                  />
                  <Label
                    htmlFor="renewal"
                    className={radiosDisabled ? "text-muted-foreground" : ""}
                    aria-disabled={radiosDisabled}
                  >
                    Renewal – ₹200
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <p className="text-xs text-muted-foreground mt-1">
              {checkingPhone
                ? "Checking phone..."
                : detectedMember
                ? `Detected existing member: ${
                    detectedMember.shortName || "Unknown"
                  } (${detectedMember.memberID})`
                : registrationType === "new"
                ? "No existing member found — will create a new registration."
                : "Enter complete 10-digit phone to auto-detect membership."}
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="phone"
              className="text-sm font-medium"
            >
              Phone Number *
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter your 10-digit phone number"
              value={phoneNumber}
              onChange={(e) =>
                setPhoneNumber(e.target.value.replace(/\D/g, ""))
              }
              maxLength={10}
              className="text-lg"
            />
          </div>

          <Button
            onClick={handleContinue}
            className="w-full text-base py-6"
            disabled={isLoading}
          >
            {isLoading ? "Checking..." : "Continue"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By continuing, you agree to join the Samvedana Foundation community
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PhoneEntry;
