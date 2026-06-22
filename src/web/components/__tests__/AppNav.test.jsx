import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AppNav from '../AppNav';
import { I18nProvider } from '../../../core/i18n/I18nProvider';
import dictionary from '../../../core/i18n/dictionaries/vi';

const signOutMock = vi.fn(() => Promise.resolve());

vi.mock('firebase/auth', () => ({
  signOut: (...args) => signOutMock(...args),
}));

vi.mock('../../../core/services/firebaseAuth', () => ({
  auth: { currentUser: { uid: 'user-1' } },
}));

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'user-1', email: 'hatphong@gmail.com' },
  }),
}));

vi.mock('../../../core/hooks/useFeatureAccess', () => ({
  useFeatureAccess: () => ({
    isAdmin: true,
    subscriptionTier: 'premium',
    canAccess: () => true,
  }),
}));

function renderNav(initialPath = '/') {
  return render(
    <I18nProvider locale="vi">
      <MemoryRouter
        initialEntries={[initialPath]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route
            path="*"
            element={(
              <>
                <AppNav />
                <div>Current route</div>
              </>
            )}
          />
          <Route path="/login" element={<div>Login screen</div>} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>
  );
}

describe('AppNav', () => {
  it('shows review sub-navigation when the current route is in the review group', () => {
    const { container } = renderNav('/reports');

    expect(screen.getAllByText(dictionary.nav.groups.review).length).toBeGreaterThan(0);
    expect(container.querySelector('a[href="/reports"]')).not.toBeNull();
    expect(container.querySelector('a[href="/weekly-review"]')).not.toBeNull();
    expect(container.querySelector('a[href="/ai-coach"]')).not.toBeNull();
  });

  it('signs out and navigates to login', async () => {
    const user = userEvent.setup();
    renderNav('/reports');

    await user.click(screen.getAllByRole('button', { name: dictionary.nav.signOut })[0]);

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Login screen')).toBeInTheDocument();
    });
  });
});
