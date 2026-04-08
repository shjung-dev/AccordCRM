package com.example.account_service.service;

import com.example.account_service.model.Account;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.*;

import java.util.Map;
import java.util.UUID;

@Service
public class AccountEmailService {

    private static final Logger log = LoggerFactory.getLogger(AccountEmailService.class);

    private static final String BRAND_COLOR  = "#1a3353";
    private static final String ACCENT_COLOR = "#c9a84c";
    private static final String FROM_ADDRESS = "AccordCRM <accordcrm.noreply@gmail.com>";

    private final SesV2Client sesV2Client;
    private final RestTemplate restTemplate;

    @Value("${client.service.url:http://localhost:8082}")
    private String clientServiceUrl;

    public AccountEmailService(SesV2Client sesV2Client, RestTemplate restTemplate) {
        this.sesV2Client = sesV2Client;
        this.restTemplate = restTemplate;
    }

    public void sendAccountCreatedEmail(Account account) {
        String email = fetchClientEmail(account.getClientId());
        if (email == null) return;

        String subject = "Your New Account Has Been Created – AccordCRM";
        String body = buildEmail(
            "Account Created",
            """
            <p style="margin:0 0 16px 0;">A new <strong>%s</strong> account has been
            successfully created for you.</p>
            <table style="width:100%%;border-collapse:collapse;margin:0 0 24px 0;font-size:14px;">
              <tr>
                <td style="padding:8px 0;color:#888888;width:40%%;">Account ID</td>
                <td style="padding:8px 0;color:#333333;font-weight:bold;">%s</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#888888;">Account Type</td>
                <td style="padding:8px 0;color:#333333;">%s</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#888888;">Opening Date</td>
                <td style="padding:8px 0;color:#333333;">%s</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#888888;">Currency</td>
                <td style="padding:8px 0;color:#333333;">%s</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#888888;">Initial Balance</td>
                <td style="padding:8px 0;color:#333333;">%s %s</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#888888;">Status</td>
                <td style="padding:8px 0;color:#333333;">%s</td>
              </tr>
            </table>
            """.formatted(
                account.getAccountType(),
                account.getAccountId(),
                account.getAccountType(),
                account.getOpeningDate(),
                account.getCurrency(),
                account.getCurrency(), account.getBalance(),
                account.getAccountStatus()
            ),
            "What happens next?",
            "Your account will be fully activated once your identity verification is complete. Contact your assigned agent for more information."
        );
        sendHtmlEmail(email, subject, body);
    }

    public void sendAccountDeletedEmail(Account account) {
        String email = fetchClientEmail(account.getClientId());
        if (email == null) return;

        String subject = "Your Account Has Been Closed – AccordCRM";
        String body = buildEmail(
            "Account Closed",
            """
            <p style="margin:0 0 16px 0;">Your <strong>%s</strong> account has been
            closed and is no longer active.</p>
            <table style="width:100%%;border-collapse:collapse;margin:0 0 24px 0;font-size:14px;">
              <tr>
                <td style="padding:8px 0;color:#888888;width:40%%;">Account ID</td>
                <td style="padding:8px 0;color:#333333;font-weight:bold;">%s</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#888888;">Account Type</td>
                <td style="padding:8px 0;color:#333333;">%s</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#888888;">Status</td>
                <td style="padding:8px 0;color:#c0392b;font-weight:bold;">Inactive</td>
              </tr>
            </table>
            """.formatted(
                account.getAccountType(),
                account.getAccountId(),
                account.getAccountType()
            ),
            "Think this was a mistake?",
            "Contact your assigned agent or our support team right away and we will investigate."
        );
        sendHtmlEmail(email, subject, body);
    }

    @SuppressWarnings("unchecked")
    private String fetchClientEmail(UUID clientId) {
        try {
            String url = clientServiceUrl + "/api/clients/" + clientId;
            Map<String, Object> client = restTemplate.getForObject(url, Map.class);
            if (client == null) return null;
            return (String) client.get("emailAddress");
        } catch (Exception e) {
            log.error("Could not fetch client email for clientId={} | error: {}", clientId, e.getMessage());
            return null;
        }
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
