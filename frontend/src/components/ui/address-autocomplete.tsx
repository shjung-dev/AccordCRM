"use client";

import usePlacesAutocomplete, {
  getGeocode,
} from "use-places-autocomplete";
import { Input } from "@/components/ui/input";
import { useLoadScript } from "@react-google-maps/api";
import { useState, useRef, useCallback, useEffect } from "react";

const libraries: ("places")[] = ["places"];

interface PlaceParts {
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onPlaceSelect?: (parts: PlaceParts) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

function extractAddressParts(
  addressComponents: google.maps.GeocoderAddressComponent[]
): PlaceParts {
  const get = (type: string) =>
    addressComponents.find((c) => c.types.includes(type))?.long_name || "";

  const streetNumber = get("street_number");
  const route = get("route");
  const address = streetNumber ? `${streetNumber} ${route}` : route;

  return {
    address,
    city:
      get("locality") ||
      get("sublocality_level_1") ||
      get("administrative_area_level_2"),
    state: get("administrative_area_level_1"),
    postalCode: get("postal_code"),
    country: get("country"),
  };
}

function AutocompleteInput({
  value,
  onChange,
  onBlur,
  onPlaceSelect,
  className,
  placeholder,
  id,
  ...ariaProps
}: AddressAutocompleteProps) {
  const {
    ready,
    suggestions: { status, data },
    setValue: setAutocompleteValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    debounce: 300,
    requestOptions: {},
  });

  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setAutocompleteValue(value, false);
  }, [value, setAutocompleteValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setAutocompleteValue(val);
    setShowDropdown(true);
    setActiveIndex(-1);
  };

  const handleSelect = useCallback(
    async (placeId: string, description: string) => {
      clearSuggestions();
      setShowDropdown(false);
      setActiveIndex(-1);

      onChange(description);

      if (onPlaceSelect) {
        try {
          const results = await getGeocode({ placeId });
          if (results[0]) {
            const parts = extractAddressParts(results[0].address_components);
            onPlaceSelect({
              ...parts,
              address: parts.address || description,
            });
          }
        } catch (error) {
          console.error("Error fetching place details:", error);
          onPlaceSelect({
            address: description,
            city: "",
            state: "",
            postalCode: "",
            country: "",
          });
        }
      }
    },
    [clearSuggestions, onChange, onPlaceSelect]
  );

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setShowDropdown(false);
      setActiveIndex(-1);
      onBlur?.();
    }, 200);
  };

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    if (value && status === "OK" && data.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || data.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < data.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : data.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const item = data[activeIndex];
      handleSelect(item.place_id, item.description);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  };

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const hasSuggestions = status === "OK" && data.length > 0;

  return (
    <div className="address-autocomplete-wrapper">
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        className={className}
        disabled={!ready}
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown && hasSuggestions}
        aria-haspopup="listbox"
        aria-controls={id ? `${id}-listbox` : undefined}
        aria-activedescendant={
          activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined
        }
        {...ariaProps}
      />
      {showDropdown && hasSuggestions && (
        <ul
          ref={dropdownRef}
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="address-autocomplete-dropdown"
        >
          {data.map((suggestion, index) => (
            <li
              key={suggestion.place_id}
              id={`suggestion-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`address-autocomplete-item ${
                index === activeIndex ? "active" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(suggestion.place_id, suggestion.description);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="address-autocomplete-main">
                {suggestion.structured_formatting.main_text}
              </span>
              <span className="address-autocomplete-secondary">
                {suggestion.structured_formatting.secondary_text}
              </span>
            </li>
          ))}
          <li className="address-autocomplete-attribution">
            Powered by Google
          </li>
        </ul>
      )}
    </div>
  );
}

export function AddressAutocomplete(props: AddressAutocompleteProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <Input
        id={props.id}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onBlur={props.onBlur}
        className={props.className}
        aria-invalid={props["aria-invalid"]}
        aria-describedby={props["aria-describedby"]}
      />
    );
  }

  return (
    <AddressAutocompleteWithScript apiKey={apiKey} {...props} />
  );
}

function AddressAutocompleteWithScript({
  apiKey,
  ...props
}: AddressAutocompleteProps & { apiKey: string }) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });

  if (loadError || !isLoaded) {
    return (
      <Input
        id={props.id}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onBlur={props.onBlur}
        className={props.className}
        aria-invalid={props["aria-invalid"]}
        aria-describedby={props["aria-describedby"]}
      />
    );
  }

  return <AutocompleteInput {...props} />;
}
