import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import WeeklyReview from '../WeeklyReview';
import { I18nProvider } from '../../../core/i18n/I18nProvider';

const mockSaveWeeklyReview = vi.fn((userId, weekKey, data) => Promise.resolve(data));
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
  getFirestore: vi.fn(() => ({})),
  doc: (...args) => mockDoc(...args),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: () => mockServerTimestamp(),
  Timestamp: {
    fromDate: (value) => mockTimestampFromDate(value),
  },
}));

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'user-1' } }),
}));

vi.mock('../../../core/hooks/useWeeklyReviewData', () => ({
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

vi.mock('../../../core/services/firebaseDb', () => ({
  db: {},
}));

vi.mock('../../../core/services/weeklyReviewService', () => ({
  saveWeeklyReview: (...args) => mockSaveWeeklyReview(...args),
  setWeeklyReviewCache: (...args) => mockSetWeeklyReviewCache(...args),
}));

vi.mock('../../../core/services/reportsService', () => ({
  invalidateReportsCache: (...args) => mockInvalidateReportsCache(...args),
}));

vi.mock('../../../core/services/aiCoachService', () => ({
  invalidateAICoachCache: (...args) => mockInvalidateAICoachCache(...args),
}));

vi.mock('../../../core/services/cacheCoordinator', () => ({
  invalidateAfterWeeklyReviewWrite: (userId) => {
    mockInvalidateReportsCache(userId);
    mockInvalidateAICoachCache(userId);
  },
}));

function renderWeeklyReview() {
  return render(
    <I18nProvider locale="vi">
      <WeeklyReview />
    </I18nProvider>
  );
}

describe('WeeklyReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves trimmed notes and updates local caches', async () => {
    const user = userEvent.setup();
    renderWeeklyReview();

    // Step 0 → Step 1
    await user.click(screen.getByRole('button', { name: /Tiếp theo — Nhìn lại/i }));

    // Step 1: type lesson
    await user.type(screen.getByLabelText('Bài học tuần này'), '  Cut delivery by half  ');

    // Step 1 → Step 2
    await user.click(screen.getByRole('button', { name: /Tiếp — Cam kết/i }));

    // Step 2: type action
    await user.type(screen.getByLabelText('Cam kết tuần tới'), '  Transfer surplus on Monday  ');

    // Save
    await user.click(screen.getByRole('button', { name: /Hoàn thành review/i }));

    await waitFor(() => {
      expect(mockSaveWeeklyReview).toHaveBeenCalledTimes(1);
    });

    const [savedUserId, savedWeekKey, savedPayload] = mockSaveWeeklyReview.mock.calls[0];
    expect(savedUserId).toBe('user-1');
    expect(savedWeekKey).toBe('2026-06-08');
    expect(savedPayload.oneLesson).toBe('Cut delivery by half');
    expect(savedPayload.oneActionNextWeek).toBe('Transfer surplus on Monday');
    expect(savedPayload.weekStart).toEqual({ value: weeklyData.weekMeta.weekStart });
    expect(savedPayload.weekEnd).toEqual({ value: weeklyData.weekMeta.weekEnd });

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
    expect(screen.getByText('Review tuần xong!')).toBeInTheDocument();
  });
});
