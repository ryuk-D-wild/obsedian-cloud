import { z } from 'zod';

// Schema for user sign-in
export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Schema for user sign-up/registration
export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less').optional(),
});

// Schema for updating user profile
export const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less').optional(),
  image: z.string().url('Invalid image URL').optional(),
});

// Inferred TypeScript types from Zod schemas
export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
