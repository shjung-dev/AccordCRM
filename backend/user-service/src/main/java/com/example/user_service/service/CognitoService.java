package com.example.user_service.service;

import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.*;

import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Manages Cognito user lifecycle alongside the DB user records.
 *
 * Users are always created by admins (allow_admin_create_user_only = true in Terraform).
 * We immediately set a permanent password so users can log in without a
 * NEW_PASSWORD_REQUIRED challenge — the initial password follows the pattern:
 *   Accord@{first-8-chars-of-internal-UUID}
 *
 * Admins should communicate this initial password to the user; users can later
 * reset it via the Forgot Password flow in Cognito.
 *
 * Requires env vars: COGNITO_USER_POOL_ID, COGNITO_REGION (default ap-southeast-1)
 * Requires IAM permissions: cognito-idp:AdminCreateUser, AdminSetUserPassword,
 *                           AdminDeleteUser, AdminUpdateUserAttributes
 */
@Service
public class CognitoService {

    private static final Logger logger = Logger.getLogger(CognitoService.class.getName());

    private final String userPoolId;
    private final CognitoIdentityProviderClient cognitoClient;
    private final boolean enabled;

    public CognitoService() {
        String poolId = System.getenv("COGNITO_USER_POOL_ID");
        String region = System.getenv("COGNITO_REGION");
        if (region == null || region.isBlank()) {
            region = "ap-southeast-1";
        }

        this.userPoolId = poolId;
        this.enabled = poolId != null && !poolId.isBlank();

        if (this.enabled) {
            logger.info("CognitoService enabled — pool=" + poolId + ", region=" + region);
            this.cognitoClient = CognitoIdentityProviderClient.builder()
                    .region(Region.of(region))
                    .credentialsProvider(DefaultCredentialsProvider.create())
                    .build();
        } else {
            this.cognitoClient = null;
            logger.warning("COGNITO_USER_POOL_ID not set — Cognito user management is disabled.");
        }
    }

    /**
     * Creates a Cognito user and immediately sets a permanent password.
     * Initial password: Accord@{first 8 chars of internal UUID}
     * Example: Accord@a1b2c3d4
     */
    /**
     * Creates a Cognito user and returns their Cognito sub UUID.
     * Returns null if Cognito is disabled or creation fails.
     */
    public String createUser(String email, String firstName, String lastName,
                             boolean isAdmin, boolean isRootAdmin, UUID internalId) {
        if (!enabled) return null;

        String role = isAdmin ? "admin" : "agent";
        String initialPassword = "Accord@" + internalId.toString().replace("-", "").substring(0, 8);

        try {
            var createResponse = cognitoClient.adminCreateUser(AdminCreateUserRequest.builder()
                    .userPoolId(userPoolId)
                    .username(email)
                    .messageAction(MessageActionType.SUPPRESS)
                    .userAttributes(
                            AttributeType.builder().name("email").value(email).build(),
                            AttributeType.builder().name("email_verified").value("true").build(),
                            AttributeType.builder().name("given_name").value(firstName).build(),
                            AttributeType.builder().name("family_name").value(lastName).build(),
                            AttributeType.builder().name("custom:role").value(role).build(),
                            AttributeType.builder().name("custom:isRootAdmin").value(String.valueOf(isRootAdmin)).build()
                    )
                    .build());

            cognitoClient.adminSetUserPassword(AdminSetUserPasswordRequest.builder()
                    .userPoolId(userPoolId)
                    .username(email)
                    .password(initialPassword)
                    .permanent(true)
                    .build());

            addUserToGroups(email, isAdmin, isRootAdmin);

            logger.info("Cognito user created: " + email + " | initial password pattern: Accord@{first8charsOfId}");

            return createResponse.user().attributes().stream()
                    .filter(a -> "sub".equals(a.name()))
                    .map(software.amazon.awssdk.services.cognitoidentityprovider.model.AttributeType::value)
                    .findFirst()
                    .orElse(null);

        } catch (UsernameExistsException e) {
            updateUserAttributes(email, firstName, lastName, role, isRootAdmin);
            // User already exists in Cognito — fetch their sub so the DB record stays in sync
            return getExistingSub(email);
        } catch (Exception e) {
            logger.log(Level.WARNING, "Failed to create Cognito user for " + email + ": " + e.getMessage(), e);
            return null;
        }
    }

    public String getEmailBySub(String sub) {
        if (!enabled) return null;
        try {
            var response = cognitoClient.listUsers(
                    software.amazon.awssdk.services.cognitoidentityprovider.model.ListUsersRequest.builder()
                            .userPoolId(userPoolId)
                            .filter("sub = \"" + sub + "\"")
                            .limit(1)
                            .build());
            return response.users().stream()
                    .flatMap(u -> u.attributes().stream())
                    .filter(a -> "email".equals(a.name()))
                    .map(software.amazon.awssdk.services.cognitoidentityprovider.model.AttributeType::value)
                    .findFirst()
                    .orElse(null);
        } catch (Exception e) {
            logger.log(Level.WARNING, "Failed to look up email for Cognito sub " + sub + ": " + e.getMessage(), e);
            return null;
        }
    }

    private String getExistingSub(String email) {
        try {
            return cognitoClient.adminGetUser(
                    software.amazon.awssdk.services.cognitoidentityprovider.model.AdminGetUserRequest.builder()
                            .userPoolId(userPoolId)
                            .username(email)
                            .build()
            ).userAttributes().stream()
                    .filter(a -> "sub".equals(a.name()))
                    .map(software.amazon.awssdk.services.cognitoidentityprovider.model.AttributeType::value)
                    .findFirst()
                    .orElse(null);
        } catch (Exception e) {
            logger.log(Level.WARNING, "Failed to fetch existing Cognito sub for " + email + ": " + e.getMessage(), e);
            return null;
        }
    }

    /**
     * Deletes a Cognito user when the DB user is soft-deleted.
     */
    public void deleteUser(String email) {
        if (!enabled) return;
        try {
            cognitoClient.adminDeleteUser(AdminDeleteUserRequest.builder()
                    .userPoolId(userPoolId)
                    .username(email)
                    .build());
        } catch (UserNotFoundException e) {
            // Already gone — nothing to do
        } catch (Exception e) {
            logger.log(Level.WARNING, "Failed to delete Cognito user for " + email + ": " + e.getMessage(), e);
        }
    }

    private void addUserToGroups(String email, boolean isAdmin, boolean isRootAdmin) {
        try {
            String group = isAdmin ? "admin" : "agent";
            cognitoClient.adminAddUserToGroup(AdminAddUserToGroupRequest.builder()
                    .userPoolId(userPoolId)
                    .username(email)
                    .groupName(group)
                    .build());
            if (isRootAdmin) {
                cognitoClient.adminAddUserToGroup(AdminAddUserToGroupRequest.builder()
                        .userPoolId(userPoolId)
                        .username(email)
                        .groupName("root_admin")
                        .build());
            }
        } catch (Exception e) {
            logger.log(Level.WARNING, "Failed to add " + email + " to Cognito group: " + e.getMessage(), e);
        }
    }

    /**
     * Syncs name/role changes to Cognito when the DB user is updated.
     */
    public void updateUserAttributes(String email, String firstName, String lastName,
                                     String role, boolean isRootAdmin) {
        if (!enabled) return;
        try {
            cognitoClient.adminUpdateUserAttributes(AdminUpdateUserAttributesRequest.builder()
                    .userPoolId(userPoolId)
                    .username(email)
                    .userAttributes(
                            AttributeType.builder().name("given_name").value(firstName).build(),
                            AttributeType.builder().name("family_name").value(lastName).build(),
                            AttributeType.builder().name("custom:role").value(role).build(),
                            AttributeType.builder().name("custom:isRootAdmin").value(String.valueOf(isRootAdmin)).build()
                    )
                    .build());
        } catch (Exception e) {
            logger.log(Level.WARNING, "Failed to update Cognito attributes for " + email + ": " + e.getMessage(), e);
        }
    }
}
