package com.example.client_service.controller;

import com.example.client_service.dto.ClientCreateRequest;
import com.example.client_service.dto.ClientUpdateRequest;
import com.example.client_service.dto.PagedResponse;
import com.example.client_service.model.Client;
import com.example.client_service.security.AuthPrincipal;
import com.example.client_service.security.AuthUtil;
import com.example.client_service.service.ClientService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/clients")
public class ClientController {

    private final ClientService clientService;

    public ClientController(ClientService clientService) {
        this.clientService = clientService;
    }

    @GetMapping
    public ResponseEntity<?> getAllClients(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        if (principal.isRootAdmin() || principal.isAdmin()) {
            Pageable pageable = resolvePageable(page, size);
            if (pageable == null) {
                pageable = PageRequest.of(0, 50);
            }
            List<Client> clients = clientService.getAllClients(pageable);
            long total = clientService.countAllClients();
            int totalPages = (int) Math.ceil((double) total / pageable.getPageSize());
            return ResponseEntity.ok(new PagedResponse<>(
                    clients,
                    pageable.getPageNumber(),
                    pageable.getPageSize(),
                    total,
                    totalPages));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body("Bulk client listing is not permitted. Use /api/clients/agent/{agentId} instead.");
    }

    @GetMapping("/count")
    public ResponseEntity<Object> getClientCount() {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        if (!principal.isRootAdmin() && !principal.isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(java.util.Map.of("count", clientService.countAllClients()));
    }

    @GetMapping("/agent/{agentId}")
    public ResponseEntity<?> getClientsByAgentId(
            @PathVariable UUID agentId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        if (!principal.isAgent() || !principal.getUserId().equals(agentId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Pageable pageable = resolvePageable(page, size);

        if (pageable == null) {
            return ResponseEntity.ok(clientService.getClientsByAgentId(agentId));
        }

        List<Client> clients = clientService.getClientsByAgentId(agentId, pageable);
        long total = clientService.countClientsByAgentId(agentId);
        int totalPages = (int) Math.ceil((double) total / pageable.getPageSize());

        return ResponseEntity.ok(new PagedResponse<>(
                clients,
                pageable.getPageNumber(),
                pageable.getPageSize(),
                total,
                totalPages));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Client> getClientById(@PathVariable UUID id) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        Client client = clientService.findById(id);
        if (principal.isRootAdmin() || principal.isAdmin()) {
            return ResponseEntity.ok(client);
        }
        if (principal.isAgent() && principal.getUserId().equals(client.getAssignedAgentId())) {
            return ResponseEntity.ok(client);
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    @PostMapping
    public ResponseEntity<Client> createClient(
            @Valid @RequestBody ClientCreateRequest requestBody
    ) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        if (!principal.isAgent()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (requestBody.getAssignedAgentId() == null) {
            requestBody.setAssignedAgentId(principal.getUserId());
        } else if (!principal.getUserId().equals(requestBody.getAssignedAgentId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Client client = new Client();
        client.setFirstName(requestBody.getFirstName());
        client.setLastName(requestBody.getLastName());
        client.setDateOfBirth(requestBody.getDateOfBirth());
        client.setGender(requestBody.getGender());
        client.setEmailAddress(requestBody.getEmailAddress());
        client.setPhoneNumber(requestBody.getPhoneNumber());
        client.setAddress(requestBody.getAddress());
        client.setCity(requestBody.getCity());
        client.setState(requestBody.getState());
        client.setCountry(requestBody.getCountry());
        client.setPostalCode(requestBody.getPostalCode());
        client.setAssignedAgentId(requestBody.getAssignedAgentId());
        client.setIdentificationNumber(requestBody.getIdentificationNumber());

        Client createdClient = clientService.saveClient(client, principal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(createdClient);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Client> updateClient(
            @PathVariable UUID id,
            @Valid @RequestBody ClientUpdateRequest details
    ) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        Client existing = clientService.findById(id);
        if (principal.isRootAdmin() || principal.isAdmin()) {
            if (details.getAssignedAgentId() == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            if (hasNonReassignmentChanges(details)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Admins may only reassign clients. Other field changes are not permitted.");
            }
            return ResponseEntity.ok(clientService.updateClient(id, mapToClient(details), principal.getUserId()));
        }
        if (principal.isAgent()) {
            if (!principal.getUserId().equals(existing.getAssignedAgentId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            if (details.getAssignedAgentId() != null
                    && !principal.getUserId().equals(details.getAssignedAgentId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            return ResponseEntity.ok(clientService.updateClient(id, mapToClient(details), principal.getUserId()));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    @PutMapping("/{id}/verify")
    public ResponseEntity<?> verifyClient(
            @PathVariable UUID id,
            @RequestBody(required = false) java.util.Map<String, String> body
    ) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        if (!principal.isAgent()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Client client = clientService.findById(id);
        if (!principal.getUserId().equals(client.getAssignedAgentId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        String verificationMethod = (body != null) ? body.get("verificationMethod") : null;
        Client verified = clientService.verifyClient(id, verificationMethod, principal.getUserId());
        return ResponseEntity.ok(verified);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteClient(
            @PathVariable UUID id,
            @RequestBody(required = false) java.util.Map<String, String> body
    ) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        Client client = clientService.findById(id);
        if (!principal.isAgent() || !principal.getUserId().equals(client.getAssignedAgentId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        String deletionReason = (body != null) ? body.get("deletionReason") : null;
        clientService.deleteClient(id, deletionReason, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/agent/{agentId}/ids")
    public ResponseEntity<List<UUID>> getClientIdsByAgentId(
            @PathVariable UUID agentId
    ) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        if (!principal.isRootAdmin() && !principal.isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        List<UUID> ids = clientService.getClientsByAgentId(agentId)
                .stream()
                .map(Client::getClientId)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ids);
    }

    private boolean hasNonReassignmentChanges(ClientUpdateRequest details) {
        return details.getFirstName() != null
                || details.getLastName() != null
                || details.getDateOfBirth() != null
                || details.getGender() != null
                || details.getEmailAddress() != null
                || details.getPhoneNumber() != null
                || details.getAddress() != null
                || details.getCity() != null
                || details.getState() != null
                || details.getCountry() != null
                || details.getPostalCode() != null
                || details.getCreatedAt() != null
                || details.getUpdatedAt() != null
                || details.getVerifiedAt() != null
                || details.getVerificationMethod() != null
                || details.getDeletedAt() != null
                || details.getIdentificationNumber() != null;
    }

    private Client mapToClient(ClientUpdateRequest details) {
        Client client = new Client();
        client.setFirstName(details.getFirstName());
        client.setLastName(details.getLastName());
        client.setDateOfBirth(details.getDateOfBirth());
        client.setGender(details.getGender());
        client.setEmailAddress(details.getEmailAddress());
        client.setPhoneNumber(details.getPhoneNumber());
        client.setAddress(details.getAddress());
        client.setCity(details.getCity());
        client.setState(details.getState());
        client.setCountry(details.getCountry());
        client.setPostalCode(details.getPostalCode());
        client.setCreatedAt(details.getCreatedAt());
        client.setUpdatedAt(details.getUpdatedAt());
        client.setVerifiedAt(details.getVerifiedAt());
        client.setVerificationMethod(details.getVerificationMethod());
        client.setDeletedAt(details.getDeletedAt());
        client.setAssignedAgentId(details.getAssignedAgentId());
        client.setIdentificationNumber(details.getIdentificationNumber());
        return client;
    }

    private static final int MAX_PAGE_SIZE = 100;

    private Pageable resolvePageable(Integer page, Integer size) {
        if (page == null && size == null) {
            return null;
        }
        int resolvedPage = page == null ? 0 : Math.max(page, 0);
        int resolvedSize = Math.min(size == null ? 50 : Math.max(size, 1), MAX_PAGE_SIZE);
        return PageRequest.of(resolvedPage, resolvedSize);
    }

    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Service is UP");
    }
}
