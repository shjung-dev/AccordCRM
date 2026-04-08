package com.example.user_service.dto;

import jakarta.validation.constraints.*;
import lombok.Data;


@Data
public class UserCreateRequest {
    
    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 50, message = "First name must be between 2 and 50 characters")
    private String firstName;
    
    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 50, message = "Last name must be between 2 and 50 characters")
    private String lastName;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String emailAddress;

    @Pattern(regexp = "^\\+?[0-9]{7,20}$", message = "Invalid phone number format. Use digits only, optionally starting with +, 7-20 characters")
    private String phoneNumber;
    
    @NotNull(message = "isAdmin flag is required")
    private Boolean isAdmin;
    
}
