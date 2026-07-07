import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockSignUp = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
    },
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

import RegisterPage from '@/app/(auth)/register/page'

describe('RegisterPage', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the registration form', () => {
    render(<RegisterPage />)

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start cataloging' })).toBeInTheDocument()
  })

  it('renders Google sign-up button', () => {
    render(<RegisterPage />)

    expect(screen.getByRole('button', { name: 'Sign up with Google' })).toBeInTheDocument()
  })

  it('renders link to login page', () => {
    render(<RegisterPage />)

    expect(screen.getByRole('link', { name: 'Welcome back' })).toHaveAttribute('href', '/login')
  })

  it('shows validation error for invalid email', async () => {
    render(<RegisterPage />)

    // Submit with empty email to trigger Zod validation
    await user.type(screen.getByLabelText('Password'), 'Secure1pass')
    await user.type(screen.getByLabelText('Confirm password'), 'Secure1pass')
    await user.click(screen.getByRole('button', { name: 'Start cataloging' }))

    await waitFor(() => {
      expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    })
  })

  it('shows password requirements as user types', async () => {
    render(<RegisterPage />)

    await user.type(screen.getByLabelText('Password'), 'abc')

    await waitFor(() => {
      expect(screen.getByText('8+ characters')).toBeInTheDocument()
      expect(screen.getByText('One uppercase letter')).toBeInTheDocument()
      expect(screen.getByText('One number')).toBeInTheDocument()
    })
  })

  it('shows mismatch error when passwords differ', async () => {
    render(<RegisterPage />)

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'Secure1pass')
    await user.type(screen.getByLabelText('Confirm password'), 'Different1pass')
    await user.click(screen.getByRole('button', { name: 'Start cataloging' }))

    await waitFor(() => {
      expect(screen.getByText("Passwords don't match")).toBeInTheDocument()
    })
  })

  it('does not submit with empty fields', async () => {
    render(<RegisterPage />)

    await user.click(screen.getByRole('button', { name: 'Start cataloging' }))

    await waitFor(() => {
      expect(mockSignUp).not.toHaveBeenCalled()
    })
  })

  it('calls signUp on valid submission', async () => {
    mockSignUp.mockResolvedValue({ error: null })

    render(<RegisterPage />)

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'Secure1pass')
    await user.type(screen.getByLabelText('Confirm password'), 'Secure1pass')
    await user.click(screen.getByRole('button', { name: 'Start cataloging' }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'Secure1pass',
      })
    })
  })

  it('redirects to /setup-profile on success', async () => {
    mockSignUp.mockResolvedValue({ error: null })

    render(<RegisterPage />)

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'Secure1pass')
    await user.type(screen.getByLabelText('Confirm password'), 'Secure1pass')
    await user.click(screen.getByRole('button', { name: 'Start cataloging' }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/setup-profile')
    })
  })

  it('shows success toast on registration', async () => {
    const { notify } = await import('@/lib/toast')
    mockSignUp.mockResolvedValue({ error: null })

    render(<RegisterPage />)

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'Secure1pass')
    await user.type(screen.getByLabelText('Confirm password'), 'Secure1pass')
    await user.click(screen.getByRole('button', { name: 'Start cataloging' }))

    await waitFor(() => {
      expect(notify.success).toHaveBeenCalledWith('registered')
    })
  })

  it('shows error toast on auth failure', async () => {
    const { notify } = await import('@/lib/toast')
    mockSignUp.mockResolvedValue({ error: new Error('Signup failed') })

    render(<RegisterPage />)

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'Secure1pass')
    await user.type(screen.getByLabelText('Confirm password'), 'Secure1pass')
    await user.click(screen.getByRole('button', { name: 'Start cataloging' }))

    await waitFor(() => {
      expect(notify.error).toHaveBeenCalledWith('unknown-error')
    })
  })

  it('toggles password visibility', async () => {
    render(<RegisterPage />)

    const passwordInput = screen.getByLabelText('Password')
    expect(passwordInput).toHaveAttribute('type', 'password')

    // There are two toggle buttons - get the first one (password field)
    const toggleButtons = screen.getAllByLabelText('Show password')
    await user.click(toggleButtons[0])
    expect(passwordInput).toHaveAttribute('type', 'text')
  })

  it('disables submit button while loading', async () => {
    mockSignUp.mockReturnValue(new Promise(() => {}))

    render(<RegisterPage />)

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'Secure1pass')
    await user.type(screen.getByLabelText('Confirm password'), 'Secure1pass')
    await user.click(screen.getByRole('button', { name: 'Start cataloging' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Setting things up…' })).toBeDisabled()
    })
  })
})
