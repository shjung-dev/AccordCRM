package com.example.account_service.integration;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class ClientRecord {
    private UUID clientId;
    @JsonAlias({"assignedAgentId", "assigned_agent_id"})
    private UUID assignedAgentId;
    @JsonAlias({"firstName", "first_name"})
    private String firstName;
    @JsonAlias({"lastName", "last_name"})
    private String lastName;
    @JsonAlias({"emailAddress", "email_address"})
    private String emailAddress;
    @JsonAlias({"phoneNumber", "phone_number"})
    private String phoneNumber;

    public String getFullName(){
        String first = firstName == null ? "" : firstName;
        String last = lastName == null ? "" : lastName;
        return (first + " " + last).trim();
    }
}
