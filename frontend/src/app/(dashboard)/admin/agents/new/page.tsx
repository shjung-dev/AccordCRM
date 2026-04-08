"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { usersApi, ApiError } from "@/lib/api";
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

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
}

interface TouchedFields {
  [key: string]: boolean;
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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

export default function CreateAgentPage() {
  const router = useRouter();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
  });

  const [touched, setTouched] = useState<TouchedFields>({});
  const [errors, setErrors] = useState<FormErrors>({});

  const validateField = useCallback(
    (field: keyof FormData, value: string): string | undefined => {
      switch (field) {
        case "firstName":
          if (!value.trim()) return "First name is required";
          if (value.trim().length < 2)
            return "First name must be at least 2 characters";
          if (!/^[a-zA-Z\s'-]+$/.test(value))
            return "First name can only contain letters, spaces, hyphens, and apostrophes";
          return undefined;

        case "lastName":
          if (!value.trim()) return "Last name is required";
          if (value.trim().length < 2)
            return "Last name must be at least 2 characters";
          if (!/^[a-zA-Z\s'-]+$/.test(value))
            return "Last name can only contain letters, spaces, hyphens, and apostrophes";
          return undefined;

        case "email":
          if (!value.trim()) return "Email is required";
          if (!validateEmail(value))
            return "Please enter a valid email address";
          return undefined;

        case "phoneNumber":
          if (value && !isValidPhoneNumber(value))
            return "Please enter a valid phone number";
          return undefined;

        default:
          return undefined;
      }
    },
    []
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    (Object.keys(formData) as Array<keyof FormData>).forEach((field) => {
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
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const isFormValid = useMemo(() => {
    const requiredFields: Array<keyof FormData> = [
      "firstName",
      "lastName",
      "email",
    ];
    const allFilled = requiredFields.every(
      (field) => formData[field].trim() !== ""
    );
    if (!allFilled) return false;
    const noRequiredErrors = requiredFields.every(
      (field) => !validateField(field, formData[field])
    );
    if (!noRequiredErrors) return false;
    if (formData.phoneNumber && !isValidPhoneNumber(formData.phoneNumber)) return false;
    return true;
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

    try {
      await usersApi.create({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        emailAddress: formData.email.trim(),
        phoneNumber: formData.phoneNumber || undefined,
        isAdmin: false,
      });
      toast.success("Agent created successfully");
      router.push("/admin/agents");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to create agent. Please try again");
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
        <h1 className="text-xl font-medium leading-none">
          Create a New Agent
        </h1>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Agent Information</CardTitle>
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
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                  onBlur={() => handleBlur("firstName")}
                  className={getInputClassName("firstName")}
                  aria-invalid={touched.firstName && !!errors.firstName}
                  aria-describedby={
                    errors.firstName ? "firstName-error" : undefined
                  }
                />
                {touched.firstName && (
                  <ErrorMessage message={errors.firstName} />
                )}
              </div>

              <div>
                <Label htmlFor="lastName" className="text-sm block mb-2">
                  Last Name<RequiredIndicator />
                </Label>
                <Input
                  id="lastName"
                  placeholder="Appleseed"
                  value={formData.lastName}
                  onChange={(e) =>
                    handleInputChange("lastName", e.target.value)
                  }
                  onBlur={() => handleBlur("lastName")}
                  className={getInputClassName("lastName")}
                  aria-invalid={touched.lastName && !!errors.lastName}
                  aria-describedby={
                    errors.lastName ? "lastName-error" : undefined
                  }
                />
                {touched.lastName && (
                  <ErrorMessage message={errors.lastName} />
                )}
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
                  Phone Number
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
              <Button type="submit" disabled={isSubmitting || !isFormValid}>
                {isSubmitting ? "Creating..." : "Create Agent"}
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
