// =============================================================================
// Cognito auth helpers — used by Next.js API routes (server-side only)
//
// Uses raw HTTP to the Cognito Identity Provider API to avoid adding
// a heavy AWS SDK to the frontend bundle.
// =============================================================================

export class CognitoAuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CognitoAuthError";
  }
}

export interface CognitoTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
}

export interface CognitoChallenge {
  challenge: "NEW_PASSWORD_REQUIRED";
  session: string;
}

export type CognitoAuthResult = CognitoTokens | CognitoChallenge;

function cognitoEndpoint(region: string): string {
  return `https://cognito-idp.${region}.amazonaws.com/`;
}

async function cognitoPost(
  region: string,
  target: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(cognitoEndpoint(region), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
  });

  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    throw new CognitoAuthError("ParseError", "Authentication service returned an unexpected response.");
  }

  if (!res.ok) {
    const code = (data.__type as string) ?? "UnknownError";
    const message = (data.message as string) ?? "Authentication failed.";
    throw new CognitoAuthError(code, message);
  }

  return data;
}

/**
 * Authenticate a user with email + password.
 * Returns tokens on success, or a challenge descriptor on first-login.
 */
export async function initiateAuth(
  email: string,
  password: string,
  clientId: string,
  region: string,
): Promise<CognitoAuthResult> {
  const data = await cognitoPost(region, "InitiateAuth", {
    AuthFlow: "USER_PASSWORD_AUTH",
    AuthParameters: { USERNAME: email, PASSWORD: password },
    ClientId: clientId,
  });

  if (data.ChallengeName === "NEW_PASSWORD_REQUIRED") {
    return { challenge: "NEW_PASSWORD_REQUIRED", session: data.Session as string };
  }

  const result = data.AuthenticationResult as Record<string, string>;
  return {
    idToken: result.IdToken,
    accessToken: result.AccessToken,
    refreshToken: result.RefreshToken,
  };
}

/**
 * Complete a NEW_PASSWORD_REQUIRED challenge (first login).
 */
export async function respondToNewPasswordChallenge(
  session: string,
  email: string,
  newPassword: string,
  clientId: string,
  region: string,
): Promise<CognitoTokens> {
  const data = await cognitoPost(region, "RespondToAuthChallenge", {
    ChallengeName: "NEW_PASSWORD_REQUIRED",
    ClientId: clientId,
    Session: session,
    ChallengeResponses: {
      USERNAME: email,
      NEW_PASSWORD: newPassword,
    },
  });

  const result = data.AuthenticationResult as Record<string, string>;
  return {
    idToken: result.IdToken,
    accessToken: result.AccessToken,
    refreshToken: result.RefreshToken,
  };
}

/**
 * Refresh an access token using a stored refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  region: string,
): Promise<Pick<CognitoTokens, "accessToken" | "idToken">> {
  const data = await cognitoPost(region, "InitiateAuth", {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    AuthParameters: { REFRESH_TOKEN: refreshToken },
    ClientId: clientId,
  });

  const result = data.AuthenticationResult as Record<string, string>;
  return {
    accessToken: result.AccessToken,
    idToken: result.IdToken,
  };
}

/** Friendly error messages for Cognito error codes. */
export function friendlyCognitoError(err: CognitoAuthError): string {
  switch (err.code) {
    case "NotAuthorizedException":
      return "Invalid email or password.";
    case "UserNotFoundException":
      return "No account found with this email address.";
    case "UserNotConfirmedException":
      return "Please verify your email before logging in.";
    case "PasswordResetRequiredException":
      return "A password reset is required. Please check your email.";
    case "TooManyRequestsException":
    case "LimitExceededException":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return err.message || "Authentication failed. Please try again.";
  }
}
