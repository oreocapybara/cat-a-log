import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockGetUser = vi.fn()
const mockSelectSingle = vi.fn()
const mockInsert = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockSelectSingle,
        }),
      }),
      insert: mockInsert,
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

import SetupProfilePage from '@/app/(auth)/setup-profile/page'

describe('SetupProfilePage', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null })
    mockSelectSingle.mockResolvedValue({ data: null }) // username not taken
    mockInsert.mockResolvedValue({ error: null })
  })

  it('renders the profile setup form', () => {
    render(<SetupProfilePage />)

    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Get started' })).toBeInTheDocument()
  })

  it('renders bio field as optional', () => {
    render(<SetupProfilePage />)

    expect(screen.getByText('(optional)')).toBeInTheDocument()
    expect(screen.getByLabelText(/Bio/)).toBeInTheDocument()
  })

  it('shows bio character counter', () => {
    render(<SetupProfilePage />)

    expect(screen.getByText('0/30')).toBeInTheDocument()
  })

  it('updates bio character counter as user types', async () => {
    render(<SetupProfilePage />)

    await user.type(screen.getByLabelText(/Bio/), 'cat lover')

    await waitFor(() => {
      expect(screen.getByText('9/30')).toBeInTheDocument()
    })
  })

  it('shows validation error for short username', async () => {
    render(<SetupProfilePage />)

    const usernameInput = screen.getByLabelText('Username')
    await user.clear(usernameInput)
    await user.type(usernameInput, 'a')
    await user.click(screen.getByRole('button', { name: 'Get started' }))

    await waitFor(() => {
      expect(screen.getByText('Username must be at least 2 characters')).toBeInTheDocument()
    })
  })

  it('shows validation error for username with invalid characters', async () => {
    render(<SetupProfilePage />)

    const usernameInput = screen.getByLabelText('Username')
    await user.clear(usernameInput)
    await user.type(usernameInput, 'cool cat!')
    await user.click(screen.getByRole('button', { name: 'Get started' }))

    await waitFor(() => {
      expect(
        screen.getByText('Username can only contain letters, numbers, underscores, and hyphens')
      ).toBeInTheDocument()
    })
  })

  it('enforces maxLength=30 on bio input (HTML constraint)', () => {
    render(<SetupProfilePage />)

    const bioInput = screen.getByLabelText(/Bio/)
    expect(bioInput).toHaveAttribute('maxlength', '30')
  })

  it('submits profile and redirects to /map on success', async () => {
    const { notify } = await import('@/lib/toast')

    render(<SetupProfilePage />)

    const usernameInput = screen.getByLabelText('Username')
    await user.clear(usernameInput)
    await user.type(usernameInput, 'catwhisperer')
    await user.click(screen.getByRole('button', { name: 'Get started' }))

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith({
        id: 'user-123',
        username: 'catwhisperer',
        bio: '',
      })
    })

    await waitFor(() => {
      expect(notify.success).toHaveBeenCalledWith('welcome', {
        values: { username: 'catwhisperer' },
      })
      expect(mockPush).toHaveBeenCalledWith('/map')
    })
  })

  it('submits with bio when provided', async () => {
    render(<SetupProfilePage />)

    const usernameInput = screen.getByLabelText('Username')
    await user.clear(usernameInput)
    await user.type(usernameInput, 'catfan')
    await user.type(screen.getByLabelText(/Bio/), 'TNR volunteer')
    await user.click(screen.getByRole('button', { name: 'Get started' }))

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith({
        id: 'user-123',
        username: 'catfan',
        bio: 'TNR volunteer',
      })
    })
  })

  it('shows error when username is taken', async () => {
    const { notify } = await import('@/lib/toast')
    mockSelectSingle.mockResolvedValue({ data: { id: 'other-user' } })

    render(<SetupProfilePage />)

    const usernameInput = screen.getByLabelText('Username')
    await user.clear(usernameInput)
    await user.type(usernameInput, 'takenname')
    await user.click(screen.getByRole('button', { name: 'Get started' }))

    await waitFor(() => {
      expect(notify.error).toHaveBeenCalledWith('username-taken')
    })
  })

  it('redirects to login when session is expired', async () => {
    const { notify } = await import('@/lib/toast')
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') })

    render(<SetupProfilePage />)

    const usernameInput = screen.getByLabelText('Username')
    await user.clear(usernameInput)
    await user.type(usernameInput, 'catfan')
    await user.click(screen.getByRole('button', { name: 'Get started' }))

    await waitFor(() => {
      expect(notify.error).toHaveBeenCalledWith('session-expired')
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('shows error toast on insert failure', async () => {
    const { notify } = await import('@/lib/toast')
    mockInsert.mockResolvedValue({ error: new Error('DB error') })

    render(<SetupProfilePage />)

    const usernameInput = screen.getByLabelText('Username')
    await user.clear(usernameInput)
    await user.type(usernameInput, 'catfan')
    await user.click(screen.getByRole('button', { name: 'Get started' }))

    await waitFor(() => {
      expect(notify.error).toHaveBeenCalledWith('unknown-error')
    })
  })

  it('disables submit button while loading', async () => {
    mockGetUser.mockReturnValue(new Promise(() => {}))

    render(<SetupProfilePage />)

    const usernameInput = screen.getByLabelText('Username')
    await user.clear(usernameInput)
    await user.type(usernameInput, 'catfan')
    await user.click(screen.getByRole('button', { name: 'Get started' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
    })
  })
})
