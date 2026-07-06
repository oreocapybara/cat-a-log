import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock dependencies before importing the component
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockSignInWithPassword = vi.fn()
const mockGetUser = vi.fn()
const mockSelectSingle = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      getUser: mockGetUser,
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockSelectSingle,
        }),
      }),
    }),
  }),
}))

vi.mock('@/lib/toast', () => ({
  notify: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/lib/use-return-to', () => ({
  useReturnTo: () => null,
}))

vi.mock('@/app/components/google-button', () => ({
  GoogleButton: ({ label }: { label: string }) => <button type="button">{label}</button>,
}))

import LoginPage from '@/app/(auth)/login/page'

describe('LoginPage', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the login form with email and password fields', () => {
    render(<LoginPage />)

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Let me in' })).toBeInTheDocument()
  })

  it('renders the Google sign-in button', () => {
    render(<LoginPage />)

    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument()
  })

  it('renders link to register page', () => {
    render(<LoginPage />)

    expect(screen.getByRole('link', { name: 'Join the community' })).toHaveAttribute(
      'href',
      '/register'
    )
  })

  it('shows validation error for invalid email', async () => {
    render(<LoginPage />)

    // Submit with only password filled - email is empty
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Let me in' }))

    await waitFor(() => {
      expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    })
  })

  it('shows validation error for short password', async () => {
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), '12345')
    await user.click(screen.getByRole('button', { name: 'Let me in' }))

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument()
    })
  })

  it('does not submit with empty fields', async () => {
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: 'Let me in' }))

    await waitFor(() => {
      expect(mockSignInWithPassword).not.toHaveBeenCalled()
    })
  })

  it('calls signInWithPassword on valid submission', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({ data: { user: { id: '123' } } })
    mockSelectSingle.mockResolvedValue({ data: { id: '123' } })

    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Let me in' }))

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'secret123',
      })
    })
  })

  it('redirects to /map when profile exists', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({ data: { user: { id: '123' } } })
    mockSelectSingle.mockResolvedValue({ data: { id: '123' } })

    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Let me in' }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/map')
    })
  })

  it('redirects to /setup-profile when no profile exists', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({ data: { user: { id: '123' } } })
    mockSelectSingle.mockResolvedValue({ data: null })

    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Let me in' }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/setup-profile')
    })
  })

  it('shows error toast on auth failure', async () => {
    const { notify } = await import('@/lib/toast')
    mockSignInWithPassword.mockResolvedValue({ error: new Error('Invalid credentials') })

    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Let me in' }))

    await waitFor(() => {
      expect(notify.error).toHaveBeenCalledWith('unknown-error')
    })
  })

  it('toggles password visibility', async () => {
    render(<LoginPage />)

    const passwordInput = screen.getByLabelText('Password')
    expect(passwordInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByLabelText('Show password'))
    expect(passwordInput).toHaveAttribute('type', 'text')

    await user.click(screen.getByLabelText('Hide password'))
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('disables submit button while loading', async () => {
    // Make signIn hang so we can check the loading state
    mockSignInWithPassword.mockReturnValue(new Promise(() => {}))

    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Let me in' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled()
    })
  })
})
