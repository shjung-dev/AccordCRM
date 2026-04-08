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

import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { clientsApi, ApiError } from "@/lib/api";
import type { ApiClient } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import "react-phone-number-input/style.css";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useForm, Controller } from "react-hook-form";
import type { E164Number } from "libphonenumber-js/core";
import { BackButton } from "@/components/ui/back-button";
import { useEffect, useState, useRef, useMemo } from "react";
import { validateIdentificationNumber } from "@/lib/id-validation";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";

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

const emptyDefaults: FormData = {
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
};

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

function getInputClassName(hasError: boolean) {
  const baseClass = "rounded-xl";
  if (hasError) {
    return `${baseClass} border-red-500 focus-visible:ring-red-500`;
  }
  return baseClass;
}

export default function EditClientPage() {
  const clientId = window.location.pathname.split("/").at(-2) ?? "";
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const initialValuesRef = useRef<FormData>(emptyDefaults);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    trigger,
    formState: { isSubmitting, touchedFields },
  } = useForm<FormData>({
    mode: "onTouched",
    defaultValues: emptyDefaults,
  });

  const watchedValues = watch();
  const country = watchedValues.country;

  const prevCountryRef = useRef<string>("");
  useEffect(() => {
    if (prevCountryRef.current && prevCountryRef.current !== country) {
      if (touchedFields.postalCode) trigger("postalCode");
      if (touchedFields.state) trigger("state");
      if (touchedFields.identificationNumber) trigger("identificationNumber");
    }
    prevCountryRef.current = country;
  }, [country, trigger, touchedFields.postalCode, touchedFields.state, touchedFields.identificationNumber]);

  useEffect(() => {
    async function fetchClient() {
      try {
        const client = (await clientsApi.getById(clientId)) as ApiClient;
        if (client.assignedAgentId !== user?.id) {
          toast.error("You do not have permission to edit this client");
          router.replace("/agent/clients");
          return;
        }
        const defaults: FormData = {
          firstName: client.firstName || "",
          lastName: client.lastName || "",
          dateOfBirth: client.dateOfBirth || "",
          gender: client.gender || "",
          email: client.emailAddress || "",
          phoneNumber: client.phoneNumber || "",
          identificationNumber: client.identificationNumber || "",
          addressLine1: client.address || "",
          addressLine2: "",
          city: client.city || "",
          state: client.state || "",
          postalCode: client.postalCode || "",
          country: client.country || "",
        };
        initialValuesRef.current = defaults;
        prevCountryRef.current = defaults.country;
        reset(defaults);
      } catch (error) {
        console.error("Failed to load client:", error);
        toast.error("Failed to load client data");
        router.replace(`/agent/clients`);
      } finally {
        setLoading(false);
      }
    }
    if (user) fetchClient();
  }, [clientId, user, router, reset]);

  const hasChanges = (Object.keys(emptyDefaults) as Array<keyof FormData>).some(
    (key) => watchedValues[key] !== initialValuesRef.current[key]
  );

  const isFormValid = useMemo(() => {
    const v = watchedValues;
    if (!v.firstName?.trim() || v.firstName.trim().length < 2 || !/^[a-zA-Z\s'-]+$/.test(v.firstName)) return false;
    if (!v.lastName?.trim() || v.lastName.trim().length < 2 || !/^[a-zA-Z\s'-]+$/.test(v.lastName)) return false;
    if (!v.dateOfBirth) return false;
    const dob = new Date(v.dateOfBirth);
    if (isNaN(dob.getTime()) || dob > new Date()) return false;
    const age = getAge(dob, new Date());
    if (age < 18 || age > 120) return false;
    if (!v.gender || !["Male", "Female", "Non-binary", "Prefer not to say"].includes(v.gender)) return false;
    if (!v.email?.trim() || !validateEmail(v.email.trim())) return false;
    if (!v.phoneNumber || !isValidPhoneNumber(v.phoneNumber)) return false;
    if (!v.identificationNumber?.trim() || !validateIdentificationNumber(v.identificationNumber.trim(), v.country).valid) return false;
    if (!v.addressLine1?.trim() || v.addressLine1.trim().length < 5) return false;
    if (!v.city?.trim() || v.city.trim().length < 2) return false;
    if (!v.country?.trim() || !normalizeCountry(v.country.trim())) return false;
    if (!v.state?.trim() || !validateStateForCountry(v.state, v.country).valid) return false;
    if (!v.postalCode?.trim() || !validatePostalCodeForCountry(v.postalCode, v.country).valid) return false;
    return true;
  }, [watchedValues]);

  const onSubmit = async (data: FormData) => {
    const initial = initialValuesRef.current;
    const diff: Record<string, string> = {};

    if (data.firstName.trim() !== initial.firstName) diff.firstName = data.firstName.trim();
    if (data.lastName.trim() !== initial.lastName) diff.lastName = data.lastName.trim();
    if (data.dateOfBirth !== initial.dateOfBirth) diff.dateOfBirth = data.dateOfBirth;
    if (data.gender !== initial.gender) diff.gender = data.gender;
    if (data.email.trim() !== initial.email) diff.emailAddress = data.email.trim();
    if (data.phoneNumber !== initial.phoneNumber) diff.phoneNumber = data.phoneNumber;
    if (data.identificationNumber.trim() !== initial.identificationNumber) diff.identificationNumber = data.identificationNumber.trim();

    const newAddress = data.addressLine2
      ? `${data.addressLine1.trim()}, ${data.addressLine2.trim()}`
      : data.addressLine1.trim();
    const oldAddress = initial.addressLine2
      ? `${initial.addressLine1.trim()}, ${initial.addressLine2.trim()}`
      : initial.addressLine1.trim();
    if (newAddress !== oldAddress) diff.address = newAddress;

    if (data.city.trim() !== initial.city) diff.city = data.city.trim();
    if (data.state.trim() !== initial.state) diff.state = data.state.trim();
    if (data.country.trim() !== initial.country) diff.country = data.country.trim();
    if (data.postalCode.trim() !== initial.postalCode) diff.postalCode = data.postalCode.trim();

    if (Object.keys(diff).length === 0) {
      toast.info("No changes to save");
      return;
    }

    try {
      await clientsApi.update(clientId, diff);
      toast.success("Client updated successfully");
      router.push(`/agent/clients/${clientId}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update client. Please try again");
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

  const handleDeleteWithReason = async (reason: string) => {
    setIsDeleting(true);
    try {
      await clientsApi.delete(clientId, reason);
      toast.success("Client deleted successfully");
      router.push("/agent/clients");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to delete client. Please try again");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePlaceSelect = (parts: {
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }) => {
    setValue("addressLine1", parts.address, { shouldValidate: true, shouldTouch: true });
    setValue("city", parts.city, { shouldValidate: true, shouldTouch: true });
    setValue("state", parts.state, { shouldValidate: true, shouldTouch: true });
    setValue("postalCode", parts.postalCode, { shouldValidate: true, shouldTouch: true });
    setValue("country", parts.country, { shouldValidate: true, shouldTouch: true });
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
              {Array.from({ length: 6 }).map((_, i) => (
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
        <h1 className="text-xl font-medium leading-none">Edit Client</h1>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Fields marked with <span className="text-red-500">*</span> are required
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="firstName" className="text-sm block mb-2">
                  First Name<RequiredIndicator />
                </Label>
                <Controller
                  name="firstName"
                  control={control}
                  rules={{
                    required: "First name is required",
                    validate: (value) => {
                      if (value.trim().length < 2) return "First name must be at least 2 characters";
                      if (!/^[a-zA-Z\s'-]+$/.test(value)) return "First name can only contain letters, spaces, hyphens, and apostrophes";
                      return true;
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <Input
                        {...field}
                        id="firstName"
                        placeholder="John"
                        className={getInputClassName(fieldState.isTouched && !!fieldState.error)}
                        aria-invalid={fieldState.isTouched && !!fieldState.error}
                      />
                      {fieldState.isTouched && <ErrorMessage message={fieldState.error?.message} />}
                    </>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="lastName" className="text-sm block mb-2">
                  Last Name<RequiredIndicator />
                </Label>
                <Controller
                  name="lastName"
                  control={control}
                  rules={{
                    required: "Last name is required",
                    validate: (value) => {
                      if (value.trim().length < 2) return "Last name must be at least 2 characters";
                      if (!/^[a-zA-Z\s'-]+$/.test(value)) return "Last name can only contain letters, spaces, hyphens, and apostrophes";
                      return true;
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <Input
                        {...field}
                        id="lastName"
                        placeholder="Appleseed"
                        className={getInputClassName(fieldState.isTouched && !!fieldState.error)}
                        aria-invalid={fieldState.isTouched && !!fieldState.error}
                      />
                      {fieldState.isTouched && <ErrorMessage message={fieldState.error?.message} />}
                    </>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="dateOfBirth" className="text-sm block mb-2">
                  Date of Birth<RequiredIndicator />
                </Label>
                <Controller
                  name="dateOfBirth"
                  control={control}
                  rules={{
                    required: "Date of birth is required",
                    validate: (value) => {
                      if (!value) return "Date of birth is required";
                      const date = new Date(value);
                      const today = new Date();
                      if (isNaN(date.getTime())) return "Please enter a valid date";
                      if (date > today) return "Date of birth cannot be in the future";
                      const age = getAge(date, today);
                      if (age < 18) return "Client must be at least 18 years old";
                      if (age > 120) return "Please enter a valid date of birth";
                      return true;
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <Input
                        {...field}
                        id="dateOfBirth"
                        type="date"
                        max={new Date().toISOString().split("T")[0]}
                        className={getInputClassName(fieldState.isTouched && !!fieldState.error)}
                        aria-invalid={fieldState.isTouched && !!fieldState.error}
                      />
                      {fieldState.isTouched && <ErrorMessage message={fieldState.error?.message} />}
                    </>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="gender" className="text-sm block mb-2">
                  Gender<RequiredIndicator />
                </Label>
                <Controller
                  name="gender"
                  control={control}
                  rules={{
                    required: "Gender is required",
                    validate: (value) => {
                      if (!["Male", "Female", "Non-binary", "Prefer not to say"].includes(value))
                        return "Please select a valid gender";
                      return true;
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <Select
                        value={field.value || undefined}
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                        onOpenChange={(open) => {
                          if (!open) field.onBlur();
                        }}
                      >
                        <SelectTrigger
                          id="gender"
                          className={`rounded-xl ${fieldState.isTouched && fieldState.error ? "border-red-500" : ""}`}
                          aria-invalid={fieldState.isTouched && !!fieldState.error}
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
                      {fieldState.isTouched && <ErrorMessage message={fieldState.error?.message} />}
                    </>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm block mb-2">
                  Email<RequiredIndicator />
                </Label>
                <Controller
                  name="email"
                  control={control}
                  rules={{
                    required: "Email is required",
                    validate: (value) => {
                      if (!validateEmail(value.trim())) return "Please enter a valid email address";
                      return true;
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        placeholder="example@email.com"
                        className={getInputClassName(fieldState.isTouched && !!fieldState.error)}
                        aria-invalid={fieldState.isTouched && !!fieldState.error}
                      />
                      {fieldState.isTouched && <ErrorMessage message={fieldState.error?.message} />}
                    </>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="phoneNumber" className="text-sm block mb-2">
                  Phone Number<RequiredIndicator />
                </Label>
                <Controller
                  name="phoneNumber"
                  control={control}
                  rules={{
                    required: "Phone number is required",
                    validate: (value) => {
                      if (!isValidPhoneNumber(value)) return "Please enter a valid phone number";
                      return true;
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <PhoneInput
                        id="phoneNumber"
                        international
                        defaultCountry="SG"
                        placeholder="Enter phone number"
                        value={field.value as E164Number | undefined}
                        onChange={(value) => field.onChange(value || "")}
                        onBlur={field.onBlur}
                        className={`phone-input-custom ${fieldState.isTouched && fieldState.error ? "phone-input-error" : ""}`}
                        aria-invalid={fieldState.isTouched && !!fieldState.error}
                      />
                      {fieldState.isTouched && <ErrorMessage message={fieldState.error?.message} />}
                    </>
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="identificationNumber" className="text-sm block mb-2">
                  Identification Number<RequiredIndicator />
                </Label>
                <Controller
                  name="identificationNumber"
                  control={control}
                  rules={{
                    required: "Identification number is required",
                    validate: (value, formValues) => {
                      const result = validateIdentificationNumber(value.trim(), formValues.country);
                      return result.valid ? true : result.message;
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <Input
                        {...field}
                        id="identificationNumber"
                        placeholder="Enter identification number"
                        className={getInputClassName(fieldState.isTouched && !!fieldState.error)}
                        aria-invalid={fieldState.isTouched && !!fieldState.error}
                      />
                      {fieldState.isTouched && <ErrorMessage message={fieldState.error?.message} />}
                    </>
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="addressLine1" className="text-sm block mb-2">
                  Address Line 1<RequiredIndicator />
                </Label>
                <Controller
                  name="addressLine1"
                  control={control}
                  rules={{
                    required: "Address is required",
                    validate: (value) => {
                      if (value.trim().length < 5) return "Please enter a complete address";
                      return true;
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <AddressAutocomplete
                        id="addressLine1"
                        placeholder="Enter street address"
                        value={field.value}
                        onChange={(value) => field.onChange(value)}
                        onBlur={field.onBlur}
                        onPlaceSelect={handlePlaceSelect}
                        className={getInputClassName(fieldState.isTouched && !!fieldState.error)}
                        aria-invalid={fieldState.isTouched && !!fieldState.error}
                      />
                      {fieldState.isTouched && <ErrorMessage message={fieldState.error?.message} />}
                    </>
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="addressLine2" className="text-sm block mb-2">
                  Address Line 2
                </Label>
                <Controller
                  name="addressLine2"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="addressLine2"
                      placeholder="Apartment, suite, unit, etc. (optional)"
                      className="rounded-xl"
                    />
                  )}
                />
              </div>

              <div>
                <Label htmlFor="city" className="text-sm block mb-2">
                  City<RequiredIndicator />
                </Label>
                <Controller
                  name="city"
                  control={control}
                  rules={{
                    required: "City is required",
                    validate: (value) => {
                      if (value.trim().length < 2) return "City must be at least 2 characters";
                      return true;
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <Input
                        {...field}
                        id="city"
                        placeholder="Singapore"
                        className={getInputClassName(fieldState.isTouched && !!fieldState.error)}
                        aria-invalid={fieldState.isTouched && !!fieldState.error}
                      />
                      {fieldState.isTouched && <ErrorMessage message={fieldState.error?.message} />}
                    </>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="state" className="text-sm block mb-2">
                  State/Province<RequiredIndicator />
                </Label>
                <Controller
                  name="state"
                  control={control}
                  rules={{
                    required: "State is required",
                    validate: (value, formValues) => {
                      const result = validateStateForCountry(value, formValues.country);
                      return result.valid ? true : result.message;
                    },
                  }}
                  render={({ field, fieldState }) => {
                    const stateOptions = getStateOptions(country);
                    if (stateOptions) {
                      return (
                        <>
                          <Select
                            value={field.value || undefined}
                            onValueChange={(value) => {
                              field.onChange(value);
                            }}
                            onOpenChange={(open) => {
                              if (!open) field.onBlur();
                            }}
                          >
                            <SelectTrigger
                              id="state"
                              className={`rounded-xl ${fieldState.isTouched && fieldState.error ? "border-red-500" : ""}`}
                              aria-invalid={fieldState.isTouched && !!fieldState.error}
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
                          {fieldState.isTouched && <ErrorMessage message={fieldState.error?.message} />}
                        </>
                      );
                    }
                    return (
                      <>
                        <Input
                          {...field}
                          id="state"
                          placeholder="Enter state/province"
                          className={getInputClassName(fieldState.isTouched && !!fieldState.error)}
                          aria-invalid={fieldState.isTouched && !!fieldState.error}
                        />
                        {fieldState.isTouched && <ErrorMessage message={fieldState.error?.message} />}
                      </>
                    );
                  }}
                />
              </div>

              <div>
                <Label htmlFor="postalCode" className="text-sm block mb-2">
                  Postal Code<RequiredIndicator />
                </Label>
                <Controller
                  name="postalCode"
                  control={control}
                  rules={{
                    required: "Postal code is required",
                    validate: (value, formValues) => {
                      const result = validatePostalCodeForCountry(value, formValues.country);
                      return result.valid ? true : result.message;
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <Input
                        {...field}
                        id="postalCode"
                        placeholder="123456"
                        maxLength={10}
                        className={getInputClassName(fieldState.isTouched && !!fieldState.error)}
                        aria-invalid={fieldState.isTouched && !!fieldState.error}
                      />
                      {fieldState.isTouched && <ErrorMessage message={fieldState.error?.message} />}
                    </>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="country" className="text-sm block mb-2">
                  Country<RequiredIndicator />
                </Label>
                <Controller
                  name="country"
                  control={control}
                  rules={{
                    required: "Country is required",
                    validate: (value) => {
                      if (!normalizeCountry(value.trim()))
                        return "Please enter a valid country name (e.g., Singapore, United States)";
                      return true;
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <Input
                        {...field}
                        id="country"
                        placeholder="Singapore"
                        className={getInputClassName(fieldState.isTouched && !!fieldState.error)}
                        aria-invalid={fieldState.isTouched && !!fieldState.error}
                      />
                      {fieldState.isTouched && <ErrorMessage message={fieldState.error?.message} />}
                    </>
                  )}
                />
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
                Delete Client
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
        onConfirm={() => {}}
        onConfirmWithReason={handleDeleteWithReason}
        itemName={`${initialValuesRef.current.firstName} ${initialValuesRef.current.lastName}`.trim() || "Client"}
        title="Delete Client"
        confirmationWord="delete"
        showReasonSelection={true}
        isLoading={isDeleting}
        consequences={[
          "This client's profile will be permanently deleted",
          "All associated transactions will be cancelled",
          "This action cannot be undone",
        ]}
      />
    </div>
  );
}
