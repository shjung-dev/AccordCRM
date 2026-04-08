"""
Lambda: SQS Email Sender
------------------------
Triggered by SQS. Each message represents an email request published by a
backend microservice (client-service, account-service).
The Lambda builds the branded AccordCRM HTML email and sends it via AWS SES,
matching the templates used in EmailService.java and AccountEmailService.java.

Failed messages are returned as batchItemFailures so SQS retries them
individually (requires FunctionResponseTypes = ReportBatchItemFailures on the
event source mapping and a Dead Letter Queue on the SQS source).

Environment variables required:
  SES_FROM_EMAIL - Verified SES sender address (e.g. accordcrm.noreply@gmail.com)
  SES_REGION     - AWS region where SES is configured (default: ap-southeast-1)

SQS message body (JSON):

  Common fields (all types):
    "emailType"     : one of the EMAIL_TYPES below  -- required
    "to"            : recipient email address        -- required
    "firstName"     : client first name              -- required
    "lastName"      : client last name               -- optional

  VERIFICATION only:
    "verificationMethod" : e.g. "NRIC – verified in branch by your assigned agent."

  ACCOUNT_CREATED only:
    "accountId"     : UUID string
    "accountType"   : e.g. "Savings"
    "openingDate"   : e.g. "2025-03-01"
    "currency"      : e.g. "SGD"
    "balance"       : e.g. "1000.00"
    "accountStatus" : e.g. "Active"

  ACCOUNT_DELETED only:
    "accountId"     : UUID string
    "accountType"   : e.g. "Savings"

  Optional (all types):
    "sourceService" : originating microservice name
"""

import json
import logging
import os

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------------
# Brand constants — mirrors EmailService.java / AccountEmailService.java
# ---------------------------------------------------------------------------
BRAND_COLOR  = "#1a3353"
ACCENT_COLOR = "#c9a84c"
FROM_DISPLAY = "AccordCRM"

# ---------------------------------------------------------------------------
# SES client (reused across warm invocations)
# ---------------------------------------------------------------------------
_ses_client = None


def _get_ses_client():
    global _ses_client
    if _ses_client is None:
        _ses_client = boto3.client("ses", region_name=os.environ.get("SES_REGION", "ap-southeast-1"))
    return _ses_client

EMAIL_TYPES = {
    "WELCOME",
    "VERIFICATION",
    "PROFILE_UPDATE",
    "PROFILE_DELETED",
    "ACCOUNT_CREATED",
    "ACCOUNT_DELETED",
}

# ---------------------------------------------------------------------------
# HTML builder — mirrors buildEmail() in both Java services
# ---------------------------------------------------------------------------

def _build_email(heading: str, main_content: str, callout_title: str, callout_body: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>{heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:8px;overflow:hidden;
                    box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:{BRAND_COLOR};padding:36px 48px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size:26px;font-weight:bold;color:#ffffff;
                               letter-spacing:1px;">Accord</span><span
                    style="font-size:26px;font-weight:bold;color:{ACCENT_COLOR};
                           letter-spacing:1px;">CRM</span>
                </td>
                <td align="right">
                  <span style="font-size:11px;color:rgba(255,255,255,0.5);
                               letter-spacing:2px;text-transform:uppercase;">
                    Banking &amp; CRM
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Gold accent bar -->
        <tr><td style="background:{ACCENT_COLOR};height:4px;"></td></tr>

        <!-- Body -->
        <tr>
          <td style="padding:48px 48px 32px 48px;">
            <h1 style="margin:0 0 24px 0;font-size:28px;font-weight:normal;
                       color:{BRAND_COLOR};letter-spacing:0.5px;">{heading}</h1>
            <div style="font-size:15px;line-height:1.8;color:#444444;">
              {main_content}
            </div>
            <!-- Callout box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
              <tr>
                <td style="background:#f8f5ee;border-left:4px solid {ACCENT_COLOR};
                           border-radius:4px;padding:20px 24px;">
                  <p style="margin:0 0 6px 0;font-size:13px;font-weight:bold;
                            color:{BRAND_COLOR};text-transform:uppercase;letter-spacing:1px;">{callout_title}</p>
                  <p style="margin:0;font-size:14px;line-height:1.7;color:#555555;">{callout_body}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 48px;">
          <hr style="border:none;border-top:1px solid #eeeeee;margin:0;"/>
        </td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:28px 48px 36px 48px;">
            <p style="margin:0 0 4px 0;font-size:13px;color:#888888;">Regards,</p>
            <p style="margin:0 0 16px 0;font-size:13px;font-weight:bold;color:{BRAND_COLOR};">
              AccordCRM Team</p>
            <p style="margin:0;font-size:11px;color:#aaaaaa;line-height:1.6;">
              This is an automated message. Please do not reply directly to this email.<br/>
              &copy; 2025 AccordCRM &mdash; Powered by UBS &amp; SMU G2-T2
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Per-type subject + body builders — mirrors each send*Email() method
# ---------------------------------------------------------------------------

def _build_welcome(data: dict) -> tuple[str, str]:
    first = data["firstName"]
    last  = data.get("lastName", "")
    subject = "Welcome – Please Verify Your Identity | AccordCRM"
    main_content = f"""
        <p style="margin:0 0 16px 0;">
          Dear <strong>{first} {last}</strong>,
        </p>
        <p style="margin:0 0 16px 0;">
          Welcome to AccordCRM! Your client profile has been successfully created.
        </p>
        <p style="margin:0 0 24px 0;">
          To complete your onboarding, please visit your nearest branch and present
          your <strong>documents</strong> to your assigned agent for identity verification.
          This step is required before you can access our full range of services.
        </p>
    """
    html = _build_email(
        "Welcome to AccordCRM",
        main_content,
        "Next Step: Identity Verification",
        "Visit your nearest branch with your documents to complete verification "
        "and activate your account.",
    )
    return subject, html


def _build_verification(data: dict) -> tuple[str, str]:
    first  = data["firstName"]
    last   = data.get("lastName", "")
    method = data.get("verificationMethod") or "NRIC – verified in branch by your assigned agent."
    subject = "Your Identity Has Been Verified – AccordCRM"
    main_content = f"""
        <p style="margin:0 0 16px 0;">
          Dear <strong>{first} {last}</strong>,
        </p>
        <p style="margin:0 0 16px 0;">
          We are pleased to inform you that your identity has been successfully
          verified with AccordCRM.
        </p>
        <p style="margin:0 0 24px 0;">
          You may now enjoy full access to our services. If you did not request
          this verification or believe this was done in error, please contact
          us immediately.
        </p>
    """
    html = _build_email(
        "Identity Verified",
        main_content,
        "Verification Method",
        method,
    )
    return subject, html


def _build_profile_update(data: dict) -> tuple[str, str]:
    first = data["firstName"]
    last  = data.get("lastName", "")
    subject = "Your Profile Has Been Updated – AccordCRM"
    main_content = f"""
        <p style="margin:0 0 16px 0;">
          Dear <strong>{first} {last}</strong>,
        </p>
        <p style="margin:0 0 16px 0;">
          This is a notification that your client profile with AccordCRM
          has been recently updated.
        </p>
        <p style="margin:0 0 24px 0;">
          If you did not authorise this change or have any concerns, please contact
          us immediately so we can assist you.
        </p>
    """
    html = _build_email(
        "Profile Updated",
        main_content,
        "Think this was unauthorised?",
        "Contact your assigned agent or our support team right away.",
    )
    return subject, html


def _build_profile_deleted(data: dict) -> tuple[str, str]:
    first = data["firstName"]
    last  = data.get("lastName", "")
    subject = "Your Profile Has Been Closed – AccordCRM"
    main_content = f"""
        <p style="margin:0 0 16px 0;">
          Dear <strong>{first} {last}</strong>,
        </p>
        <p style="margin:0 0 16px 0;">
          Your client profile with AccordCRM has been closed and your information
          has been removed from our active records.
        </p>
        <p style="margin:0 0 24px 0;">
          If you did not authorise this action or believe this was done in error,
          please contact us immediately.
        </p>
    """
    html = _build_email(
        "Profile Closed",
        main_content,
        "Think this was a mistake?",
        "Contact your assigned agent or our support team right away.",
    )
    return subject, html


def _build_account_created(data: dict) -> tuple[str, str]:
    account_type   = data.get("accountType", "")
    account_id     = data.get("accountId", "")
    opening_date   = data.get("openingDate", "")
    currency       = data.get("currency", "")
    balance        = data.get("balance", "")
    account_status = data.get("accountStatus", "")
    subject = "Your New Account Has Been Created – AccordCRM"
    main_content = f"""
        <p style="margin:0 0 16px 0;">A new <strong>{account_type}</strong> account has been
        successfully created for you.</p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 24px 0;font-size:14px;">
          <tr>
            <td style="padding:8px 0;color:#888888;width:40%;">Account ID</td>
            <td style="padding:8px 0;color:#333333;font-weight:bold;">{account_id}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#888888;">Account Type</td>
            <td style="padding:8px 0;color:#333333;">{account_type}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#888888;">Opening Date</td>
            <td style="padding:8px 0;color:#333333;">{opening_date}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#888888;">Currency</td>
            <td style="padding:8px 0;color:#333333;">{currency}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#888888;">Initial Balance</td>
            <td style="padding:8px 0;color:#333333;">{currency} {balance}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#888888;">Status</td>
            <td style="padding:8px 0;color:#333333;">{account_status}</td>
          </tr>
        </table>
    """
    html = _build_email(
        "Account Created",
        main_content,
        "What happens next?",
        "Your account will be fully activated once your identity verification is complete. "
        "Contact your assigned agent for more information.",
    )
    return subject, html


def _build_account_deleted(data: dict) -> tuple[str, str]:
    account_type = data.get("accountType", "")
    account_id   = data.get("accountId", "")
    subject = "Your Account Has Been Closed – AccordCRM"
    main_content = f"""
        <p style="margin:0 0 16px 0;">Your <strong>{account_type}</strong> account has been
        closed and is no longer active.</p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 24px 0;font-size:14px;">
          <tr>
            <td style="padding:8px 0;color:#888888;width:40%;">Account ID</td>
            <td style="padding:8px 0;color:#333333;font-weight:bold;">{account_id}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#888888;">Account Type</td>
            <td style="padding:8px 0;color:#333333;">{account_type}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#888888;">Status</td>
            <td style="padding:8px 0;color:#c0392b;font-weight:bold;">Inactive</td>
          </tr>
        </table>
    """
    html = _build_email(
        "Account Closed",
        main_content,
        "Think this was a mistake?",
        "Contact your assigned agent or our support team right away and we will investigate.",
    )
    return subject, html


_BUILDERS = {
    "WELCOME":         _build_welcome,
    "VERIFICATION":    _build_verification,
    "PROFILE_UPDATE":  _build_profile_update,
    "PROFILE_DELETED": _build_profile_deleted,
    "ACCOUNT_CREATED": _build_account_created,
    "ACCOUNT_DELETED": _build_account_deleted,
}


# ---------------------------------------------------------------------------
# Message parsing
# ---------------------------------------------------------------------------

def _parse_message(raw_body: str) -> dict:
    try:
        data = json.loads(raw_body)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in message body: {e}")

    required = {"emailType", "to", "firstName"}
    missing = required - data.keys()
    if missing:
        raise ValueError(f"Message missing required fields: {missing}")

    email_type = data["emailType"]
    if email_type not in EMAIL_TYPES:
        raise ValueError(f"Unknown emailType '{email_type}' — must be one of {EMAIL_TYPES}")

    to_addr = data["to"].strip()
    if not to_addr or "@" not in to_addr:
        raise ValueError(f"Invalid 'to' address: '{to_addr}'")

    return data


# ---------------------------------------------------------------------------
# SES send — mirrors sendHtmlEmail() in both Java services
# ---------------------------------------------------------------------------

def _send_html_email(to: str, subject: str, html_body: str):
    from_email = os.environ["SES_FROM_EMAIL"]
    from_address = f"{FROM_DISPLAY} <{from_email}>"

    try:
        response = _get_ses_client().send_email(
            Source=from_address,
            Destination={"ToAddresses": [to]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body":    {"Html": {"Data": html_body, "Charset": "UTF-8"}},
            },
        )
        logger.info("Email sent to=%s subject='%s' messageId=%s", to, subject, response["MessageId"])
    except ClientError as e:
        raise RuntimeError(f"SES error [{e.response['Error']['Code']}]: {e}") from e


# ---------------------------------------------------------------------------
# Lambda handler
# ---------------------------------------------------------------------------

def handler(event, context):
    """
    Entry point. Processes each record in the SQS batch.
    Failed records are returned as batchItemFailures so SQS retries them
    individually without resending already-delivered emails.
    """
    records = event.get("Records", [])
    logger.info("Received %d SQS record(s)", len(records))

    batch_item_failures = []

    for record in records:
        message_id = record.get("messageId", "unknown")
        body = record.get("body", "")

        try:
            data       = _parse_message(body)
            email_type = data["emailType"]
            to_addr    = data["to"]

            builder         = _BUILDERS[email_type]
            subject, html   = builder(data)
            _send_html_email(to_addr, subject, html)

            logger.info(
                "Processed messageId=%s emailType=%s to=%s sourceService=%s",
                message_id, email_type, to_addr, data.get("sourceService", "unknown"),
            )
        except Exception as exc:
            logger.error("Failed to process messageId=%s: %s", message_id, exc)
            batch_item_failures.append({"itemIdentifier": message_id})

    if batch_item_failures:
        logger.warning("%d record(s) failed and will be retried", len(batch_item_failures))

    return {"batchItemFailures": batch_item_failures}
