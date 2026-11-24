import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InferenceStatusBadge } from '@/src/components/InferenceStatusBadge';
import { HistoryPage } from '@/src/pages/HistoryPage';
import type { StudySessionRecord } from '@/src/types/study';

const mockContextValue = {
  user: null as { uid: string; email: string } | null,
  signInWithGoogle: vi.fn(),
  notes: [],
  sessions: [] as StudySessionRecord[],
  quizResults: [],
  flashcardSets: [],
  removeNote: vi.fn(),
  removeQuizResult: vi.fn(),
  removeFlashcardDeck: vi.fn(),
  removeSession: vi.fn(),
  setRoute: vi.fn(),
};

vi.mock('@/src/context/StudyMateContext', () => ({
  useStudyMate: () => mockContextValue,
}));

describe('InferenceStatusBadge truthful reporting', () => {
  it('renders Local AI only for on_device mode', () => {
    render(
      <InferenceStatusBadge
        executionMode="on_device"
        metadata={{
          executionMode: 'on_device',
          requestedMode: 'prefer_on_device',
          modelId: 'gemini-nano (on-device)',
          fallbackOccurred: false,
          status: 'success',
          latencyMs: 120,
        }}
      />,
    );
    expect(screen.getByText('Local AI')).toBeInTheDocument();
    expect(screen.queryByText('Cloud AI')).not.toBeInTheDocument();
  });

  it('renders Cloud AI and fallback details button when fallbackOccurred is true', () => {
    render(
      <InferenceStatusBadge
        executionMode="in_cloud"
        metadata={{
          executionMode: 'in_cloud',
          requestedMode: 'prefer_on_device',
          modelId: 'gemini-2.5-flash',
          fallbackOccurred: true,
          fallbackReason: 'Chrome Prompt API unavailable',
          status: 'success',
          latencyMs: 640,
        }}
      />,
    );
    expect(screen.getByText('Cloud AI')).toBeInTheDocument();
    expect(screen.getByText('Fallback details')).toBeInTheDocument();
  });

  it('renders Simulated (Dev Demo) label for simulated responses', () => {
    render(
      <InferenceStatusBadge
        executionMode="unavailable"
        metadata={{
          executionMode: 'unavailable',
          requestedMode: 'prefer_on_device',
          fallbackOccurred: false,
          status: 'success',
          isSimulated: true,
          latencyMs: 5,
        }}
      />,
    );
    expect(screen.getByText('Simulated (Dev Demo)')).toBeInTheDocument();
  });

  it('renders Request failed and Local unavailable states distinctly', () => {
    const { rerender } = render(<InferenceStatusBadge executionMode="unavailable" />);
    expect(screen.getByText('Local unavailable')).toBeInTheDocument();

    rerender(<InferenceStatusBadge executionMode="failed" />);
    expect(screen.getByText('Request failed')).toBeInTheDocument();
  });
});

describe('Authentication-dependent History UI', () => {
  it('prompts unauthenticated visitors to sign in before viewing history', () => {
    mockContextValue.user = null;
    render(<HistoryPage />);
    expect(
      screen.getByText('Sign in to view your saved Study History'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
  });

  it('renders owned study sessions when authenticated', () => {
    mockContextValue.user = { uid: 'user_123', email: 'student@university.edu' };
    mockContextValue.sessions = [
      {
        id: 'sess_1',
        ownerId: 'user_123',
        feature: 'assistant',
        subject: 'Computer Science',
        title: 'Binary search trees explanation',
        inferenceSource: 'in_cloud',
        fallbackOccurred: true,
        fallbackReason: 'Browser does not expose Chrome Prompt API',
        createdAt: Date.now(),
      },
    ];
    render(<HistoryPage />);
    expect(screen.getByText('Binary search trees explanation')).toBeInTheDocument();
    expect(screen.getByText('Cloud AI')).toBeInTheDocument();
  });
});
