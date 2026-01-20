import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { OnboardingData } from "@/pages/Onboarding";

const Confirmation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState<OnboardingData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const data = sessionStorage.getItem("onboardingData");
    if (!data) {
      navigate("/");
      return;
    }

    try {
      const parsedData = JSON.parse(data);
      // Convert renewalDate string back to Date object
      parsedData.renewalDate = new Date(parsedData.renewalDate);
      setFormData(parsedData);
    } catch (error) {
      console.error("Error parsing form data:", error);
      navigate("/");
    }
  }, [navigate]);

  const handleSubmit = async () => {
    if (!formData) return;

    setIsSubmitting(true);

    try {
      // Simulate API call - replace with actual submission logic
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Clear session storage
      sessionStorage.removeItem("phoneNumber");
      sessionStorage.removeItem("onboardingData");

      toast({
        title: "Registration successful!",
        description: "Welcome to Samvedana Foundation!",
      });

      navigate("/success");
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    navigate("/onboarding");
  };

  if (!formData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <h1 className="text-xl font-bold text-samvedana-blue mr-2">
                संवेदना
              </h1>
              <span className="text-lg font-semibold text-samvedana-orange">
                Foundation
              </span>
            </div>
            <CardTitle className="text-xl">Confirm Your Registration</CardTitle>
            <p className="text-sm text-muted-foreground">
              Please review your information before submitting
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Personal Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone Number:</span>
                  <span>{formData.phoneNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span>{formData.name}</span>
                </div>
                {formData.email && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{formData.email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gender:</span>
                  <span>{formData.gender}</span>
                </div>
                {formData.profession && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profession:</span>
                    <span>{formData.profession}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">Location Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">State:</span>
                  <span>{formData.state}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">District:</span>
                  <span>{formData.district}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taluka:</span>
                  <span>{formData.subdistrict}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Village:</span>
                  <span>{formData.village}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">Membership Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member ID:</span>
                  <span className="font-mono">{formData.memberID}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member Type:</span>
                  <span>{formData.memberType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Renewal Date:</span>
                  <span>{format(formData.renewalDate, "PPP")}</span>
                </div>
                {formData.photoUrl && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Photo:</span>
                    <span className="text-green-600">✓ Uploaded</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <Button
                variant="outline"
                onClick={handleEdit}
                className="flex-1"
              >
                Edit Information
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Registration"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Confirmation;
