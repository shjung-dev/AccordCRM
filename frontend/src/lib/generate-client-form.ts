const formStyles = `
    @page {
      size: A4;
      margin: 15mm 18mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
      color: #1a1a1a;
      line-height: 1.5;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      max-width: 210mm;
      margin: 0 auto;
      padding: 0 10mm;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #0f2b5b;
      padding-bottom: 12px;
      margin-bottom: 6px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .logo-container {
      width: 52px;
      height: 52px;
      background: #0f2b5b;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .logo-text {
      color: #fff;
      font-size: 20pt;
      font-weight: 700;
      letter-spacing: -1px;
    }

    .bank-name {
      font-size: 18pt;
      font-weight: 700;
      color: #0f2b5b;
      letter-spacing: 0.5px;
    }

    .bank-subtitle {
      font-size: 8pt;
      color: #5a6a7a;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 2px;
    }

    .header-right {
      text-align: right;
      font-size: 7.5pt;
      color: #5a6a7a;
      line-height: 1.6;
    }

    .sub-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .sub-header-left {
      font-size: 7.5pt;
      color: #5a6a7a;
    }

    .form-ref {
      font-size: 7.5pt;
      color: #5a6a7a;
      text-align: right;
    }

    /* Title */
    .form-title {
      text-align: center;
      background: #0f2b5b;
      color: #fff;
      padding: 10px 0;
      font-size: 13pt;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 16px;
      border-radius: 4px;
    }

    .form-notice {
      font-size: 8pt;
      color: #5a6a7a;
      text-align: center;
      margin-bottom: 18px;
      font-style: italic;
    }

    /* Sections */
    .section {
      margin-bottom: 14px;
      break-inside: avoid;
    }

    .section-title {
      font-size: 10pt;
      font-weight: 700;
      color: #0f2b5b;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-bottom: 2px solid #0f2b5b;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }

    .section-subtitle {
      font-size: 8pt;
      color: #5a6a7a;
      margin-bottom: 10px;
      font-style: italic;
    }

    /* Form fields */
    .field-row {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
    }

    .field {
      flex: 1;
      margin-bottom: 6px;
    }

    .field-full {
      width: 100%;
      margin-bottom: 6px;
    }

    .field-label {
      font-size: 8pt;
      font-weight: 600;
      color: #333;
      margin-bottom: 3px;
      display: block;
    }

    .field-input {
      border: 1px solid #c0c8d0;
      border-radius: 3px;
      height: 28px;
      width: 100%;
      background: #fafbfc;
      padding: 0 8px;
      font-size: 9pt;
    }

    .field-input-tall {
      border: 1px solid #c0c8d0;
      border-radius: 3px;
      height: 56px;
      width: 100%;
      background: #fafbfc;
    }

    .field-input-medium {
      border: 1px solid #c0c8d0;
      border-radius: 3px;
      height: 42px;
      width: 100%;
      background: #fafbfc;
    }

    /* Checkbox groups */
    .checkbox-group {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 6px;
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 9pt;
    }

    .checkbox {
      width: 14px;
      height: 14px;
      border: 1.5px solid #8a94a0;
      border-radius: 2px;
      display: inline-block;
      flex-shrink: 0;
    }

    /* Terms section */
    .terms-box {
      border: 1px solid #c0c8d0;
      border-radius: 4px;
      padding: 12px 14px;
      margin-bottom: 10px;
      background: #fafbfc;
      font-size: 7.5pt;
      line-height: 1.6;
      color: #444;
    }

    .terms-box p {
      margin-bottom: 6px;
    }

    .terms-box p:last-child {
      margin-bottom: 0;
    }

    .terms-title {
      font-weight: 700;
      color: #0f2b5b;
      font-size: 8pt;
      margin-bottom: 4px;
    }

    .terms-list {
      padding-left: 16px;
      margin-bottom: 6px;
    }

    .terms-list li {
      margin-bottom: 3px;
    }

    /* Signature section */
    .signature-section {
      margin-top: 10px;
      break-inside: avoid;
    }

    .signature-row {
      display: flex;
      gap: 40px;
      margin-top: 14px;
    }

    .signature-block {
      flex: 1;
    }

    .signature-line {
      border-bottom: 1px solid #333;
      height: 50px;
      margin-bottom: 4px;
    }

    .signature-label {
      font-size: 8pt;
      color: #5a6a7a;
    }

    /* Footer */
    .footer {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 2px solid #0f2b5b;
      font-size: 7pt;
      color: #8a94a0;
      text-align: center;
      line-height: 1.5;
    }

    .footer-bold {
      font-weight: 600;
      color: #5a6a7a;
    }

    .important-note {
      background: #fff8e1;
      border: 1px solid #f0d060;
      border-radius: 4px;
      padding: 8px 12px;
      font-size: 8pt;
      color: #6d5c00;
      margin-bottom: 14px;
    }

    .important-note strong {
      color: #4a3d00;
    }`;

const formBody = `
    <!-- HEADER -->
    <div class="header">
      <div class="header-left">
        <div class="logo-container">
          <span class="logo-text">AF</span>
        </div>
        <div>
          <div class="bank-name">Accord Financial Group</div>
          <div class="bank-subtitle">Wealth Management &amp; Private Banking</div>
        </div>
      </div>
      <div class="header-right">
        <div><strong>Accord Financial Group Pte. Ltd.</strong></div>
        <div>One Raffles Quay, #28-01 North Tower</div>
        <div>Singapore 048583</div>
        <div>Tel: +65 6438 8000 | Fax: +65 6438 8001</div>
        <div>www.accordfinancial.com.sg</div>
        <div>MAS License No. CMS100456</div>
      </div>
    </div>

    <div class="sub-header">
      <div class="sub-header-left">
        Co. Reg. No. 200312456K | GST Reg. No. M2-0034567-8
      </div>
      <div class="form-ref">
        Form Ref: AFG/CAF/2025/Rev.3<br>
        Date of Issue: January 2025
      </div>
    </div>

    <!-- TITLE -->
    <div class="form-title">Client Account Application Form</div>

    <div class="form-notice">
      Please complete this form in BLOCK LETTERS using black or blue ink. All fields marked with an asterisk (*) are mandatory.
    </div>

    <div class="important-note">
      <strong>Important:</strong> Please ensure all information provided is true, accurate, and complete to the best of your knowledge.
      Incomplete applications will not be processed.
    </div>

    <!-- SECTION A: PERSONAL INFORMATION -->
    <div class="section">
      <div class="section-title">Section A &mdash; Personal Information</div>
      <div class="field-row">
        <div class="field">
          <span class="field-label">First Name *</span>
          <div class="field-input"></div>
        </div>
        <div class="field">
          <span class="field-label">Last Name *</span>
          <div class="field-input"></div>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <span class="field-label">Identification Number *</span>
          <div class="field-input"></div>
        </div>
        <div class="field">
          <span class="field-label">Date of Birth (DD/MM/YYYY) *</span>
          <div class="field-input"></div>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <span class="field-label">Gender *</span>
          <div class="checkbox-group">
            <span class="checkbox-item"><span class="checkbox"></span> Male</span>
            <span class="checkbox-item"><span class="checkbox"></span> Female</span>
            <span class="checkbox-item"><span class="checkbox"></span> Non-binary</span>
            <span class="checkbox-item"><span class="checkbox"></span> Prefer not to say</span>
          </div>
        </div>
      </div>
    </div>

    <!-- SECTION B: CONTACT DETAILS -->
    <div class="section">
      <div class="section-title">Section B &mdash; Contact Details</div>
      <div class="field-row">
        <div class="field">
          <span class="field-label">Email Address *</span>
          <div class="field-input"></div>
        </div>
        <div class="field">
          <span class="field-label">Phone Number *</span>
          <div class="field-input"></div>
        </div>
      </div>
    </div>

    <!-- SECTION C: RESIDENTIAL ADDRESS -->
    <div class="section">
      <div class="section-title">Section C &mdash; Residential Address</div>
      <div class="field-row">
        <div class="field" style="flex: 2;">
          <span class="field-label">Address *</span>
          <div class="field-input-medium"></div>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <span class="field-label">City *</span>
          <div class="field-input"></div>
        </div>
        <div class="field">
          <span class="field-label">State *</span>
          <div class="field-input"></div>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <span class="field-label">Country *</span>
          <div class="field-input"></div>
        </div>
        <div class="field">
          <span class="field-label">Postal Code *</span>
          <div class="field-input"></div>
        </div>
      </div>
    </div>

    <!-- SECTION D: DECLARATION & PDPA -->
    <div class="section">
      <div class="section-title">Section D &mdash; Declaration, Terms &amp; PDPA Consent</div>

      <div class="terms-box">
        <div class="terms-title">Declaration</div>
        <p>I hereby declare that the information provided in this application form is true, correct, and complete to the best of my knowledge and belief. I understand that any false or misleading information may result in the rejection of this application or the closure of my account(s).</p>
        <p>I agree to be bound by the Terms and Conditions governing the account(s) applied for, as may be amended from time to time by Accord Financial Group Pte. Ltd. (&ldquo;AFG&rdquo;), and acknowledge that I have received, read, and understood a copy of the same.</p>
        <p>I undertake to inform AFG promptly of any changes to the information provided herein, including but not limited to changes in personal particulars and contact details.</p>
      </div>

      <div class="terms-box">
        <div class="terms-title">Personal Data Protection Act (PDPA) Consent</div>
        <p>I acknowledge that AFG collects, uses, and discloses my personal data in accordance with the Personal Data Protection Act 2012 (PDPA) of Singapore and AFG&rsquo;s Privacy Policy (available at www.accordfinancial.com.sg/privacy).</p>
        <p>I consent to AFG collecting, using, processing, and disclosing my personal data for the following purposes:</p>
        <ol class="terms-list">
          <li>Processing and administering this application and any account(s) opened;</li>
          <li>Conducting identity verification, due diligence, and credit checks as required;</li>
          <li>Complying with applicable laws, regulations, codes of practice, guidelines, and rules issued by any regulatory or statutory authority;</li>
          <li>Managing and maintaining the banking relationship, including customer service and support;</li>
          <li>Any other purposes reasonably related to the foregoing.</li>
        </ol>
        <p>I understand that I may withdraw my consent at any time by contacting AFG&rsquo;s Data Protection Officer at dpo@accordfinancial.com.sg or +65 6438 8050. Withdrawal of consent may result in AFG being unable to continue providing certain services.</p>
      </div>

      <div class="signature-section">
        <div class="signature-row">
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">Applicant&rsquo;s Signature</div>
          </div>
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">Date (DD/MM/YYYY)</div>
          </div>
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <div class="footer-bold">Accord Financial Group Pte. Ltd.</div>
      <div>One Raffles Quay, #28-01 North Tower, Singapore 048583</div>
      <div>Licensed by the Monetary Authority of Singapore (MAS) | Member of the Singapore Deposit Insurance Corporation (SDIC)</div>
      <div style="margin-top: 4px;">This form is the property of Accord Financial Group Pte. Ltd. Unauthorised reproduction or distribution is strictly prohibited.</div>
      <div style="margin-top: 2px;">&copy; 2025 Accord Financial Group Pte. Ltd. All rights reserved. | AFG/CAF/2025/Rev.3</div>
    </div>`;

export function getFormPreviewHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accord Financial Group - Client Account Application Form</title>
  <style>${formStyles}</style>
</head>
<body>
  <div class="page">${formBody}</div>
</body>
</html>`;
}

export function downloadClientApplicationForm() {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.opacity = "0";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument;
  if (!iframeDoc || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(getFormPreviewHtml());
  iframeDoc.close();

  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 250);
}
