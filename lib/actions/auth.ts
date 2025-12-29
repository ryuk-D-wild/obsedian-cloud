'use server';

import { signIn, signOut } from '@/lib/auth';
import { signInSchema } from '@/lib/validations/user';
import { AuthError } from 'next-auth';

// Generic error message to prevent credential enumeration
const GENERIC_AUTH_ERROR = 'Invalid email or password';

export interface AuthResult {
  success: boolean;
  error?: string;
}

export async function authenticate(
  _prevState: AuthResult | undefined,
  formData: FormData
): Promise<AuthResult> {
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  // Validate input
  const parsed = signInSchema.safeParse(rawData);
  if (!parsed.success) {
    // Return generic error to prevent field-specific hints
    return { success: false, error: GENERIC_AUTH_ERROR };
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      // Always return generic error regardless of actual error type
      // This prevents credential enumeration attacks
      return { success: false, error: GENERIC_AUTH_ERROR };
    }
    throw error;
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirect: false });
}
