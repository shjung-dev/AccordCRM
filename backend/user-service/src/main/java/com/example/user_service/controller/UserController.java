package com.example.user_service.controller;

import com.example.user_service.model.User;
import com.example.user_service.security.AuthPrincipal;
import com.example.user_service.security.AuthUtil;
import com.example.user_service.service.UserService;
import com.example.user_service.dto.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;




@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        Pageable pageable = resolvePageable(page, size);
        if (principal.isRootAdmin()) {
            if (pageable == null) {
                return ResponseEntity.ok(userService.getAllUsers());
            }
            return ResponseEntity.ok(userService.getAllUsers(pageable));
        }
        if (principal.isAdmin()) {
            if (pageable == null) {
                List<User> agents = userService.getAllUsers().stream()
                        .filter((user) -> Boolean.FALSE.equals(user.getIsAdmin()))
                        .collect(Collectors.toList());
                return ResponseEntity.ok(agents);
            }
            return ResponseEntity.ok(userService.getAllAgents(pageable));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable UUID id) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        User user = userService.findById(id);
        if (principal.isRootAdmin()) {
            return ResponseEntity.ok(user);
        }
        if (principal.isAdmin()) {
            if (Boolean.TRUE.equals(user.getIsAdmin())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            return ResponseEntity.ok(user);
        }
        if (principal.isAgent() && principal.getUserId().equals(user.getUserId())) {
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    public record UserEmailResponse(
            UUID userId,
            String emailAddress,
            String firstName,
            String lastName,
            Boolean isAdmin,
            Boolean isRootAdmin) {
    }

    @GetMapping("/sub/{sub}")
    public ResponseEntity<UserSubResponse> getUserBySub(@PathVariable String sub) {
        User user = userService.findByCognitoSub(sub);
        if (user == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(new UserSubResponse(user.getUserId(), user.getIsAdmin(), user.getIsRootAdmin()));
    }

    public record UserSubResponse(UUID userId, Boolean isAdmin, Boolean isRootAdmin) {}

    @GetMapping("/email/{email}")
    public ResponseEntity<UserEmailResponse> getUserByEmail(@PathVariable String email) {
        User user = userService.findByEmail(email);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(new UserEmailResponse(
                user.getUserId(),
                user.getEmailAddress(),
                user.getFirstName(),
                user.getLastName(),
                user.getIsAdmin(),
                user.getIsRootAdmin()));
    }

    @GetMapping("/logs")
    public ResponseEntity<List<AuditLogResponse>> getLogs() {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        if (!(principal.isRootAdmin() || principal.isAdmin() || principal.isAgent())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(userService.getVisibleAuditLogs(principal));
    }

    @PostMapping
    public ResponseEntity<User> createUser(
            @Valid @RequestBody UserCreateRequest request) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        // Only admins can create agents
        if (!principal.isAdmin() && !principal.isRootAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Only root admin can create admins
        if (Boolean.TRUE.equals(request.getIsAdmin()) && !principal.isRootAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        User createdUser = userService.createUser(request, principal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(createdUser);
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody UserUpdateRequest request) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();

        User existingUser = userService.findById(id);

        // Root admin can update anyone
        if (principal.isRootAdmin()) {
            return ResponseEntity.ok(userService.updateUser(id, request, principal.getUserId()));
        }

        // Regular admin can only update agents
        if (principal.isAdmin()) {
            if (Boolean.TRUE.equals(existingUser.getIsAdmin())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            return ResponseEntity.ok(userService.updateUser(id, request, principal.getUserId()));
        }

        // Agents can only update themselves
        if (principal.isAgent() && principal.getUserId().equals(id)) {
            return ResponseEntity.ok(userService.updateUser(id, request, principal.getUserId()));
        }

        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    @DeleteMapping("/{id}")
public ResponseEntity<Void> deleteUser(@PathVariable UUID id, HttpServletRequest request) {
    AuthPrincipal principal = AuthUtil.requirePrincipal();
    String authToken = request.getHeader("Authorization"); // extract token

    User user = userService.findById(id);

    if (Boolean.TRUE.equals(user.getIsRootAdmin())) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }
    if (Boolean.TRUE.equals(user.getIsAdmin())) {
        if (!principal.isRootAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    } else {
        if (!(principal.isRootAdmin() || principal.isAdmin())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    userService.deleteUser(id, authToken, principal.getUserId());
    return ResponseEntity.noContent().build();
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
    
    // Standard Health Check for ALB/ECS
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        // You can add logic here to check if the DB is connected if needed
        return ResponseEntity.ok("Service is UP");
    }
}
