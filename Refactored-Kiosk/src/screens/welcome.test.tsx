import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WelcomeScreen } from './welcome'
import { useKioskStore, defaultSettings } from '../store/kiosk-store'

describe('WelcomeScreen', () => {
  beforeEach(() => {
    useKioskStore.getState().reset()
  })

  it('renders default welcome screen without background image', () => {
    useKioskStore.getState().setSettings({ ...defaultSettings, welcome_background_image: null })
    const { container } = render(
      <MemoryRouter>
        <WelcomeScreen />
      </MemoryRouter>
    )

    expect(screen.getByText(/Start your order/i)).toBeInTheDocument()
    const main = container.querySelector('main')
    expect(main).not.toHaveClass('welcome--has-bg')
    expect(container.querySelector('.welcome__backdrop')).not.toBeInTheDocument()
  })

  it('renders background image and backdrop when welcome_background_image is set', () => {
    useKioskStore.getState().setSettings({
      ...defaultSettings,
      welcome_background_image: '/storage/backgrounds/custom-bg.jpg',
    })
    const { container } = render(
      <MemoryRouter>
        <WelcomeScreen />
      </MemoryRouter>
    )

    const main = container.querySelector('main')
    expect(main).toHaveClass('welcome--has-bg')
    expect(main).toHaveStyle({ backgroundImage: 'url(/storage/backgrounds/custom-bg.jpg)' })
    expect(container.querySelector('.welcome__backdrop')).toBeInTheDocument()
  })
})
