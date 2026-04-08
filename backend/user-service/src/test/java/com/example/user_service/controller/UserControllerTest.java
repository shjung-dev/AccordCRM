package com.example.user_service.controller;

import com.example.user_service.config.GlobalExceptionHandler;
import com.example.user_service.dto.AuditLogResponse;
import com.example.user_service.dto.UserCreateRequest;
import com.example.user_service.dto.UserUpdateRequest;
import com.example.user_service.model.User;
import com.example.user_service.security.AuthPrincipal;
import com.example.user_service.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock private UserService userService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders
                .standaloneSetup(new UserController(userService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    private void setupPrincipal(UUID userId, String role, boolean isRootAdmin) {
        AuthPrincipal principal = new AuthPrincipal(userId, role, isRootAdmin);
        TestingAuthenticationToken auth = new TestingAuthenticationToken(principal, null);
        auth.setAuthenticated(true);
        SecurityContextHolder.setContext(new SecurityContextImpl(auth));
    }

    private User buildUser(UUID id, String email, boolean isAdmin, boolean isRootAdmin) {
        User u = new User();
        u.setUserId(id);
        u.setFirstName("First");
        u.setLastName("Last");
        u.setEmailAddress(email);
        u.setIsAdmin(isAdmin);
        u.setIsRootAdmin(isRootAdmin);
        u.setCreatedAt(Instant.now());
        return u;
    }

    // ─── GET /api/users/health ────────────────────────────────────────────────

    @Test
    void healthCheck_returns200() throws Exception {
        mockMvc.perform(get("/api/users/health"))
                .andExpect(status().isOk())
                .andExpect(content().string("Service is UP"));
    }

    // ─── GET /api/users ───────────────────────────────────────────────────────

    @Test
    void getAllUsers_rootAdmin_returnsAllUsers() throws Exception {
        setupPrincipal(UUID.randomUUID(), "admin", true);
        User u = buildUser(UUID.randomUUID(), "a@test.com", false, false);
        when(userService.getAllUsers()).thenReturn(List.of(u));

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].emailAddress").value("a@test.com"));
    }

    @Test
    void getAllUsers_rootAdmin_withPagination_usesPageable() throws Exception {
        setupPrincipal(UUID.randomUUID(), "admin", true);
        User u = buildUser(UUID.randomUUID(), "a@test.com", false, false);
        when(userService.getAllUsers(any())).thenReturn(List.of(u));

        mockMvc.perform(get("/api/users").param("page", "0").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].emailAddress").value("a@test.com"));
    }

    @Test
    void getAllUsers_admin_filtersOutAdmins() throws Exception {
        setupPrincipal(UUID.randomUUID(), "admin", false);
        User agent = buildUser(UUID.randomUUID(), "agent@test.com", false, false);
        User admin = buildUser(UUID.randomUUID(), "admin@test.com", true, false);
        when(userService.getAllUsers()).thenReturn(List.of(agent, admin));

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].emailAddress").value("agent@test.com"));
    }

    @Test
    void getAllUsers_admin_withPagination_returnsAgents() throws Exception {
        setupPrincipal(UUID.randomUUID(), "admin", false);
        User agent = buildUser(UUID.randomUUID(), "agent@test.com", false, false);
        when(userService.getAllAgents(any())).thenReturn(List.of(agent));

        mockMvc.perform(get("/api/users").param("page", "0").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].emailAddress").value("agent@test.com"));
    }

    @Test
    void getAllUsers_agent_returns403() throws Exception {
        setupPrincipal(UUID.randomUUID(), "agent", false);

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isForbidden());
    }

    // ─── GET /api/users/{id} ──────────────────────────────────────────────────

    @Test
    void getUserById_rootAdmin_returnsAnyUser() throws Exception {
        UUID targetId = UUID.randomUUID();
        setupPrincipal(UUID.randomUUID(), "admin", true);
        User u = buildUser(targetId, "a@test.com", true, false);
        when(userService.findById(targetId)).thenReturn(u);

        mockMvc.perform(get("/api/users/{id}", targetId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailAddress").value("a@test.com"));
    }

    @Test
    void getUserById_admin_canViewAgent() throws Exception {
        UUID targetId = UUID.randomUUID();
        setupPrincipal(UUID.randomUUID(), "admin", false);
        User agent = buildUser(targetId, "agent@test.com", false, false);
        when(userService.findById(targetId)).thenReturn(agent);

        mockMvc.perform(get("/api/users/{id}", targetId))
                .andExpect(status().isOk());
    }

    @Test
    void getUserById_admin_cannotViewAdmin_returns403() throws Exception {
        UUID targetId = UUID.randomUUID();
        setupPrincipal(UUID.randomUUID(), "admin", false);
        User adminUser = buildUser(targetId, "admin@test.com", true, false);
        when(userService.findById(targetId)).thenReturn(adminUser);

        mockMvc.perform(get("/api/users/{id}", targetId))
                .andExpect(status().isForbidden());
    }

    @Test
    void getUserById_agent_canViewSelf() throws Exception {
        UUID userId = UUID.randomUUID();
        setupPrincipal(userId, "agent", false);
        User u = buildUser(userId, "me@test.com", false, false);
        when(userService.findById(userId)).thenReturn(u);

        mockMvc.perform(get("/api/users/{id}", userId))
                .andExpect(status().isOk());
    }

    @Test
    void getUserById_agent_cannotViewOthers_returns403() throws Exception {
        UUID selfId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        setupPrincipal(selfId, "agent", false);
        User other = buildUser(otherId, "other@test.com", false, false);
        when(userService.findById(otherId)).thenReturn(other);

        mockMvc.perform(get("/api/users/{id}", otherId))
                .andExpect(status().isForbidden());
    }

    @Test
    void getUserById_notFound_returns404() throws Exception {
        UUID userId = UUID.randomUUID();
        setupPrincipal(UUID.randomUUID(), "admin", true);
        when(userService.findById(userId))
                .thenThrow(new ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));

        mockMvc.perform(get("/api/users/{id}", userId))
                .andExpect(status().isNotFound());
    }

    // ─── GET /api/users/sub/{sub} ─────────────────────────────────────────────

    @Test
    void getUserBySub_found_returnsSubResponse() throws Exception {
        UUID userId = UUID.randomUUID();
        User u = buildUser(userId, "a@test.com", false, false);
        when(userService.findByCognitoSub("sub123")).thenReturn(u);

        mockMvc.perform(get("/api/users/sub/sub123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(userId.toString()))
                .andExpect(jsonPath("$.isAdmin").value(false));
    }

    @Test
    void getUserBySub_notFound_returns404() throws Exception {
        when(userService.findByCognitoSub("nosub")).thenReturn(null);

        mockMvc.perform(get("/api/users/sub/nosub"))
                .andExpect(status().isNotFound());
    }

    // ─── GET /api/users/email/{email} ─────────────────────────────────────────

    @Test
    void getUserByEmail_found_returnsEmailResponse() throws Exception {
        UUID userId = UUID.randomUUID();
        User u = buildUser(userId, "john@test.com", false, false);
        when(userService.findByEmail("john@test.com")).thenReturn(u);

        mockMvc.perform(get("/api/users/email/john@test.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailAddress").value("john@test.com"))
                .andExpect(jsonPath("$.userId").value(userId.toString()));
    }

    @Test
    void getUserByEmail_notFound_returns404() throws Exception {
        when(userService.findByEmail("no@test.com")).thenReturn(null);

        mockMvc.perform(get("/api/users/email/no@test.com"))
                .andExpect(status().isNotFound());
    }

    // ─── GET /api/users/logs ──────────────────────────────────────────────────

    @Test
    void getLogs_rootAdmin_returnsLogs() throws Exception {
        UUID adminId = UUID.randomUUID();
        setupPrincipal(adminId, "admin", true);
        List<AuditLogResponse> logs = List.of(
                new AuditLogResponse("1", "uid", "ACT", "USER", "eid",
                        "2024-01-01T00:00:00Z", "SUCCESS", "svc", null, null, null, null, null));
        when(userService.getVisibleAuditLogs(any())).thenReturn(logs);

        mockMvc.perform(get("/api/users/logs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].logId").value("1"));
    }

    @Test
    void getLogs_agent_returnsOwnLogs() throws Exception {
        setupPrincipal(UUID.randomUUID(), "agent", false);
        when(userService.getVisibleAuditLogs(any())).thenReturn(List.of());

        mockMvc.perform(get("/api/users/logs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // ─── POST /api/users ──────────────────────────────────────────────────────

    @Test
    void createUser_adminCreatesAgent_returns201() throws Exception {
        UUID adminId = UUID.randomUUID();
        setupPrincipal(adminId, "admin", false);

        UserCreateRequest req = new UserCreateRequest();
        req.setFirstName("John");
        req.setLastName("Doe");
        req.setEmailAddress("john@test.com");
        req.setIsAdmin(false);

        User created = buildUser(UUID.randomUUID(), "john@test.com", false, false);
        when(userService.createUser(any(), eq(adminId))).thenReturn(created);

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.emailAddress").value("john@test.com"));
    }

    @Test
    void createUser_adminCreatesAdmin_returns403() throws Exception {
        setupPrincipal(UUID.randomUUID(), "admin", false);

        UserCreateRequest req = new UserCreateRequest();
        req.setFirstName("Admin");
        req.setLastName("User");
        req.setEmailAddress("admin@test.com");
        req.setIsAdmin(true);

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());

        verify(userService, never()).createUser(any(), any());
    }

    @Test
    void createUser_rootAdminCreatesAdmin_returns201() throws Exception {
        UUID rootId = UUID.randomUUID();
        setupPrincipal(rootId, "admin", true);

        UserCreateRequest req = new UserCreateRequest();
        req.setFirstName("Admin");
        req.setLastName("User");
        req.setEmailAddress("admin@test.com");
        req.setIsAdmin(true);

        User created = buildUser(UUID.randomUUID(), "admin@test.com", true, false);
        when(userService.createUser(any(), eq(rootId))).thenReturn(created);

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());
    }

    @Test
    void createUser_agent_returns403() throws Exception {
        setupPrincipal(UUID.randomUUID(), "agent", false);

        UserCreateRequest req = new UserCreateRequest();
        req.setFirstName("Agent");
        req.setLastName("User");
        req.setEmailAddress("a@test.com");
        req.setIsAdmin(false);

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    void createUser_missingRequiredFields_returns400() throws Exception {
        setupPrincipal(UUID.randomUUID(), "admin", true);

        // firstName, lastName, emailAddress missing
        UserCreateRequest req = new UserCreateRequest();
        req.setIsAdmin(false);

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());

        verify(userService, never()).createUser(any(), any());
    }

    @Test
    void createUser_invalidEmail_returns400() throws Exception {
        setupPrincipal(UUID.randomUUID(), "admin", true);

        UserCreateRequest req = new UserCreateRequest();
        req.setFirstName("John");
        req.setLastName("Doe");
        req.setEmailAddress("not-an-email");
        req.setIsAdmin(false);

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // ─── PUT /api/users/{id} ──────────────────────────────────────────────────

    @Test
    void updateUser_rootAdmin_updatesAnyUser() throws Exception {
        UUID rootId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        setupPrincipal(rootId, "admin", true);

        UserUpdateRequest req = new UserUpdateRequest();
        req.setFirstName("Updated");

        User existing = buildUser(targetId, "a@test.com", false, false);
        User updated = buildUser(targetId, "a@test.com", false, false);
        updated.setFirstName("Updated");

        when(userService.findById(targetId)).thenReturn(existing);
        when(userService.updateUser(eq(targetId), any(), eq(rootId))).thenReturn(updated);

        mockMvc.perform(put("/api/users/{id}", targetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Updated"));
    }

    @Test
    void updateUser_admin_canUpdateAgent() throws Exception {
        UUID adminId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        setupPrincipal(adminId, "admin", false);

        UserUpdateRequest req = new UserUpdateRequest();
        req.setFirstName("Updated");

        User agent = buildUser(targetId, "agent@test.com", false, false);
        User updated = buildUser(targetId, "agent@test.com", false, false);
        updated.setFirstName("Updated");

        when(userService.findById(targetId)).thenReturn(agent);
        when(userService.updateUser(eq(targetId), any(), eq(adminId))).thenReturn(updated);

        mockMvc.perform(put("/api/users/{id}", targetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test
    void updateUser_admin_cannotUpdateAdmin_returns403() throws Exception {
        UUID adminId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        setupPrincipal(adminId, "admin", false);

        UserUpdateRequest req = new UserUpdateRequest();
        req.setFirstName("Updated");

        User adminTarget = buildUser(targetId, "admin@test.com", true, false);
        when(userService.findById(targetId)).thenReturn(adminTarget);

        mockMvc.perform(put("/api/users/{id}", targetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());

        verify(userService, never()).updateUser(any(), any(), any());
    }

    @Test
    void updateUser_agent_canUpdateSelf() throws Exception {
        UUID agentId = UUID.randomUUID();
        setupPrincipal(agentId, "agent", false);

        UserUpdateRequest req = new UserUpdateRequest();
        req.setFirstName("Updated");

        User agent = buildUser(agentId, "agent@test.com", false, false);
        User updated = buildUser(agentId, "agent@test.com", false, false);
        updated.setFirstName("Updated");

        when(userService.findById(agentId)).thenReturn(agent);
        when(userService.updateUser(eq(agentId), any(), eq(agentId))).thenReturn(updated);

        mockMvc.perform(put("/api/users/{id}", agentId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test
    void updateUser_agent_cannotUpdateOthers_returns403() throws Exception {
        UUID agentId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        setupPrincipal(agentId, "agent", false);

        UserUpdateRequest req = new UserUpdateRequest();
        req.setFirstName("Updated");

        User other = buildUser(otherId, "other@test.com", false, false);
        when(userService.findById(otherId)).thenReturn(other);

        mockMvc.perform(put("/api/users/{id}", otherId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    // ─── DELETE /api/users/{id} ───────────────────────────────────────────────

    @Test
    void deleteUser_rootAdmin_deletesAgent_returns204() throws Exception {
        UUID rootId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        setupPrincipal(rootId, "admin", true);

        User agent = buildUser(targetId, "agent@test.com", false, false);
        when(userService.findById(targetId)).thenReturn(agent);
        doNothing().when(userService).deleteUser(eq(targetId), any(), eq(rootId));

        mockMvc.perform(delete("/api/users/{id}", targetId)
                        .header("Authorization", "Bearer token"))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteUser_rootAdmin_deletesAdmin_returns204() throws Exception {
        UUID rootId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        setupPrincipal(rootId, "admin", true);

        User adminUser = buildUser(targetId, "admin@test.com", true, false);
        when(userService.findById(targetId)).thenReturn(adminUser);
        doNothing().when(userService).deleteUser(eq(targetId), any(), eq(rootId));

        mockMvc.perform(delete("/api/users/{id}", targetId))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteUser_admin_deletesAgent_returns204() throws Exception {
        UUID adminId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        setupPrincipal(adminId, "admin", false);

        User agent = buildUser(targetId, "agent@test.com", false, false);
        when(userService.findById(targetId)).thenReturn(agent);
        doNothing().when(userService).deleteUser(eq(targetId), any(), eq(adminId));

        mockMvc.perform(delete("/api/users/{id}", targetId)
                        .header("Authorization", "Bearer token"))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteUser_admin_cannotDeleteAdmin_returns403() throws Exception {
        UUID adminId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        setupPrincipal(adminId, "admin", false);

        User adminTarget = buildUser(targetId, "admin@test.com", true, false);
        when(userService.findById(targetId)).thenReturn(adminTarget);

        mockMvc.perform(delete("/api/users/{id}", targetId))
                .andExpect(status().isForbidden());

        verify(userService, never()).deleteUser(any(), any(), any());
    }

    @Test
    void deleteUser_agent_returns403() throws Exception {
        UUID agentId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        setupPrincipal(agentId, "agent", false);

        User target = buildUser(targetId, "other@test.com", false, false);
        when(userService.findById(targetId)).thenReturn(target);

        mockMvc.perform(delete("/api/users/{id}", targetId))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteUser_targetIsRootAdmin_returns403() throws Exception {
        UUID rootId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        setupPrincipal(rootId, "admin", true);

        User rootAdmin = buildUser(targetId, "root@test.com", true, true);
        when(userService.findById(targetId)).thenReturn(rootAdmin);

        mockMvc.perform(delete("/api/users/{id}", targetId))
                .andExpect(status().isForbidden());

        verify(userService, never()).deleteUser(any(), any(), any());
    }
}
