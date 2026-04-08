package com.example.user_service.dto;

import jakarta.validation.constraints.*; 
import lombok.Data;


@Data
public class UserUpdateRequest {
    
    @Size(min = 2, max = 50, message = "First name must be between 2 and 50 characters")
    private String firstName;
    
    @Size(min = 2, max = 50, message = "Last name must be between 2 and 50 characters")
    private String lastName;
    
    @Email(message = "Invalid email format")
    private String emailAddress;
    
    @Pattern(regexp = "^\\+?[1-9]\\d{1,14}$", message = "Invalid phone number format")
    private String phoneNumber;

    private Boolean isAdmin;

}
