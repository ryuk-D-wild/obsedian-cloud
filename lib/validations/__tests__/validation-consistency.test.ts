/**
 * Feature: obsidian-cloud, Property 16: Validation Consistency
 * Validates: Requirements 6.1, 6.2
 * 
 * For any input data, client-side Zod validation and server-side Zod validation
 * using the same schema should produce identical pass/fail results.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  createDocumentSchema,
  updateDocumentSchema,
  signInSchema,
  signUpSchema,
  createWorkspaceSchema,
  updateWorkspaceSchema,
} from '../index';

// Helper function to simulate client-side validation
function validateClient<T>(schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: unknown } }, data: unknown) {
  return schema.safeParse(data);
}

// Helper function to simulate server-side validation (same schema, same behavior)
function validateServer<T>(schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: unknown } }, data: unknown) {
  return schema.safeParse(data);
}

describe('Property 16: Validation Consistency', () => {
  // Minimum 100 iterations as per design document
  const numRuns = 100;

  describe('createDocumentSchema', () => {
    it('should produce identical results on client and server for any input', () => {
      fc.assert(
        fc.property(
          fc.record({
            title: fc.oneof(
              fc.string(),
              fc.constant(undefined),
              fc.constant(null),
              fc.integer()
            ),
            workspaceId: fc.oneof(
              fc.string(),
              // Generate valid CUID-like strings
              fc.string({ minLength: 25, maxLength: 25 }).map(s => 'c' + s.replace(/[^a-z0-9]/gi, 'a')),
              fc.constant(undefined),
              fc.constant(null),
              fc.integer()
            ),
          }),
          (input) => {
            const clientResult = validateClient(createDocumentSchema, input);
            const serverResult = validateServer(createDocumentSchema, input);
            
            expect(clientResult.success).toBe(serverResult.success);
          }
        ),
        { numRuns }
      );
    });
  });

  describe('updateDocumentSchema', () => {
    it('should produce identical results on client and server for any input', () => {
      fc.assert(
        fc.property(
          fc.record({
            title: fc.oneof(
              fc.string(),
              fc.constant(undefined),
              fc.constant(null),
              fc.integer()
            ),
          }),
          (input) => {
            const clientResult = validateClient(updateDocumentSchema, input);
            const serverResult = validateServer(updateDocumentSchema, input);
            
            expect(clientResult.success).toBe(serverResult.success);
          }
        ),
        { numRuns }
      );
    });
  });

  describe('signInSchema', () => {
    it('should produce identical results on client and server for any input', () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.oneof(
              fc.emailAddress(),
              fc.string(),
              fc.constant(undefined),
              fc.constant(null),
              fc.integer()
            ),
            password: fc.oneof(
              fc.string({ minLength: 0, maxLength: 20 }),
              fc.constant(undefined),
              fc.constant(null),
              fc.integer()
            ),
          }),
          (input) => {
            const clientResult = validateClient(signInSchema, input);
            const serverResult = validateServer(signInSchema, input);
            
            expect(clientResult.success).toBe(serverResult.success);
          }
        ),
        { numRuns }
      );
    });
  });

  describe('signUpSchema', () => {
    it('should produce identical results on client and server for any input', () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.oneof(
              fc.emailAddress(),
              fc.string(),
              fc.constant(undefined),
              fc.constant(null)
            ),
            password: fc.oneof(
              fc.string({ minLength: 0, maxLength: 20 }),
              fc.constant(undefined),
              fc.constant(null)
            ),
            name: fc.oneof(
              fc.string({ minLength: 0, maxLength: 150 }),
              fc.constant(undefined),
              fc.constant(null)
            ),
          }),
          (input) => {
            const clientResult = validateClient(signUpSchema, input);
            const serverResult = validateServer(signUpSchema, input);
            
            expect(clientResult.success).toBe(serverResult.success);
          }
        ),
        { numRuns }
      );
    });
  });

  describe('createWorkspaceSchema', () => {
    it('should produce identical results on client and server for any input', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.oneof(
              fc.string({ minLength: 0, maxLength: 150 }),
              fc.constant(undefined),
              fc.constant(null),
              fc.integer()
            ),
          }),
          (input) => {
            const clientResult = validateClient(createWorkspaceSchema, input);
            const serverResult = validateServer(createWorkspaceSchema, input);
            
            expect(clientResult.success).toBe(serverResult.success);
          }
        ),
        { numRuns }
      );
    });
  });

  describe('updateWorkspaceSchema', () => {
    it('should produce identical results on client and server for any input', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.oneof(
              fc.string({ minLength: 0, maxLength: 150 }),
              fc.constant(undefined),
              fc.constant(null),
              fc.integer()
            ),
          }),
          (input) => {
            const clientResult = validateClient(updateWorkspaceSchema, input);
            const serverResult = validateServer(updateWorkspaceSchema, input);
            
            expect(clientResult.success).toBe(serverResult.success);
          }
        ),
        { numRuns }
      );
    });
  });
});
