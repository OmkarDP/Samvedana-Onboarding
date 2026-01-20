import { useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Upload, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OnboardingData } from "@/pages/Onboarding";
import { Checkbox } from "@/components/ui/checkbox";

interface MembershipStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void; // Parent launches Razorpay
  onBack: () => void;
}

const MembershipStep = ({
  data,
  updateData,
  onNext,
  onBack,
}: MembershipStepProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [proceeding, setProceeding] = useState(false);

  // Compute payable amount deterministically (must match backend validator)
  const { registrationType, totalAmountRs } = useMemo(() => {
    const rType = sessionStorage.getItem("registrationType") || "new";
    const amt = data.memberType ? 1000 : rType === "renewal" ? 200 : 250;
    return { registrationType: rType, totalAmountRs: amt };
  }, [data.memberType]);

  const handleNext = () => {
    if (proceeding) return;
    setProceeding(true);
    // Clear, helpful telemetry (kept client-side)
    console.log("[Membership] proceeding", {
      registrationType,
      donatingMember: !!data.memberType,
      amount: totalAmountRs,
    });
    // Parent handles payment (launchRazorpay)
    onNext();
    // In case parent navigation fails for any reason, re-enable after a short delay
    setTimeout(() => setProceeding(false), 2000);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 5MB.",
        });
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }
      updateData({ photo: file });
      toast({
        title: "Photo uploaded",
        description: "Your photo has been uploaded successfully.",
      });
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Membership Details</CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete your membership information
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-sm sm:text-base">Member ID</Label>
          <Input
            value={data.memberID}
            disabled
            className="bg-muted text-muted-foreground w-full"
          />
          <p className="text-xs text-muted-foreground">
            Auto-generated member ID
          </p>
        </div>

        {/* <div className="space-y-2">
          <Label className="text-sm sm:text-base">Renewal Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data.renewalDate
                  ? format(new Date(data.renewalDate), "PPP")
                  : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0"
              align="start"
            >
              <Calendar
                mode="single"
                selected={
                  data.renewalDate ? new Date(data.renewalDate) : undefined
                }
                onSelect={(date) => date && updateData({ renewalDate: date })}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div> */}

        <div className="space-y-3">
          <Label className="text-sm sm:text-base">Selfie / ID Card Photo</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 w-full sm:w-auto"
            >
              <Upload className="mr-2 h-4 w-4" /> Upload File
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 w-full sm:w-auto"
            >
              <Camera className="mr-2 h-4 w-4" /> Take Photo
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />
          {data.photo && (
            <p className="text-sm text-green-600">
              ✓ Photo uploaded: {data.photo.name}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Upload a clear photo for identification (max 5MB)
          </p>
        </div>

        {/* Amount summary (authoritative, mirrors backend logic) */}
        {/* <div className="rounded-md border p-3 bg-muted/40">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Registration</span>
            <span className="text-sm font-medium capitalize">
              {registrationType}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-muted-foreground">
              Donating member
            </span>
            <span className="text-sm font-medium">
              {data.memberType ? "Yes" : "No"}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t">
            <span className="text-sm font-semibold">Amount to Pay</span>
            <span className="text-base font-bold">₹{totalAmountRs}</span>
          </div>
        </div> */}

        <div className="space-y-3 pt-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="donate-for-cause"
              checked={data.memberType}
              onCheckedChange={(checked) => {
                const isChecked = checked === true;
                updateData({ memberType: isChecked });
                toast({
                  title: isChecked
                    ? "Thank you for your contribution!"
                    : "Contribution removed",
                  description: isChecked
                    ? "The total amount has been updated to ₹1000."
                    : "The total amount has been reset.",
                });
              }}
              className="mt-1 h-5 w-5"
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="donate-for-cause"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Donate 
              </label>
              <p className="text-xs text-muted-foreground">
                Select this to make an additional contribution.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="w-full sm:flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={proceeding}
            className="w-full sm:flex-1"
          >
            {proceeding ? "Processing…" : "Proceed to Pay"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MembershipStep;
