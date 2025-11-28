/**
 * Email Service
 * Handles email notifications for seller submissions
 * Currently a stub for development - can be extended with Nodemailer, SendGrid, etc.
 */
/**
 * Send submission confirmation email to seller
 */
export async function sendSubmissionConfirmation(submission) {
    const emailData = {
        to: submission.sellerEmail,
        subject: `Submission Confirmed - ${submission.submissionNumber}`,
        body: formatSubmissionConfirmationText(submission),
        htmlBody: formatSubmissionConfirmationHtml(submission),
        type: 'submission_confirmation',
    };
    return sendEmail(emailData);
}
/**
 * Send submission status update email
 */
export async function sendSubmissionStatusUpdate(submission, newStatus) {
    const statusMessage = getStatusMessage(newStatus);
    const emailData = {
        to: submission.sellerEmail,
        subject: `Submission Status Update - ${submission.submissionNumber}`,
        body: formatStatusUpdateText(submission, statusMessage),
        htmlBody: formatStatusUpdateHtml(submission, statusMessage),
        type: 'submission_status_update',
    };
    return sendEmail(emailData);
}
/**
 * Send counter-offer notification to seller
 */
export async function sendCounterOfferNotification(to, submissionNumber, itemTitle, itemArtist, newPrice, quantity) {
    const emailData = {
        to,
        subject: `Counter-Offer Update - ${submissionNumber}`,
        body: formatCounterOfferText(submissionNumber, itemArtist, itemTitle, newPrice, quantity),
        htmlBody: formatCounterOfferHtml(submissionNumber, itemArtist, itemTitle, newPrice, quantity),
        type: 'counter_offer',
    };
    return sendEmail(emailData);
}
/**
 * Main email sending function
 * In production, this would integrate with SendGrid, Nodemailer, AWS SES, etc.
 */
export async function sendEmail(notification) {
    try {
        // TODO: In production, integrate with actual email service
        // For now, just log the email
        console.log(`[EMAIL] Sending ${notification.type} to ${notification.to}`);
        console.log(`[EMAIL] Subject: ${notification.subject}`);
        console.log(`[EMAIL] Body: ${notification.body.substring(0, 100)}...`);
        // Return success for development
        return true;
    }
    catch (error) {
        console.error(`[EMAIL] Error sending email:`, error);
        return false;
    }
}
/**
 * Format submission confirmation as plain text
 */
function formatSubmissionConfirmationText(submission) {
    const itemsList = submission.items
        .map((item, i) => `${i + 1}. ${item.artist} - ${item.title}
   Quantity: ${item.quantity}
   Media Condition: ${item.conditionMedia}
   Sleeve Condition: ${item.conditionSleeve}
   Offer: $${item.autoOfferPrice.toFixed(2)}`)
        .join('\n\n');
    return `Dear Seller,

Thank you for your submission! We've received your offer for review.

Submission Details:
Submission Number: ${submission.submissionNumber}
Submission Date: ${submission.createdAt.toLocaleDateString()}
Expected Payout: $${submission.expectedPayout.toFixed(2)}
Offer Expires: ${submission.expiresAt.toLocaleDateString()}

Items Submitted:
${itemsList}

Current Status: ${submission.status}

You can track your submission status at any time using your submission number: ${submission.submissionNumber}

If you have any questions, please reply to this email or contact our support team.

Best regards,
The Vinyl Records Team`;
}
/**
 * Format submission confirmation as HTML
 */
function formatSubmissionConfirmationHtml(submission) {
    const itemsHtml = submission.items
        .map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.artist} - ${item.title}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.conditionMedia} / ${item.conditionSleeve}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.autoOfferPrice.toFixed(2)}</td>
    </tr>
  `)
        .join('');
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 20px; border-radius: 4px; }
    .item-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .item-table th { background-color: #4CAF50; color: white; padding: 10px; text-align: left; }
    .summary { background-color: white; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Submission Confirmed!</h2>
    </div>
    <div class="content">
      <p>Dear Seller,</p>
      <p>Thank you for your submission! We've received your offer for review.</p>

      <div class="summary">
        <p><strong>Submission Number:</strong> ${submission.submissionNumber}</p>
        <p><strong>Submission Date:</strong> ${submission.createdAt.toLocaleDateString()}</p>
        <p><strong>Expected Payout:</strong> <strong>$${submission.expectedPayout.toFixed(2)}</strong></p>
        <p><strong>Offer Expires:</strong> ${submission.expiresAt.toLocaleDateString()}</p>
        <p><strong>Status:</strong> ${submission.status}</p>
      </div>

      <h3>Items Submitted:</h3>
      <table class="item-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Condition</th>
            <th>Offer</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <p>You can track your submission status at any time using your submission number: <strong>${submission.submissionNumber}</strong></p>
      <p>If you have any questions, please reply to this email or contact our support team.</p>

      <p>Best regards,<br>The Vinyl Records Team</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Vinyl Records. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}
/**
 * Format status update as plain text
 */
function formatStatusUpdateText(submission, statusMessage) {
    return `Dear Seller,

We wanted to let you know that your submission (${submission.submissionNumber}) has been updated.

${statusMessage}

Current Status: ${submission.status}
${submission.actualPayout ? `Actual Payout: $${submission.actualPayout.toFixed(2)}` : ''}

If you have any questions, please reply to this email.

Best regards,
The Vinyl Records Team`;
}
/**
 * Format status update as HTML
 */
function formatStatusUpdateHtml(submission, statusMessage) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 20px; border-radius: 4px; }
    .status-box { background-color: white; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Submission Status Update</h2>
    </div>
    <div class="content">
      <p>Dear Seller,</p>
      <p>We wanted to let you know that your submission <strong>${submission.submissionNumber}</strong> has been updated.</p>

      <div class="status-box">
        <p>${statusMessage}</p>
        <p><strong>Current Status:</strong> ${submission.status}</p>
        ${submission.actualPayout ? `<p><strong>Actual Payout:</strong> $${submission.actualPayout.toFixed(2)}</p>` : ''}
      </div>

      <p>If you have any questions, please reply to this email.</p>

      <p>Best regards,<br>The Vinyl Records Team</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Vinyl Records. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}
/**
 * Format counter-offer notification as plain text
 */
function formatCounterOfferText(submissionNumber, artist, title, newPrice, quantity) {
    const totalValue = newPrice * quantity;
    return `Dear Seller,

We have reviewed your submission (${submissionNumber}) and would like to present a counter-offer for your consideration.

Item: ${artist} - ${title}
Quantity: ${quantity}
Counter-Offer Price Per Unit: $${newPrice.toFixed(2)}
Total Value: $${totalValue.toFixed(2)}

Please review this counter-offer and let us know if you would like to accept or decline.

If you accept this counter-offer, we will proceed with processing your submission.
If you have any questions about the counter-offer, please reply to this email.

Best regards,
The Vinyl Records Team`;
}
/**
 * Format counter-offer notification as HTML
 */
function formatCounterOfferHtml(submissionNumber, artist, title, newPrice, quantity) {
    const totalValue = newPrice * quantity;
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 20px; border-radius: 4px; }
    .offer-box { background-color: white; padding: 20px; border-left: 4px solid #FF9800; margin: 20px 0; }
    .offer-item { margin: 15px 0; }
    .offer-label { font-weight: bold; color: #666; }
    .offer-value { font-size: 18px; color: #333; margin-top: 5px; }
    .price-highlight { color: #FF9800; font-size: 20px; font-weight: bold; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Counter-Offer for Your Submission</h2>
    </div>
    <div class="content">
      <p>Dear Seller,</p>
      <p>We have reviewed your submission <strong>${submissionNumber}</strong> and would like to present a counter-offer for your consideration.</p>

      <div class="offer-box">
        <div class="offer-item">
          <div class="offer-label">Item:</div>
          <div class="offer-value">${artist} - ${title}</div>
        </div>

        <div class="offer-item">
          <div class="offer-label">Quantity:</div>
          <div class="offer-value">${quantity}</div>
        </div>

        <div class="offer-item">
          <div class="offer-label">Counter-Offer Price Per Unit:</div>
          <div class="price-highlight">$${newPrice.toFixed(2)}</div>
        </div>

        <div class="offer-item">
          <div class="offer-label">Total Value:</div>
          <div class="price-highlight">$${totalValue.toFixed(2)}</div>
        </div>
      </div>

      <p>Please review this counter-offer and let us know if you would like to accept or decline.</p>
      <p>If you accept this counter-offer, we will proceed with processing your submission.</p>
      <p>If you have any questions about the counter-offer, please reply to this email.</p>

      <p>Best regards,<br>The Vinyl Records Team</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Vinyl Records. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}
/**
 * Get human-readable status message
 */
function getStatusMessage(status) {
    const statusMessages = {
        pending_review: 'Your submission is currently under review by our team. We will evaluate the condition of your items and provide you with a final offer.',
        accepted: 'Great news! Your submission has been accepted. We will be sending you further instructions on how to proceed.',
        rejected: 'Unfortunately, we are unable to accept your submission at this time.',
        counter_offered: 'We have reviewed your submission and would like to offer you a counter-offer. Please check your submission for details.',
        payment_sent: 'Your payment has been processed and sent. Please allow 1-3 business days for the funds to appear in your account.',
        expired: 'Your submission offer has expired. Please submit a new offer if you would like to sell your items to us.',
    };
    return statusMessages[status] || `Your submission status has been updated to: ${status}`;
}
//# sourceMappingURL=email.js.map