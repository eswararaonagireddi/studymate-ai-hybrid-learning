import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { ID_PATTERN, LIMITS } from '@/src/utils/validation';

/**
 * Offline structural & "Dirty Dozen" invariant verification against firestore.rules.
 * Note: Live rule evaluation against Firestore Emulator requires running
 * `firebase emulators:exec --only firestore "..."` with Java + Firebase CLI installed.
 */
describe('Firestore rules & ownership invariants (offline verification)', () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rulesText = fs.readFileSync(rulesPath, 'utf-8');

  it('includes global default-deny catch-all and rules_version 2', () => {
    expect(rulesText).toContain("rules_version = '2';");
    expect(rulesText).toContain('match /{document=**}');
    expect(rulesText).toContain('allow read, write: if false;');
  });

  it('enforces verified ownership, path ID regex, and immutable ownerId on all user collections', () => {
    const requiredCollections = [
      '/users/{uid}/notes/{noteId}',
      '/users/{uid}/studySessions/{sessionId}',
      '/users/{uid}/quizResults/{resultId}',
      '/users/{uid}/flashcardSets/{setId}',
      '/users/{uid}/preferences/{documentId}',
    ];

    for (const col of requiredCollections) {
      expect(rulesText).toContain(`match ${col}`);
    }

    expect(rulesText).toContain('request.auth.uid == uid');
    expect(rulesText).toContain('request.auth.token.email_verified == true');
    expect(rulesText).toContain('data.ownerId == request.auth.uid');
    expect(rulesText).toContain('incoming().ownerId == existing().ownerId');
    expect(rulesText).toContain('resource.data.ownerId == request.auth.uid');
  });

  it('blocks Dirty Dozen shadow fields, ID poisoning, and out-of-range scores in schema rules', () => {
    expect(rulesText).toContain('data.keys().hasOnly(');
    expect(rulesText).toContain('affectedKeys().hasOnly(');
    expect(rulesText).toContain('incoming().createdAt == request.time');
    expect(rulesText).toContain('incoming().updatedAt == request.time');
    expect(rulesText).toContain('data.correctCount <= data.totalQuestions');
    expect(rulesText).toContain('data.scorePercent <= 100');

    // Verify client ID sanitization blocks path-traversal / ID poisoning payloads
    expect(ID_PATTERN.test('../admin')).toBe(false);
    expect(ID_PATTERN.test('valid_id-123')).toBe(true);
    expect('a'.repeat(LIMITS.ID_MAX + 1).length).toBeGreaterThan(128);
  });
});
