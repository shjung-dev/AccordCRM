package com.example.client_service.service;

import com.example.client_service.model.Client;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.*;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private static final String BRAND_COLOR  = "#1a3353";
    private static final String ACCENT_COLOR = "#c9a84c";
    private static final String FROM_ADDRESS = "AccordCRM <accordcrm.noreply@gmail.com>";

    private final SesV2Client sesV2Client;

    public EmailService(SesV2Client sesV2Client) {
        this.sesV2Client = sesV2Client;
    }

    public void sendWelcomeEmail(Client client) {
        String subject = "Welcome – Please Verify Your Identity | AccordCRM";
        String mainContent = """
                <p style="margin:0 0 16px 0;">
                  Dear <strong>%s %s</strong>,
                </p>
                <p style="margin:0 0 16px 0;">
                  Welcome to AccordCRM! Your client profile has been successfully created.
                </p>
                <p style="margin:0 0 24px 0;">
                  To complete your onboarding, please visit your nearest branch and present
                  your <strong>documents</strong> to your assigned agent for identity verification.
                  This step is required before you can access our full range of services.
                </p>
                """.formatted(
                client.getFirstName(),
                client.getLastName() != null ? client.getLastName() : ""
        );

        String body = buildEmail(
                "Welcome to AccordCRM",
                mainContent,
                "Next Step: Identity Verification",
                "Visit your nearest branch with your documents to complete verification "
                        + "and activate your account."
        );

        sendHtmlEmail(client.getEmailAddress(), subject, body);
    }

    public void sendVerificationEmail(Client client) {
        String subject = "Your Identity Has Been Verified – AccordCRM";
        String mainContent = """
                <p style="margin:0 0 16px 0;">
                  Dear <strong>%s %s</strong>,
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
                """.formatted(
                client.getFirstName(),
                client.getLastName() != null ? client.getLastName() : ""
        );

        String body = buildEmail(
                "Identity Verified",
                mainContent,
                "Verification Method",
                client.getVerificationMethod() != null
                        ? client.getVerificationMethod()
                        : "NRIC – verified in branch by your assigned agent."
        );

        sendHtmlEmail(client.getEmailAddress(), subject, body);
    }

    public void sendProfileUpdateEmail(Client client) {
        String subject = "Your Profile Has Been Updated – AccordCRM";
        String mainContent = """
                <p style="margin:0 0 16px 0;">
                  Dear <strong>%s %s</strong>,
                </p>
                <p style="margin:0 0 16px 0;">
                  This is a notification that your client profile with AccordCRM
                  has been recently updated.
                </p>
                <p style="margin:0 0 24px 0;">
                  If you did not authorise this change or have any concerns, please contact
                  us immediately so we can assist you.
                </p>
                """.formatted(
                client.getFirstName(),
                client.getLastName() != null ? client.getLastName() : ""
        );

        String body = buildEmail(
                "Profile Updated",
                mainContent,
                "Think this was unauthorised?",
                "Contact your assigned agent or our support team right away."
        );

        sendHtmlEmail(client.getEmailAddress(), subject, body);
    }

    public void sendProfileDeletedEmail(Client client) {
        String subject = "Your Profile Has Been Closed – AccordCRM";
        String mainContent = """
                <p style="margin:0 0 16px 0;">
                  Dear <strong>%s %s</strong>,
                </p>
                <p style="margin:0 0 16px 0;">
                  Your client profile with AccordCRM has been closed and your information
                  has been removed from our active records.
                </p>
                <p style="margin:0 0 24px 0;">
                  If you did not authorise this action or believe this was done in error,
                  please contact us immediately.
                </p>
                """.formatted(
                client.getFirstName(),
                client.getLastName() != null ? client.getLastName() : ""
        );

        String body = buildEmail(
                "Profile Closed",
                mainContent,
                "Think this was a mistake?",
                "Contact your assigned agent or our support team right away."
        );

        sendHtmlEmail(client.getEmailAddress(), subject, body);
    }

    private String buildEmail(String heading, String mainContent,
                               String calloutTitle, String calloutBody) {
        return String.format("""
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8"/>
              <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
              <title>%s</title>
            </head>
            <body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Georgia',serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
                <tr><td align="center">
                  <table width="600" cellpadding="0" cellspacing="0"
                         style="background:#ffffff;border-radius:8px;overflow:hidden;
                                box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    <tr>
                      <td style="background:%s;padding:36px 48px;">
                        <table width="100%%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td>
                              <span style="font-size:26px;font-weight:bold;color:#ffffff;
                                           letter-spacing:1px;">Accord</span><span
                                style="font-size:26px;font-weight:bold;color:%s;
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
                    <tr><td style="background:%s;height:4px;"></td></tr>
                    <tr>
                      <td style="padding:48px 48px 32px 48px;">
                        <h1 style="margin:0 0 24px 0;font-size:28px;font-weight:normal;
                                   color:%s;letter-spacing:0.5px;">%s</h1>
                        <div style="font-size:15px;line-height:1.8;color:#444444;">
                          %s
                        </div>
                        <table width="100%%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
                          <tr>
                            <td style="background:#f8f5ee;border-left:4px solid %s;
                                       border-radius:4px;padding:20px 24px;">
                              <p style="margin:0 0 6px 0;font-size:13px;font-weight:bold;
                                        color:%s;text-transform:uppercase;letter-spacing:1px;">%s</p>
                              <p style="margin:0;font-size:14px;line-height:1.7;color:#555555;">%s</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr><td style="padding:0 48px;">
                      <hr style="border:none;border-top:1px solid #eeeeee;margin:0;"/>
                    </td></tr>
                    <tr>
                      <td style="padding:28px 48px 36px 48px;">
                        <p style="margin:0 0 4px 0;font-size:13px;color:#888888;">Regards,</p>
                        <p style="margin:0 0 16px 0;font-size:13px;font-weight:bold;color:%s;">
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
            </html>
            """,
            heading,
            BRAND_COLOR, ACCENT_COLOR,
            ACCENT_COLOR,
            BRAND_COLOR, heading,
            mainContent,
            ACCENT_COLOR, BRAND_COLOR,
            calloutTitle, calloutBody,
            BRAND_COLOR
        );
    }

    private void sendHtmlEmail(String to, String subject, String htmlBody) {
        try {
            SendEmailRequest request = SendEmailRequest.builder()
                    .fromEmailAddress(FROM_ADDRESS)
                    .destination(Destination.builder().toAddresses(to).build())
                    .content(EmailContent.builder()
                            .simple(Message.builder()
                                    .subject(Content.builder().data(subject).charset("UTF-8").build())
                                    .body(Body.builder()
                                            .html(Content.builder().data(htmlBody).charset("UTF-8").build())
                                            .build())
                                    .build())
                            .build())
                    .build();
            sesV2Client.sendEmail(request);
            log.info("Email sent to {} | subject: {}", to, subject);
        } catch (Exception e) {
            log.error("Failed to send email to {} | subject: {} | error: {}", to, subject, e.getMessage());
        }
    }
}
