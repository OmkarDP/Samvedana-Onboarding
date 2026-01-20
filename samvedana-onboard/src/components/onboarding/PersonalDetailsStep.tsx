import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { OnboardingData } from "@/pages/Onboarding";
import { cn } from "@/lib/utils";

interface PersonalDetailsStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const PersonalDetailsStep = ({
  data,
  updateData,
  onNext,
  onBack,
}: PersonalDetailsStepProps) => {
  const { toast } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [day, setDay] = useState<string | undefined>();
  const [month, setMonth] = useState<string | undefined>();
  const [year, setYear] = useState<string | undefined>();

  // Safely set initial date values when component loads with existing data
  useEffect(() => {
    if (data.dob) {
      const dobDate = new Date(data.dob);
      if (!isNaN(dobDate.getTime())) {
        setDay(String(dobDate.getDate()));
        setMonth(String(dobDate.getMonth() + 1));
        setYear(String(dobDate.getFullYear()));
      }
    }
  }, [data.dob]);

  // Update main form data when day, month, or year changes
  useEffect(() => {
    if (day && month && year) {
      const dateString = `${year}-${String(month).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
      const newDob = new Date(dateString);

      if (!isNaN(newDob.getTime())) {
        updateData({ dob: newDob });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, month, year]);

  const normalizeGender = (g?: string) => {
    if (!g) return "";
    const s = String(g).trim().toLowerCase();
    if (["m", "male", "man", "Male"].includes(s)) return "Male";
    if (["f", "female", "woman", "Female"].includes(s)) return "Female";
    return "Other";
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!data.name?.trim()) newErrors.name = "Name is required";
    if (!data.dob) newErrors.dob = "Date of Birth is required";
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    const genderToCheck = normalizeGender(data.gender);
    if (!genderToCheck) newErrors.gender = "Gender is required";
    if (!data.bloodGroup) newErrors.bloodGroup = "Blood Group is required";
    if (!data.pan?.trim()) {
      newErrors.pan = "PAN number is required";
    } else if (
      !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.pan.trim().toUpperCase() ?? "")
    ) {
      newErrors.pan = "Invalid PAN format (e.g., ABCDE1234F)";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext();
    } else {
      toast({
        title: "Please fix the errors",
        description: "Some required fields are missing or invalid.",
        variant: "destructive",
      });
    }
  };

  const years = Array.from({ length: 100 }, (_, i) =>
    String(new Date().getFullYear() - 18 - i)
  );
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(0, i).toLocaleString("default", { month: "long" }),
  }));
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));

  return (
    <Card className="w-full max-w-xl mx-auto p-4">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Personal Details</CardTitle>
        <p className="text-sm text-muted-foreground">
          Please provide your basic information
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-y-4">
        <div className="flex flex-col space-y-1">
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            value={data.phoneNumber || ""}
            disabled
            className="bg-muted text-muted-foreground"
          />
        </div>
        <div className="flex flex-col space-y-1">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            value={data.name || ""}
            onChange={(e) => updateData({ name: e.target.value })}
            placeholder="Enter your full name"
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>
        <div className="flex flex-col space-y-1">
          <Label>Date of Birth *</Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={day}
              onValueChange={setDay}
            >
              <SelectTrigger
                className={cn(errors.dob && !day ? "border-destructive" : "")}
              >
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                {days.map((d) => (
                  <SelectItem
                    key={d}
                    value={d}
                  >
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={month}
              onValueChange={setMonth}
            >
              <SelectTrigger
                className={cn(errors.dob && !month ? "border-destructive" : "")}
              >
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem
                    key={m.value}
                    value={m.value}
                  >
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={year}
              onValueChange={setYear}
            >
              <SelectTrigger
                className={cn(errors.dob && !year ? "border-destructive" : "")}
              >
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem
                    key={y}
                    value={y}
                  >
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {errors.dob && (
            <p className="text-xs text-destructive">{errors.dob}</p>
          )}
        </div>
        <div className="flex flex-col space-y-1">
          <Label htmlFor="email">Email ID (Optional)</Label>
          <Input
            id="email"
            type="email"
            value={data.email || ""}
            onChange={(e) => updateData({ email: e.target.value })}
            placeholder="Enter your email address"
            className={errors.email ? "border-destructive" : ""}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>
        <div className="flex flex-col space-y-1">
          <Label htmlFor="gender">Gender *</Label>
          <Select
            value={data.gender || ""}
            onValueChange={(value) => updateData({ gender: value })}
          >
            <SelectTrigger
              className={errors.gender ? "border-destructive" : ""}
            >
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && (
            <p className="text-xs text-destructive">{errors.gender}</p>
          )}
        </div>
        <div className="flex flex-col space-y-1">
          <Label htmlFor="bloodGroup">Blood Group *</Label>
          <Select
            value={data.bloodGroup || ""}
            onValueChange={(value) => updateData({ bloodGroup: value })}
          >
            <SelectTrigger
              className={errors.bloodGroup ? "border-destructive" : ""}
            >
              <SelectValue placeholder="Select blood group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A+">A+</SelectItem>
              <SelectItem value="A-">A-</SelectItem>
              <SelectItem value="B+">B+</SelectItem>
              <SelectItem value="B-">B-</SelectItem>
              <SelectItem value="AB+">AB+</SelectItem>
              <SelectItem value="AB-">AB-</SelectItem>
              <SelectItem value="O+">O+</SelectItem>
              <SelectItem value="O-">O-</SelectItem>
            </SelectContent>
          </Select>
          {errors.bloodGroup && (
            <p className="text-xs text-destructive">{errors.bloodGroup}</p>
          )}
        </div>
        <div className="flex flex-col space-y-1">
          <Label htmlFor="profession">Profession</Label>
          <Input
            id="profession"
            value={data.profession || ""}
            onChange={(e) => updateData({ profession: e.target.value })}
            placeholder="Enter your profession"
          />
        </div>
        <div className="flex flex-col space-y-1">
          <Label htmlFor="pan">PAN Card Number *</Label>
          <Input
            id="pan"
            value={data.pan || ""}
            onChange={(e) => updateData({ pan: e.target.value.toUpperCase() })}
            placeholder="e.g., ABCDE1234F"
            className={errors.pan ? "border-destructive" : ""}
          />
          {errors.pan && (
            <p className="text-xs text-destructive">{errors.pan}</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="w-full sm:w-1/2"
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            className="w-full sm:w-1/2"
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonalDetailsStep;
