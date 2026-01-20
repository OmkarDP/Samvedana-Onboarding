import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
import locationDataRaw from "@/assets/data/maharashtra_location_data.json";
const locationData = locationDataRaw as Record<string, any>;

interface LocationStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const LocationStep = ({
  data,
  updateData,
  onNext,
  onBack,
}: LocationStepProps) => {
  const { toast } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [districts, setDistricts] = useState<string[]>([]);
  const [subdistricts, setSubdistricts] = useState<string[]>([]);
  const [villages, setVillages] = useState<string[]>([]);

  // 1) load districts on mount
  useEffect(() => {
    const districtList = Object.keys(locationData.Maharashtra || {});
    setDistricts(districtList);

    // If we already have district/subdistrict prefilled (from firestore),
    // populate dependent lists without wiping the user's values.
    if (data.district) {
      const subObj = locationData.Maharashtra?.[data.district] || {};
      const subList = Object.keys(subObj);
      setSubdistricts(subList);

      if (data.subdistrict && subList.includes(data.subdistrict)) {
        const villageArr =
          locationData.Maharashtra?.[data.district]?.[data.subdistrict] || [];
        setVillages(villageArr);
        // preserve data.village only if valid
        if (!data.village || !villageArr.includes(data.village)) {
          // if existing village isn't valid for this subdistrict, clear it
          updateData({ village: "" });
        }
      } else {
        // if stored subdistrict is invalid, clear it & village
        updateData({ subdistrict: "", village: "" });
        setVillages([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) when district changes (either by user or prefilled), update subdistrict list
  useEffect(() => {
    if (!data.district) {
      setSubdistricts([]);
      setVillages([]);
      // clear dependent selections
      updateData({ subdistrict: "", village: "" });
      return;
    }

    const subObj = locationData.Maharashtra?.[data.district] || {};
    const subList = Object.keys(subObj);
    setSubdistricts(subList);

    // If the current subdistrict is still valid for the new district, keep it.
    if (data.subdistrict && subList.includes(data.subdistrict)) {
      // populate villages for that subdistrict (handled by next effect)
      return;
    }

    // otherwise clear subdistrict & village (user must reselect)
    updateData({ subdistrict: "", village: "" });
    setVillages([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.district]);

  // 3) when subdistrict changes, update villages
  useEffect(() => {
    if (!data.district || !data.subdistrict) {
      setVillages([]);
      if (!data.subdistrict) updateData({ village: "" });
      return;
    }

    const villageArr =
      locationData.Maharashtra?.[data.district]?.[data.subdistrict] || [];
    setVillages(villageArr);

    // keep village only if it exists in the new list
    if (data.village && villageArr.includes(data.village)) {
      // ok - keep
      return;
    }

    // otherwise clear village so user can pick the correct one
    updateData({ village: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.subdistrict, data.district]);

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!data.district) newErrors.district = "District is required";
    if (!data.subdistrict) newErrors.subdistrict = "Subdistrict is required";
    if (!data.village) newErrors.village = "Village is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext();
    } else {
      toast({
        title: "Please complete all fields",
        description: "All location fields are required.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-sm sm:max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">
          Location Information
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Please provide your location details
        </p>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6 pb-6">
        {/* District */}
        <div className="space-y-1">
          <Label className="text-sm">District *</Label>
          <Select
            value={data.district || ""}
            onValueChange={(value) => updateData({ district: value })}
          >
            <SelectTrigger
              className={`w-full ${
                errors.district ? "border-destructive" : ""
              }`}
            >
              <SelectValue placeholder="Select District" />
            </SelectTrigger>
            <SelectContent className="z-50 max-h-60 overflow-y-auto">
              {districts.map((district) => (
                <SelectItem
                  key={district}
                  value={district}
                  className="truncate"
                >
                  {district}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.district && (
            <p className="text-xs text-destructive">{errors.district}</p>
          )}
        </div>

        {/* Subdistrict */}
        <div className="space-y-1">
          <Label className="text-sm">Taluka *</Label>
          <Select
            value={data.subdistrict || ""}
            onValueChange={(value) => updateData({ subdistrict: value })}
            disabled={!data.district}
          >
            <SelectTrigger
              className={`w-full ${
                errors.subdistrict ? "border-destructive" : ""
              }`}
            >
              <SelectValue placeholder="Select Taluka" />
            </SelectTrigger>
            <SelectContent className="z-50 max-h-60 overflow-y-auto">
              {subdistricts.map((sub) => (
                <SelectItem
                  key={sub}
                  value={sub}
                  className="truncate"
                >
                  {sub}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.subdistrict && (
            <p className="text-xs text-destructive">{errors.subdistrict}</p>
          )}
        </div>

        {/* Village */}
        <div className="space-y-1">
          <Label className="text-sm">Village *</Label>
          <Select
            value={data.village || ""}
            onValueChange={(value) => updateData({ village: value })}
            disabled={!data.subdistrict}
          >
            <SelectTrigger
              className={`w-full ${errors.village ? "border-destructive" : ""}`}
            >
              <SelectValue placeholder="Select Village" />
            </SelectTrigger>
            <SelectContent className="z-50 max-h-60 overflow-y-auto">
              {villages.map((village) => (
                <SelectItem
                  key={village}
                  value={village}
                  className="truncate"
                >
                  {village}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.village && (
            <p className="text-xs text-destructive">{errors.village}</p>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="w-full sm:w-auto flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            className="w-full sm:w-auto flex-1"
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationStep;
