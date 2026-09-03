import { firebaseConfig } from '../config/firebase';

/**
 * Service to handle Firebase Phone Authentication & SMS OTP verification
 */
export interface SendOtpResult {
  success: boolean;
  sessionInfo?: string;
  message?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  idToken?: string;
  phoneNumber?: string;
  message?: string;
}

// Memory cache for verification sessions in the active flow
let currentSessionInfo: string | null = null;
let currentPhoneNumber: string | null = null;

/**
 * Formats any input phone number to standard E.164 (e.g. +917709666390)
 */
export function formatToE164(phone: string, defaultCountryCode = '+91'): string {
  const clean = phone.replace(/[\s\-\(\)]/g, '');
  if (clean.startsWith('+')) {
    return clean;
  }
  const digits = clean.replace(/\D/g, '');
  const last10 = digits.slice(-10);
  return `${defaultCountryCode}${last10}`;
}

/**
 * Sends a real SMS verification code via Firebase Identity Toolkit
 */
export async function sendFirebaseOtp(phone: string, recaptchaToken?: string): Promise<SendOtpResult> {
  try {
    const formattedPhone = formatToE164(phone);
    currentPhoneNumber = formattedPhone;

    const payload: Record<string, any> = {
      phoneNumber: formattedPhone
    };
    if (recaptchaToken) {
      payload.recaptchaToken = recaptchaToken;
    }

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (data.sessionInfo) {
      currentSessionInfo = data.sessionInfo;
      return {
        success: true,
        sessionInfo: data.sessionInfo
      };
    } else {
      const errorMsg = data.error?.message || 'Failed to dispatch verification code via Firebase';
      return {
        success: false,
        message: errorMsg
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Network error while contacting Firebase Auth'
    };
  }
}

/**
 * Verifies the 6-digit OTP code entered by the user against Firebase
 */
export async function verifyFirebaseOtp(code: string, sessionInfo?: string): Promise<VerifyOtpResult> {
  try {
    const session = sessionInfo || currentSessionInfo;
    if (!session) {
      return {
        success: false,
        message: 'No active verification session found. Please request a new code.'
      };
    }

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionInfo: session,
          code: code.trim()
        })
      }
    );

    const data = await response.json();

    if (data.idToken) {
      return {
        success: true,
        idToken: data.idToken,
        phoneNumber: data.phoneNumber || currentPhoneNumber || undefined
      };
    } else {
      const errorMsg = data.error?.message || 'Invalid verification code. Please check and try again.';
      return {
        success: false,
        message: errorMsg
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Error verifying OTP code'
    };
  }
}

export function getCurrentSession(): string | null {
  return currentSessionInfo;
}

export function clearSession(): void {
  currentSessionInfo = null;
  currentPhoneNumber = null;
}
