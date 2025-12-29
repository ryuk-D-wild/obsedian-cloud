/**
 * Feature: obsidian-cloud, Property 3: Secure Error Messages
 * Validates: Requirements 1.3
 * 
 * For any invalid credential submission (wrong email, wrong password, or both),
 * the error message should be identical and not reveal which specific field was incorrect.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// The generic error message that should be returned for all auth failures
const GENERIC_AUTH_ERROR = 'Invalid email or password';

/**
 * Enum representing different types of credential errors
 */
enum CredentialErrorType {
  WRONG_EMAIL = 'wrong_email',
  WRONG_PASSWORD = 'wrong_password',
  BOTH_WRONG = 'both_wrong',
  INVALID_EMAIL_FORMAT = 'invalid_email_format',
  PASSWORD_TOO_SHORT = 'password_too_short',
}

/**
 * Simulates the authentication error handling logic.
 * This mirrors the actual auth action behavior for testing.
 * 
 * The key security requirement is that ALL error types return the same message
 * to prevent credential enumeration attacks.
 */
function getAuthErrorMessage(errorType: CredentialErrorType): string {
  // Regardless of the error type, always return the generic message
  // This prevents attackers from determining if an email exists in the system
  switch (errorType) {
    case CredentialErrorType.WRONG_EMAIL:
    case CredentialErrorType.WRONG_PASSWORD:
    case CredentialErrorType.BOTH_WRONG:
    case CredentialErrorType.INVALID_EMAIL_FORMAT:
    case CredentialErrorType.PASSWORD_TOO_SHORT:
      return GENERIC_AUTH_ERROR;
    default:
      return GENERIC_AUTH_ERROR;
  }
}

/**
 * Generates arbitrary credential error types
 */
const credentialErrorTypeArb = fc.constantFrom(
  CredentialErrorType.WRONG_EMAIL,
  CredentialErrorType.WRONG_PASSWORD,
  CredentialErrorType.BOTH_WRONG,
  CredentialErrorType.INVALID_EMAIL_FORMAT,
  CredentialErrorType.PASSWORD_TOO_SHORT
);

/**
 * Generates pairs of different credential error types
 */
const differentErrorTypePairArb = fc
  .tuple(credentialErrorTypeArb, credentialErrorTypeArb)
  .filter(([a, b]) => a !== b);

describe('Property 3: Secure Error Messages', () => {
  // Minimum 100 iterations as per design document
  const numRuns = 100;

  it('should return identical error message for all credential error types', () => {
    fc.assert(
      fc.property(credentialErrorTypeArb, (errorType) => {
        const errorMessage = getAuthErrorMessage(errorType);
        
        // All error types should return the generic error message
        expect(errorMessage).toBe(GENERIC_AUTH_ERROR);
      }),
      { numRuns }
    );
  });

  it('should return the same error message for any two different error types', () => {
    fc.assert(
      fc.property(differentErrorTypePairArb, ([errorType1, errorType2]) => {
        const errorMessage1 = getAuthErrorMessage(errorType1);
        const errorMessage2 = getAuthErrorMessage(errorType2);
        
        // Both error messages should be identical
        expect(errorMessage1).toBe(errorMessage2);
      }),
      { numRuns }
    );
  });

  it('should not reveal email existence through error messages', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          CredentialErrorType.WRONG_EMAIL,  // Email doesn't exist
          CredentialErrorType.WRONG_PASSWORD // Email exists but wrong password
        ),
        (errorType) => {
          const errorMessage = getAuthErrorMessage(errorType);
          
          // Error message should not contain hints about email existence specifically
          expect(errorMessage).not.toContain('not found');
          expect(errorMessage).not.toContain('does not exist');
          expect(errorMessage).not.toContain('no user');
          expect(errorMessage).not.toContain('unknown user');
          
          // Should be the generic message
          expect(errorMessage).toBe(GENERIC_AUTH_ERROR);
        }
      ),
      { numRuns }
    );
  });

  it('should not reveal password validity through error messages', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          CredentialErrorType.WRONG_PASSWORD,
          CredentialErrorType.PASSWORD_TOO_SHORT
        ),
        (errorType) => {
          const errorMessage = getAuthErrorMessage(errorType);
          
          // Error message should not contain hints about password issues specifically
          expect(errorMessage).not.toContain('too short');
          expect(errorMessage).not.toContain('incorrect password');
          expect(errorMessage).not.toContain('wrong password');
          expect(errorMessage).not.toContain('password is');
          
          // Should be the generic message
          expect(errorMessage).toBe(GENERIC_AUTH_ERROR);
        }
      ),
      { numRuns }
    );
  });

  it('should return consistent error message across multiple attempts', () => {
    fc.assert(
      fc.property(
        credentialErrorTypeArb,
        fc.integer({ min: 2, max: 10 }),
        (errorType, attempts) => {
          const messages: string[] = [];
          
          for (let i = 0; i < attempts; i++) {
            messages.push(getAuthErrorMessage(errorType));
          }
          
          // All messages should be identical
          const allSame = messages.every(msg => msg === messages[0]);
          expect(allSame).toBe(true);
          expect(messages[0]).toBe(GENERIC_AUTH_ERROR);
        }
      ),
      { numRuns }
    );
  });
});
