"use client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  validatePostalCodeForCountry,
  validateStateForCountry,
  getStateOptions,
  normalizeCountry,
} from "@/lib/address-validation";
import { validateIdentificationNumber } from "@/lib/id-validation";

import { toast } from "sonner";
import { clientsApi, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import "react-phone-number-input/style.css";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useMemo } from "react";
import type { E164Number } from "libphonenumber-js/core";
import { BackButton } from "@/components/ui/back-button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

interface FormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  identificationNumber: string;
  gender: string;
  email: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  identificationNumber?: string;
  gender?: string;
  email?: string;
  phoneNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface TouchedFields {
  [key: string]: boolean;
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const getAge = (birthDate: Date, today: Date): number => {
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const validateDateOfBirth = (dob: string): { valid: boolean; message?: string } => {
  if (!dob) return { valid: false, message: "Date of birth is required" };

  const date = new Date(dob);
  const today = new Date();

  if (isNaN(date.getTime())) {
    return { valid: false, message: "Please enter a valid date" };
  }
  if (date > today) {
    return { valid: false, message: "Date of birth cannot be in the future" };
  }

  const age = getAge(date, today);
  if (age < 18) {
    return { valid: false, message: "Client must be at least 18 years old" };
  }
  if (age > 120) {
    return { valid: false, message: "Please enter a valid date of birth" };
  }

  return { valid: true };
};

function RequiredIndicator() {
  return <span className="text-red-500 ml-0.5">*</span>;
}

function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-red-500 mt-1" role="alert">
      {message}
    </p>
  );
}

export default function CreateClientPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    identificationNumber: "",
    gender: "",
    email: "",
    phoneNumber: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });

  const [touched, setTouched] = useState<TouchedFields>({});
  const [errors, setErrors] = useState<FormErrors>({});

  const validateField = useCallback((field: keyof FormData, value: string, country?: string): string | undefined => {
    switch (field) {
      case "firstName":
        if (!value.trim()) return "First name is required";
        if (value.trim().length < 2) return "First name must be at least 2 characters";
        if (!/^[a-zA-Z\s'-]+$/.test(value)) return "First name can only contain letters, spaces, hyphens, and apostrophes";
        return undefined;

      case "lastName":
        if (!value.trim()) return "Last name is required";
        if (value.trim().length < 2) return "Last name must be at least 2 characters";
        if (!/^[a-zA-Z\s'-]+$/.test(value)) return "Last name can only contain letters, spaces, hyphens, and apostrophes";
        return undefined;

      case "dateOfBirth":
        const dobValidation = validateDateOfBirth(value);
        return dobValidation.valid ? undefined : dobValidation.message;

      case "identificationNumber": {
        const idResult = validateIdentificationNumber(value, country ?? formData.country);
        return idResult.valid ? undefined : idResult.message;
      }

      case "gender":
        if (!value) return "Gender is required";
        if (!["Male", "Female", "Non-binary", "Prefer not to say"].includes(value)) {
          return "Please select a valid gender";
        }
        return undefined;

      case "email":
        if (!value.trim()) return "Email is required";
        if (!validateEmail(value)) return "Please enter a valid email address";
        return undefined;

      case "phoneNumber":
        if (!value) return "Phone number is required";
        if (!isValidPhoneNumber(value)) return "Please enter a valid phone number";
        return undefined;

      case "addressLine1":
        if (!value.trim()) return "Address is required";
        if (value.trim().length < 5) return "Please enter a complete address";
        return undefined;

      case "city":
        if (!value.trim()) return "City is required";
        if (value.trim().length < 2) return "City must be at least 2 characters";
        return undefined;

      case "state": {
        if (!value.trim()) return "State is required";
        const stateResult = validateStateForCountry(value, country ?? formData.country);
        return stateResult.valid ? undefined : stateResult.message;
      }

      case "postalCode": {
        if (!value.trim()) return "Postal code is required";
        const postalResult = validatePostalCodeForCountry(value, country ?? formData.country);
        return postalResult.valid ? undefined : postalResult.message;
      }

      case "country":
        if (!value.trim()) return "Country is required";
        if (!normalizeCountry(value)) return "Please enter a valid country name (e.g., Singapore, United States)";
        return undefined;

      default:
        return undefined;
    }
  }, [formData.country]);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    (Object.keys(formData) as Array<keyof FormData>).forEach((field) => {
      if (field === "addressLine2") return;
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [formData, validateField]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (touched[field]) {
      const error = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: error }));
    }

    if (field === "country") {
      const newErrors: Partial<FormErrors> = {};
      if (touched.postalCode) {
        newErrors.postalCode = validateField("postalCode", formData.postalCode, value);
      }
      if (touched.state) {
        newErrors.state = validateField("state", formData.state, value);
      }
      if (touched.identificationNumber) {
        newErrors.identificationNumber = validateField("identificationNumber", formData.identificationNumber, value);
      }
      setErrors((prev) => ({ ...prev, ...newErrors }));

      const newStateOptions = getStateOptions(value);
      if (newStateOptions && formData.state) {
        const match = newStateOptions.some(
          (opt) => opt.value.toLowerCase() === formData.state.trim().toLowerCase()
        );
        if (!match) {
          setFormData((prev) => ({ ...prev, state: "" }));
          if (touched.state) {
            setErrors((prev) => ({ ...prev, state: "State is required" }));
          }
        }
      }
    }
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const isFormValid = useMemo(() => {
    const requiredFields = Object.keys(formData).filter((f) => f !== "addressLine2") as Array<keyof FormData>;
    const allFilled = requiredFields.every((field) => formData[field].trim() !== "");
    if (!allFilled) return false;
    return requiredFields.every((field) => !validateField(field, formData[field]));
  }, [formData, validateField]);

  const hasChanges = Object.values(formData).some((value) => value !== "");

  const handleBackClick = () => {
    if (hasChanges) {
      setShowConfirmModal(true);
    } else {
      router.back();
    }
  };

  const handleConfirmBack = () => {
    setShowConfirmModal(false);
    router.back();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allTouched: TouchedFields = {};
    Object.keys(formData).forEach((key) => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    if (!validateForm()) {
      toast.error("Please fix the errors in the form before submitting");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      emailAddress: formData.email.trim(),
      phoneNumber: formData.phoneNumber,
      address: formData.addressLine2
        ? `${formData.addressLine1.trim()}, ${formData.addressLine2.trim()}`
        : formData.addressLine1.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      country: formData.country.trim(),
      postalCode: formData.postalCode.trim(),
      assignedAgentId: user!.id,
      identificationNumber: formData.identificationNumber.trim(),
    };

    try {
      await clientsApi.create(payload);
      toast.success("Client created successfully");
      router.push("/agent/clients");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to create client. Please try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInputClassName = (field: keyof FormData) => {
    const baseClass = "rounded-xl";
    if (touched[field] && errors[field]) {
      return `${baseClass} border-red-500 focus-visible:ring-red-500`;
    }
    return baseClass;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BackButton onClick={handleBackClick} />
        <h1 className="text-xl font-medium leading-none">Create a New Client</h1>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Fields marked with <span className="text-red-500">*</span> are required
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="firstName" className="text-sm block mb-2">
                  First Name<RequiredIndicator />
                </Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  onBlur={() => handleBlur("firstName")}
                  className={getInputClassName("firstName")}
                  aria-invalid={touched.firstName && !!errors.firstName}
                  aria-describedby={errors.firstName ? "firstName-error" : undefined}
                />
                {touched.firstName && <ErrorMessage message={errors.firstName} />}
              </div>

              <div>
                <Label htmlFor="lastName" className="text-sm block mb-2">
                  Last Name<RequiredIndicator />
                </Label>
                <Input
                  id="lastName"
                  placeholder="Appleseed"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  onBlur={() => handleBlur("lastName")}
                  className={getInputClassName("lastName")}
                  aria-invalid={touched.lastName && !!errors.lastName}
                  aria-describedby={errors.lastName ? "lastName-error" : undefined}
                />
                {touched.lastName && <ErrorMessage message={errors.lastName} />}
              </div>

              <div>
                <Label htmlFor="dateOfBirth" className="text-sm block mb-2">
                  Date of Birth<RequiredIndicator />
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                  onBlur={() => handleBlur("dateOfBirth")}
                  className={getInputClassName("dateOfBirth")}
                  max={new Date().toISOString().split("T")[0]}
                  aria-invalid={touched.dateOfBirth && !!errors.dateOfBirth}
                  aria-describedby={errors.dateOfBirth ? "dateOfBirth-error" : undefined}
                />
                {touched.dateOfBirth && <ErrorMessage message={errors.dateOfBirth} />}
              </div>

              <div>
                <Label htmlFor="gender" className="text-sm block mb-2">
                  Gender<RequiredIndicator />
                </Label>
                <Select
                  value={formData.gender || undefined}
                  onValueChange={(value) => {
                    setFormData((prev) => ({ ...prev, gender: value }));
                    setTouched((prev) => ({ ...prev, gender: true }));
                    setErrors((prev) => ({ ...prev, gender: validateField("gender", value) }));
                  }}
                >
                  <SelectTrigger
                    id="gender"
                    className={`rounded-xl ${touched.gender && errors.gender ? "border-red-500" : ""}`}
                    aria-invalid={touched.gender && !!errors.gender}
                  >
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Non-binary">Non-binary</SelectItem>
                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
                {touched.gender && <ErrorMessage message={errors.gender} />}
              </div>

              <div>
                <Label htmlFor="email" className="text-sm block mb-2">
                  Email<RequiredIndicator />
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  className={getInputClassName("email")}
                  aria-invalid={touched.email && !!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {touched.email && <ErrorMessage message={errors.email} />}
              </div>

              <div>
                <Label htmlFor="phoneNumber" className="text-sm block mb-2">
                  Phone Number<RequiredIndicator />
                </Label>
                <PhoneInput
                  id="phoneNumber"
                  international
                  defaultCountry="SG"
                  placeholder="Enter phone number"
                  value={formData.phoneNumber as E164Number | undefined}
                  onChange={(value) => handleInputChange("phoneNumber", value || "")}
                  onBlur={() => handleBlur("phoneNumber")}
                  className={`phone-input-custom ${touched.phoneNumber && errors.phoneNumber ? "phone-input-error" : ""}`}
                  aria-invalid={touched.phoneNumber && !!errors.phoneNumber}
                  aria-describedby={errors.phoneNumber ? "phoneNumber-error" : undefined}
                />
                {touched.phoneNumber && <ErrorMessage message={errors.phoneNumber} />}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="identificationNumber" className="text-sm block mb-2">
                  Identification Number<RequiredIndicator />
                </Label>
                <Input
                  id="identificationNumber"
                  placeholder="Enter identification number"
                  value={formData.identificationNumber}
                  onChange={(e) => handleInputChange("identificationNumber", e.target.value)}
                  onBlur={() => handleBlur("identificationNumber")}
                  className={getInputClassName("identificationNumber")}
                  aria-invalid={touched.identificationNumber && !!errors.identificationNumber}
                  aria-describedby={errors.identificationNumber ? "identificationNumber-error" : undefined}
                />
                {touched.identificationNumber && <ErrorMessage message={errors.identificationNumber} />}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="addressLine1" className="text-sm block mb-2">
                  Address Line 1<RequiredIndicator />
                </Label>
                <AddressAutocomplete
                  id="addressLine1"
                  placeholder="Enter street address"
                  value={formData.addressLine1}
                  onChange={(value) => handleInputChange("addressLine1", value)}
                  onBlur={() => handleBlur("addressLine1")}
                  onPlaceSelect={(parts) => {
                    setFormData((prev) => ({
                      ...prev,
                      addressLine1: parts.address,
                      city: parts.city,
                      state: parts.state,
                      postalCode: parts.postalCode,
                      country: parts.country,
                    }));
                    setTouched((prev) => ({
                      ...prev,
                      addressLine1: true,
                      city: true,
                      state: true,
                      postalCode: true,
                      country: true,
                    }));
                    setErrors((prev) => ({
                      ...prev,
                      addressLine1: validateField("addressLine1", parts.address),
                      city: validateField("city", parts.city),
                      state: validateField("state", parts.state, parts.country),
                      postalCode: validateField("postalCode", parts.postalCode, parts.country),
                      country: validateField("country", parts.country),
                      ...(prev.identificationNumber !== undefined || touched.identificationNumber
                        ? { identificationNumber: validateField("identificationNumber", formData.identificationNumber, parts.country) }
                        : {}),
                    }));
                  }}
                  className={getInputClassName("addressLine1")}
                  aria-invalid={touched.addressLine1 && !!errors.addressLine1}
                  aria-describedby={errors.addressLine1 ? "addressLine1-error" : undefined}
                />
                {touched.addressLine1 && <ErrorMessage message={errors.addressLine1} />}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="addressLine2" className="text-sm block mb-2">
                  Address Line 2
                </Label>
                <Input
                  id="addressLine2"
                  placeholder="Apartment, suite, unit, etc. (optional)"
                  value={formData.addressLine2}
                  onChange={(e) => handleInputChange("addressLine2", e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="city" className="text-sm block mb-2">
                  City<RequiredIndicator />
                </Label>
                <Input
                  id="city"
                  placeholder="Singapore"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  onBlur={() => handleBlur("city")}
                  className={getInputClassName("city")}
                  aria-invalid={touched.city && !!errors.city}
                  aria-describedby={errors.city ? "city-error" : undefined}
                />
                {touched.city && <ErrorMessage message={errors.city} />}
              </div>

              <div>
                <Label htmlFor="state" className="text-sm block mb-2">
                  State/Province<RequiredIndicator />
                </Label>
                {(() => {
                  const stateOptions = getStateOptions(formData.country);
                  if (stateOptions) {
                    return (
                      <Select
                        value={formData.state || undefined}
                        onValueChange={(value) => {
                          setFormData((prev) => ({ ...prev, state: value }));
                          setTouched((prev) => ({ ...prev, state: true }));
                          setErrors((prev) => ({ ...prev, state: validateField("state", value) }));
                        }}
                      >
                        <SelectTrigger
                          id="state"
                          className={`rounded-xl ${touched.state && errors.state ? "border-red-500" : ""}`}
                          aria-invalid={touched.state && !!errors.state}
                        >
                          <SelectValue placeholder="Select state/province" />
                        </SelectTrigger>
                        <SelectContent>
                          {stateOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  }
                  return (
                    <Input
                      id="state"
                      placeholder="Enter state/province"
                      value={formData.state}
                      onChange={(e) => handleInputChange("state", e.target.value)}
                      onBlur={() => handleBlur("state")}
                      className={getInputClassName("state")}
                      aria-invalid={touched.state && !!errors.state}
                      aria-describedby={errors.state ? "state-error" : undefined}
                    />
                  );
                })()}
                {touched.state && <ErrorMessage message={errors.state} />}
              </div>

              <div>
                <Label htmlFor="postalCode" className="text-sm block mb-2">
                  Postal Code<RequiredIndicator />
                </Label>
                <Input
                  id="postalCode"
                  placeholder="123456"
                  value={formData.postalCode}
                  onChange={(e) => handleInputChange("postalCode", e.target.value)}
                  onBlur={() => handleBlur("postalCode")}
                  className={getInputClassName("postalCode")}
                  maxLength={10}
                  aria-invalid={touched.postalCode && !!errors.postalCode}
                  aria-describedby={errors.postalCode ? "postalCode-error" : undefined}
                />
                {touched.postalCode && <ErrorMessage message={errors.postalCode} />}
              </div>

              <div>
                <Label htmlFor="country" className="text-sm block mb-2">
                  Country<RequiredIndicator />
                </Label>
                <Input
                  id="country"
                  placeholder="Singapore"
                  value={formData.country}
                  onChange={(e) => handleInputChange("country", e.target.value)}
                  onBlur={() => handleBlur("country")}
                  className={getInputClassName("country")}
                  aria-invalid={touched.country && !!errors.country}
                  aria-describedby={errors.country ? "country-error" : undefined}
                />
                {touched.country && <ErrorMessage message={errors.country} />}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={handleBackClick}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !isFormValid}
              >
                {isSubmitting ? "Creating..." : "Create Client"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmBack}
        title="Discard changes?"
        message="You have unsaved changes. If you go back now, your changes will not be saved."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        variant="warning"
      />
    </div>
  );
}
