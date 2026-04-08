"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { usersApi } from "@/lib/api";
import { Trash2 } from "lucide-react";
import type { ApiUser } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import "react-phone-number-input/style.css";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { E164Number } from "libphonenumber-js/core";
import { BackButton } from "@/components/ui/back-button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";


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

const emptyDefaults: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
};

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

export default function EditAgentPage() {
  const [agentId, setAgentId] = useState<string>('');
  const { user } = useAuth();

  useEffect(() => {
    const segments = window.location.pathname.split('/');
    const id = segments[segments.length - 2];
    setAgentId(id);
  }, []);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const initialValuesRef = useRef<FormData>(emptyDefaults);

  const [formData, setFormData] = useState<FormData>(emptyDefaults);
  const [touched, setTouched] = useState<TouchedFields>({});
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!user) return;
    if (!agentId || agentId === '_') return;

    async function fetchAgent() {
      try {
        const apiUser = (await usersApi.getById(agentId)) as ApiUser;
        if (apiUser.isAdmin) {
          toast.error("This user is not an agent");
          router.replace("/admin/agents");
          return;
        }
        const defaults: FormData = {
          firstName: apiUser.firstName || "",
          lastName: apiUser.lastName || "",
          email: apiUser.emailAddress || "",
          phoneNumber: apiUser.phoneNumber || "",
        };
        initialValuesRef.current = defaults;
        setFormData(defaults);
      } catch {
        toast.error("Failed to load agent data");
        router.replace("/admin/agents");
      } finally {
        setLoading(false);
      }
    }

    fetchAgent();
  }, [agentId, user, router]);

  const validateField = useCallback(
    (field: keyof FormData, value: string): string | undefined => {
      switch (field) {
        case "firstName":
          if (!value.trim()) return "First name is required";
          if (value.trim().length < 2) return "First name must be at least 2 characters";
          if (!/^[a-zA-Z\s'-]+$/.test(value))
            return "First name can only contain letters, spaces, hyphens, and apostrophes";
          return undefined;
        case "lastName":
          if (!value.trim()) return "Last name is required";
          if (value.trim().length < 2) return "Last name must be at least 2 characters";
          if (!/^[a-zA-Z\s'-]+$/.test(value))
            return "Last name can only contain letters, spaces, hyphens, and apostrophes";
          return undefined;
        case "email":
          if (!value.trim()) return "Email is required";
          if (!validateEmail(value.trim())) return "Please enter a valid email address";
          return undefined;
        case "phoneNumber":
          if (value && !isValidPhoneNumber(value)) return "Please enter a valid phone number";
          return undefined;
        default:
          return undefined;
      }
    },
    []
  );

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

  const hasChanges = (Object.keys(emptyDefaults) as Array<keyof FormData>).some(
    (key) => formData[key] !== initialValuesRef.current[key]
  );

  const isFormValid = useMemo(() => {
    const requiredFields: Array<keyof FormData> = ["firstName", "lastName", "email"];
    const allFilled = requiredFields.every((field) => formData[field].trim() !== "");
    if (!allFilled) return false;
    const noErrors = requiredFields.every((field) => !validateField(field, formData[field]));
    if (!noErrors) return false;
    if (formData.phoneNumber && !isValidPhoneNumber(formData.phoneNumber)) return false;
    return true;
  }, [formData, validateField]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const allTouched: TouchedFields = {};
    Object.keys(formData).forEach((key) => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    const newErrors: FormErrors = {};
    let valid = true;
    (Object.keys(formData) as Array<keyof FormData>).forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        valid = false;
      }
    });
    setErrors(newErrors);

    if (!valid) {
      toast.error("Please fix the errors in the form before submitting");
      return;
    }

    const initial = initialValuesRef.current;
    const diff: Record<string, string | undefined> = {};

    if (formData.firstName.trim() !== initial.firstName) diff.firstName = formData.firstName.trim();
    if (formData.lastName.trim() !== initial.lastName) diff.lastName = formData.lastName.trim();
    if (formData.email.trim() !== initial.email) diff.emailAddress = formData.email.trim();
    if (formData.phoneNumber !== initial.phoneNumber) diff.phoneNumber = formData.phoneNumber || undefined;

    if (Object.keys(diff).length === 0) {
      toast.info("No changes to save");
      return;
    }

    setIsSubmitting(true);
    try {
      await usersApi.update(agentId, diff);
      toast.success("Agent updated successfully");
      router.push(`/admin/agents/${agentId}`);
    } catch {
      toast.error("Failed to update agent. Please try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      setShowConfirmModal(true);
    } else {
      router.back();
    }
  };

  const handleConfirmDiscard = () => {
    setShowConfirmModal(false);
    router.back();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await usersApi.delete(agentId);
      toast.success("Agent deleted successfully");
      router.push("/admin/agents");
    } catch {
      toast.error("Failed to delete agent. Please try again");
    } finally {
      setIsDeleting(false);
    }
  };

  const getInputClassName = (field: keyof FormData) => {
    const baseClass = "rounded-xl";
    if (touched[field] && errors[field]) {
      return `${baseClass} border-red-500 focus-visible:ring-red-500`;
    }
    return baseClass;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </div>
        <Card className="max-w-2xl">
          <CardHeader>
            <div className="h-6 w-40 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BackButton onClick={handleCancel} />
        <h1 className="text-xl font-medium leading-none">Edit Agent</h1>
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
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  onBlur={() => handleBlur("firstName")}
                  className={getInputClassName("firstName")}
                  aria-invalid={touched.firstName && !!errors.firstName}
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
                />
                {touched.lastName && <ErrorMessage message={errors.lastName} />}
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
                />
                {touched.phoneNumber && <ErrorMessage message={errors.phoneNumber} />}
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="primary"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setShowDeleteModal(true)}
                disabled={isSubmitting || isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Agent
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={isSubmitting || isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || isDeleting || !hasChanges || !isFormValid}
                >
                  {isSubmitting ? "Saving..." : "Confirm Edits"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmDiscard}
        title="Discard changes?"
        message="You have unsaved changes. If you go back now, your changes will not be saved."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        variant="warning"
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        itemName={`${initialValuesRef.current.firstName} ${initialValuesRef.current.lastName}`.trim() || "Agent"}
        title="Delete Agent"
        confirmationWord="delete"
        showReasonSelection={false}
        isLoading={isDeleting}
        consequences={[
          "This agent's profile will be permanently deleted",
          "Their clients will need to be reassigned to another agent",
          "This action cannot be undone",
        ]}
      />
    </div>
  );
}
