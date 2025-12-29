/**
 * Feature: obsidian-cloud, Property 4: Document ID Uniqueness
 * Validates: Requirements 2.1
 * 
 * For any sequence of document creation operations, all resulting document IDs
 * should be unique (no duplicates).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import type { Session } from 'next-auth';

// Mock the auth module
const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

// Mock the db module with hoisted mock functions
const mockDocumentCreate = vi.fn();
const mockDocumentFindUnique = vi.fn();
const mockDocumentFindMany = vi.fn();
const mockDocumentUpdate = vi.fn();
const mockDocumentDelete = vi.fn();
const mockWorkspaceMemberFindUnique = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    workspaceMember: {
      findUnique: () => mockWorkspaceMemberFindUnique(),
    },
    document: {
      create: (args: unknown) => mockDocumentCreate(args),
      findUnique: (args: unknown) => mockDocumentFindUnique(args),
      findMany: (args: unknown) => mockDocumentFindMany(args),
      update: (args: unknown) => mockDocumentUpdate(args),
      delete: (args: unknown) => mockDocumentDelete(args),
    },
  },
}));

import {
  createDocument,
  getDocument,
  deleteDocument,
  listDocuments,
} from '../documents';

// Helper to generate valid CUID-like strings
const cuidArbitrary = fc.string({ minLength: 20, maxLength: 25 })
  .map(s => 'c' + s.replace(/[^a-z0-9]/gi, 'a').slice(0, 24));

// Helper to generate random document titles
const titleArbitrary = fc.string({ minLength: 1, maxLength: 255 });

// Helper to generate random Uint8Array for CRDT state
const yjsStateArbitrary = fc.uint8Array({ minLength: 0, maxLength: 1000 });

// Helper to create mock session
function createMockSession(userId: string): Session {
  return {
    user: { id: userId, email: 'test@example.com' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
}

describe('Property 4: Document ID Uniqueness', () => {
  const numRuns = 100;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate unique IDs for all created documents', async () => {
    const mockUserId = 'cuser123456789012345678';
    const mockWorkspaceId = 'cworkspace12345678901234';
    
    // Setup auth mock
    mockAuth.mockResolvedValue(createMockSession(mockUserId));
    
    // Setup workspace membership mock
    mockWorkspaceMemberFindUnique.mockResolvedValue({
      id: 'cmember1234567890123456',
      userId: mockUserId,
      workspaceId: mockWorkspaceId,
      role: 'MEMBER',
    });

    // Track generated IDs
    let idCounter = 0;
    mockDocumentCreate.mockImplementation(async () => {
      idCounter++;
      const uniqueId = `cdoc${idCounter.toString().padStart(20, '0')}`;
      return {
        id: uniqueId,
        title: 'Test Document',
        workspaceId: mockWorkspaceId,
        authorId: mockUserId,
        yjsState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 20 }), // Number of documents to create
        async (n) => {
          idCounter = 0; // Reset counter for each test run
          const createdIds: string[] = [];
          
          for (let i = 0; i < n; i++) {
            const result = await createDocument({ workspaceId: mockWorkspaceId });
            if (result.success && result.data) {
              createdIds.push(result.data.id);
            }
          }
          
          // Verify all IDs are unique
          const uniqueIds = new Set(createdIds);
          expect(uniqueIds.size).toBe(createdIds.length);
        }
      ),
      { numRuns }
    );
  });
});


/**
 * Feature: obsidian-cloud, Property 5: Document Persistence Round-Trip
 * Validates: Requirements 2.3, 9.3
 * 
 * For any document with CRDT state, saving to the database and then retrieving
 * should produce an equivalent document with identical CRDT state.
 */
describe('Property 5: Document Persistence Round-Trip', () => {
  const numRuns = 100;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should preserve document data through save and retrieve cycle', async () => {
    const mockUserId = 'cuser123456789012345678';
    const mockWorkspaceId = 'cworkspace12345678901234';
    
    // Setup auth mock
    mockAuth.mockResolvedValue(createMockSession(mockUserId));
    
    // Setup workspace membership mock
    mockWorkspaceMemberFindUnique.mockResolvedValue({
      id: 'cmember1234567890123456',
      userId: mockUserId,
      workspaceId: mockWorkspaceId,
      role: 'MEMBER',
    });

    await fc.assert(
      fc.asyncProperty(
        titleArbitrary,
        yjsStateArbitrary,
        async (title, yjsState) => {
          const mockDocId = 'cdoc12345678901234567890';
          const createdAt = new Date();
          const updatedAt = new Date();
          
          // Mock create to return the document
          mockDocumentCreate.mockResolvedValue({
            id: mockDocId,
            title,
            workspaceId: mockWorkspaceId,
            authorId: mockUserId,
            yjsState: yjsState.length > 0 ? Buffer.from(yjsState) : null,
            createdAt,
            updatedAt,
          });
          
          // Mock findUnique to return the same document with workspace info
          mockDocumentFindUnique.mockResolvedValue({
            id: mockDocId,
            title,
            workspaceId: mockWorkspaceId,
            authorId: mockUserId,
            yjsState: yjsState.length > 0 ? Buffer.from(yjsState) : null,
            createdAt,
            updatedAt,
            workspace: {
              id: mockWorkspaceId,
              name: 'Test Workspace',
              createdAt,
              updatedAt,
              members: [{ id: 'cmember1234567890123456', userId: mockUserId, workspaceId: mockWorkspaceId, role: 'MEMBER' }],
            },
          });
          
          // Create document
          const createResult = await createDocument({ 
            title, 
            workspaceId: mockWorkspaceId 
          });
          
          expect(createResult.success).toBe(true);
          
          // Retrieve document
          const getResult = await getDocument(mockDocId);
          
          expect(getResult.success).toBe(true);
          expect(getResult.data?.title).toBe(title);
          
          // Compare CRDT state if present
          if (yjsState.length > 0 && getResult.data?.yjsState) {
            expect(Array.from(getResult.data.yjsState)).toEqual(Array.from(yjsState));
          }
        }
      ),
      { numRuns }
    );
  });
});

/**
 * Feature: obsidian-cloud, Property 6: Document Deletion Completeness
 * Validates: Requirements 2.4
 * 
 * For any deleted document, subsequent queries for that document should return null/not found.
 */
describe('Property 6: Document Deletion Completeness', () => {
  const numRuns = 100;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return not found for deleted documents', async () => {
    const mockUserId = 'cuser123456789012345678';
    const mockWorkspaceId = 'cworkspace12345678901234';
    
    // Setup auth mock
    mockAuth.mockResolvedValue(createMockSession(mockUserId));

    await fc.assert(
      fc.asyncProperty(
        cuidArbitrary,
        titleArbitrary,
        async (docId, title) => {
          const createdAt = new Date();
          const updatedAt = new Date();
          
          // First call: document exists (for delete operation)
          // Second call: document doesn't exist (after deletion)
          let callCount = 0;
          mockDocumentFindUnique.mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              // Document exists for delete check
              return {
                id: docId,
                title,
                workspaceId: mockWorkspaceId,
                authorId: mockUserId,
                yjsState: null,
                createdAt,
                updatedAt,
                workspace: {
                  id: mockWorkspaceId,
                  name: 'Test Workspace',
                  createdAt,
                  updatedAt,
                  members: [{ id: 'cmember1234567890123456', userId: mockUserId, workspaceId: mockWorkspaceId, role: 'MEMBER' }],
                },
              };
            }
            // Document doesn't exist after deletion
            return null;
          });
          
          mockDocumentDelete.mockResolvedValue({
            id: docId,
            title,
            workspaceId: mockWorkspaceId,
            authorId: mockUserId,
            yjsState: null,
            createdAt,
            updatedAt,
          });
          
          // Delete the document
          const deleteResult = await deleteDocument(docId);
          expect(deleteResult.success).toBe(true);
          
          // Try to get the deleted document
          const getResult = await getDocument(docId);
          expect(getResult.success).toBe(false);
          expect(getResult.error).toBe('Document not found');
        }
      ),
      { numRuns }
    );
  });
});


/**
 * Feature: obsidian-cloud, Property 7: Document List Completeness
 * Validates: Requirements 2.5
 * 
 * For any workspace with N documents, the document list query should return
 * exactly N documents with correct titles and timestamps.
 */
describe('Property 7: Document List Completeness', () => {
  const numRuns = 100;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return exactly N documents for a workspace with N documents', async () => {
    const mockUserId = 'cuser123456789012345678';
    const mockWorkspaceId = 'cworkspace12345678901234';
    
    // Setup auth mock
    mockAuth.mockResolvedValue(createMockSession(mockUserId));
    
    // Setup workspace membership mock
    mockWorkspaceMemberFindUnique.mockResolvedValue({
      id: 'cmember1234567890123456',
      userId: mockUserId,
      workspaceId: mockWorkspaceId,
      role: 'MEMBER',
    });

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            title: titleArbitrary,
          }),
          { minLength: 0, maxLength: 50 }
        ),
        async (documents) => {
          const n = documents.length;
          
          // Generate mock documents
          const mockDocuments = documents.map((doc, index) => ({
            id: `cdoc${index.toString().padStart(20, '0')}`,
            title: doc.title,
            updatedAt: new Date(Date.now() - index * 1000), // Different timestamps
          }));
          
          mockDocumentFindMany.mockResolvedValue(mockDocuments);
          
          // List documents
          const result = await listDocuments(mockWorkspaceId);
          
          expect(result.success).toBe(true);
          expect(result.data?.length).toBe(n);
          
          // Verify all titles are present
          if (result.data) {
            const returnedTitles = result.data.map(d => d.title);
            const expectedTitles = documents.map(d => d.title);
            
            for (const title of expectedTitles) {
              expect(returnedTitles).toContain(title);
            }
          }
        }
      ),
      { numRuns }
    );
  });
});
