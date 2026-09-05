import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WelcomeScreen } from './welcome'
import { useKioskStore, defaultSettings } from '../store/kiosk-store'

describe('WelcomeScreen', () => {
  beforeEach(() => {
    useKioskStore.getState().reset()
  })

  it('renders default welcome screen without background image', () => {
    useKioskStore.getState().setSettings({ ...defaultSettings, welcome_background_url: null })
    const { container } = render(
      <MemoryRouter>
        <WelcomeScreen />
      </MemoryRouter>
    )

    expect(screen.getByText(/Start your order/i)).toBeInTheDocument()
    const main = container.querySelector('main')
    expect(main).not.toHaveClass('welcome--custom-bg')
  })

  it('renders background image when welcome_background_url is set', () => {
    useKioskStore.getState().setSettings({
      ...defaultSettings,
      welcome_background_url: '/storage/backgrounds/custom-bg.jpg',
    })
    const { container } = render(
      <MemoryRouter>
        <WelcomeScreen />
      </MemoryRouter>
    )

    const main = container.querySelector('main')
    expect(main).toHaveClass('welcome--custom-bg')
    expect(main).toHaveStyle({ backgroundImage: 'url("/storage/backgrounds/custom-bg.jpg")' })
  })
})
