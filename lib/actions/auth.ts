'use server';

import { signIn, signOut } from '@/lib/auth';
import { signInSchema, signUpSchema } from '@/lib/validations/user';
import { prisma } from '@/lib/db';
import { AuthError } from 'next-auth';
import bcrypt from 'bcryptjs';

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

export async function register(
  _prevState: AuthResult | undefined,
  formData: FormData
): Promise<AuthResult> {
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name'),
  };

  // Validate input
  const parsed = signUpSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existingUser) {
      return { success: false, error: 'Email already registered' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name || 'User',
        passwordHash,
      },
    });

    // Create default workspace for new user
    await prisma.workspace.create({
      data: {
        name: 'My Workspace',
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
      },
    });

    // Sign in the user
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Registration failed. Please try again.' };
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirect: false });
}
