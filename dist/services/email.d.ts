/**
 * Email Service
 * Handles email notifications for seller submissions
 * Currently a stub for development - can be extended with Nodemailer, SendGrid, etc.
 */
import { SubmissionDetail } from './seller-submissions';
export interface EmailNotification {
    to: string;
    subject: string;
    body: string;
    htmlBody?: string;
    type: 'submission_confirmation' | 'submission_status_update' | 'quote_ready' | 'counter_offer';
}
/**
 * Send submission confirmation email to seller
 */
export declare function sendSubmissionConfirmation(submission: SubmissionDetail): Promise<boolean>;
/**
 * Send submission status update email
 */
export declare function sendSubmissionStatusUpdate(submission: SubmissionDetail, newStatus: string): Promise<boolean>;
/**
 * Send counter-offer notification to seller
 */
export declare function sendCounterOfferNotification(to: string, submissionNumber: string, itemTitle: string, itemArtist: string, newPrice: number, quantity: number): Promise<boolean>;
/**
 * Main email sending function
 * In production, this would integrate with SendGrid, Nodemailer, AWS SES, etc.
 */
export declare function sendEmail(notification: EmailNotification): Promise<boolean>;
//# sourceMappingURL=email.d.ts.map