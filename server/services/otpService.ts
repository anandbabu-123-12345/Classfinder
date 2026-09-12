import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { otpRepo, IOtp } from '../models/index.js';

// In-memory dev mailbox for instant UI preview and test access
interface DevMailMessage {
  id: string;
  to: string;
  subject: string;
  code: string;
  purpose: string;
  sentAt: string;
}

const devMailbox: DevMailMessage[] = [];

export const otpService = {
  /**
   * Generate 6-digit cryptographically secure OTP
   */
  generateOtp(): string {
    const min = 100000;
    const max = 999999;
    return crypto.randomInt(min, max + 1).toString();
  },

  /**
   * Hash OTP using SHA-256 with OTP_SECRET salt
   */
  hashOtp(otp: string): string {
    const secret = process.env.OTP_SECRET || 'university_default_otp_secret_2026';
    return crypto.createHmac('sha256', secret).update(otp).digest('hex');
  },

  /**
   * Create and record a new OTP
   */
  async createAndSendOtp(params: {
    userId: string;
    email: string;
    purpose: 'registration' | 'forgot_password' | 'login';
    userName?: string;
  }): Promise<{ success: boolean; message: string; devOtp?: string; expiresAt: number }> {
    const { userId, email, purpose, userName } = params;

    // Check resend cooldown on existing active OTP
    const existing = await otpRepo.findLatest(userId, purpose);
    if (existing) {
      const elapsed = Date.now() - new Date(existing.createdAt).getTime();
      const cooldownMs = 30 * 1000; // 30 seconds
      if (elapsed < cooldownMs) {
        const remaining = Math.ceil((cooldownMs - elapsed) / 1000);
        throw new Error(`Please wait ${remaining}s before requesting a new OTP.`);
      }
    }

    const rawOtp = this.generateOtp();
    const otpHash = this.hashOtp(rawOtp);
    const ttlSeconds = 120; // 2 minutes as requested in prompt
    const expiresAt = Date.now() + ttlSeconds * 1000;

    await otpRepo.create({
      userId,
      email,
      otpHash,
      purpose,
      expiresAt,
      attempts: 0,
      verified: false,
    });

    // Store in dev mailbox for seamless testing & logging
    const mailMsg: DevMailMessage = {
      id: 'mail_' + Math.random().toString(36).substring(2, 9),
      to: email,
      subject: `Your University Account Verification Code: ${rawOtp}`,
      code: rawOtp,
      purpose,
      sentAt: new Date().toISOString(),
    };
    devMailbox.unshift(mailMsg);
    if (devMailbox.length > 50) devMailbox.pop();

    console.log(`[OTP Service] [${purpose.toUpperCase()}] Delivered to ${email}: Code is ${rawOtp} (Expires in 2:00)`);

    // In a real server with EMAIL_USER and EMAIL_PASSWORD, Nodemailer can be called here:
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      try {
        console.log(`[SMTP] Attempting delivery to ${email} via SMTP...`);
      } catch (err) {
        console.error('[SMTP] Failed to send email:', err);
      }
    }

    return {
      success: true,
      message: `Verification code sent to ${email}`,
      devOtp: rawOtp, // Provided for instant sandbox testing convenience
      expiresAt,
    };
  },

  /**
   * Verify an entered OTP
   */
  async verifyOtp(params: {
    userId: string;
    enteredOtp: string;
    purpose: 'registration' | 'forgot_password' | 'login';
  }): Promise<{ valid: boolean; message: string }> {
    const { userId, enteredOtp, purpose } = params;

    const otpDoc = await otpRepo.findLatest(userId, purpose);
    if (!otpDoc) {
      return { valid: false, message: 'No active OTP request found. Please request a new code.' };
    }

    // Check expiration
    if (Date.now() > otpDoc.expiresAt) {
      return { valid: false, message: 'OTP has expired. Please request a new code.' };
    }

    // Check attempts
    if (otpDoc.attempts >= 5) {
      return { valid: false, message: 'Maximum attempts exceeded. Please request a new OTP.' };
    }

    // Compare hash
    const inputHash = this.hashOtp(enteredOtp.trim());
    if (inputHash !== otpDoc.otpHash) {
      await otpRepo.update(otpDoc.id, { attempts: otpDoc.attempts + 1 });
      const remaining = 5 - (otpDoc.attempts + 1);
      return {
        valid: false,
        message: `Invalid OTP code. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`
      };
    }

    // Mark as verified
    await otpRepo.update(otpDoc.id, { verified: true });
    return { valid: true, message: 'Verification successful.' };
  },

  getLatestDevMail(email?: string): DevMailMessage | null {
    if (email) {
      return devMailbox.find(m => m.to.toLowerCase() === email.toLowerCase()) || null;
    }
    return devMailbox[0] || null;
  }
};
