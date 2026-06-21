import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import WeeklyReview from '../WeeklyReview';

const mockSetDoc = vi.fn(() => Promise.resolve());
const mockDoc = vi.fn(() => ({ path: 'users/user-1/weeklyReviews/2026-06-08' }));
const mockServerTimestamp = vi.fn(() => 'SERVER_TIMESTAMP');
const mockTimestampFromDate = vi.fn((value) => ({ value }));
const mockSetWeeklyReviewCache = vi.fn();
const mockInvalidateReportsCache = vi.fn();
const mockInvalidateAICoachCache = vi.fn();
const mockSetData = vi.fn();
const mockSetError = vi.fn();

const weeklyData = {
  weekMeta: {
    weekKey: '2026-06-08',
    weekStart: new Date('2026-06-08T00:00:00.000Z'),
    weekEnd: new Date('2026-06-14T23:59:59.999Z'),
  },
  review: {
    currency: 'VND',
    income: 5000000,
    expense: 1800000,
    latteFactorTotal: 300000,
    savingsRate: 0.64,
    emergencyFundMonths: 3,
    wealthDisciplineScore: 70,
    topLatteCategory: 'Coffee',
  },
  form: {
    oneLesson: '',
    oneActionNextWeek: '',
  },
};

vi.mock('firebase/firestore/lite', () => ({
  doc: (...args) => mockDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
  Timestamp: {
    fromDate: (value) => mockTimestampFromDate(value),
  },
}));

vi.mock('../../auth/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'user-1' } }),
}));

vi.mock('../../hooks/useWeeklyReviewData', () => ({
  useWeeklyReviewData: () => ({
    data: weeklyData,
    setData: mockSetData,
    loading: false,
    refreshing: false,
    error: '',
    setError: mockSetError,
  }),
}));

vi.mock('../../components/AppNav', () => ({
  default: () => <div>Mock Nav</div>,
}));

vi.mock('../../services/firebaseDb', () => ({
  db: {},
}));

vi.mock('../../services/weeklyReviewService', () => ({
  setWeeklyReviewCache: (...args) => mockSetWeeklyReviewCache(...args),
}));

vi.mock('../../services/reportsService', () => ({
  invalidateReportsCache: (...args) => mockInvalidateReportsCache(...args),
}));

vi.mock('../../services/aiCoachService', () => ({
  invalidateAICoachCache: (...args) => mockInvalidateAICoachCache(...args),
}));

describe('WeeklyReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves trimmed notes and updates local caches', async () => {
    const user = userEvent.setup();
    render(<WeeklyReview />);

    await user.type(screen.getByLabelText('One lesson'), '  Cut delivery by half  ');
    await user.type(screen.getByLabelText('One action next week'), '  Transfer surplus on Monday  ');
    await user.click(screen.getByRole('button', { name: 'Save Weekly Review' }));

    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
    });

    const savedPayload = mockSetDoc.mock.calls[0][1];
    expect(savedPayload.oneLesson).toBe('Cut delivery by half');
    expect(savedPayload.oneActionNextWeek).toBe('Transfer surplus on Monday');
    expect(savedPayload.weekStart).toEqual({ value: weeklyData.weekMeta.weekStart });
    expect(savedPayload.weekEnd).toEqual({ value: weeklyData.weekMeta.weekEnd });
    expect(savedPayload.updatedAt).toBe('SERVER_TIMESTAMP');

    expect(mockSetData).toHaveBeenCalledWith(expect.objectContaining({
      form: {
        oneLesson: 'Cut delivery by half',
        oneActionNextWeek: 'Transfer surplus on Monday',
      },
    }));

    expect(mockSetWeeklyReviewCache).toHaveBeenCalledWith(
      'user-1',
      '2026-06-08',
      expect.objectContaining({
        form: {
          oneLesson: 'Cut delivery by half',
          oneActionNextWeek: 'Transfer surplus on Monday',
        },
      })
    );
    expect(mockInvalidateReportsCache).toHaveBeenCalledWith('user-1');
    expect(mockInvalidateAICoachCache).toHaveBeenCalledWith('user-1');
    expect(screen.getByText('Weekly review saved.')).toBeInTheDocument();
  });
});
