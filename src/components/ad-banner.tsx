import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface PromoAd {
  id: string
  tag: string
  title: string
  subtitle: string
  price: string
  imageUrl: string
  productId?: string
  bgGradient: string
}

const defaultAds: PromoAd[] = [
  {
    id: 'ad-sundae',
    tag: 'LIMITED TIME',
    title: 'Cookies & Cream Sundae',
    subtitle: 'Rich creamy swirl with crunchy chocolate crumble',
    price: '₱79.00',
    imageUrl: '/menu/dessert.png',
    productId: '8',
    bgGradient: 'linear-gradient(135deg, #9a3412 0%, #c2410c 50%, #ea580c 100%)',
  },
  {
    id: 'ad-combo',
    tag: 'POPULAR VALUE',
    title: 'Burger Menu Combo Deal',
    subtitle: 'Hearty burger, golden fries, and ice-cold drink',
    price: '₱259.00',
    imageUrl: '/menu/burger-bundle.png',
    productId: '1',
    bgGradient: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #f97316 100%)',
  },
  {
    id: 'ad-chicken',
    tag: 'CHEF FAVORITE',
    title: 'Crispy Chicken Meal Plate',
    subtitle: 'Golden fried chicken with seasoned garlic rice & gravy',
    price: '₱249.00',
    imageUrl: '/menu/chicken-rice.png',
    productId: '2',
    bgGradient: 'linear-gradient(135deg, #854d0e 0%, #c2410c 50%, #ea580c 100%)',
  },
]

export function AdBanner({ ads = defaultAds }: { ads?: PromoAd[] }) {
  const [current, setCurrent] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (ads.length <= 1) return
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % ads.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [ads.length])

  const ad = ads[current]
  if (!ad) return null

  const handleClick = () => {
    if (ad.productId) {
      navigate('/products/' + ad.productId)
    }
  }

  return (
    <header className="kiosk-ad-header" style={{ background: ad.bgGradient }} onClick={handleClick} role="banner">
      <div className="kiosk-ad-header__badge">
        <span>{ad.tag}</span>
      </div>
      <div className="kiosk-ad-header__content">
        <h2>{ad.title}</h2>
        <p>{ad.subtitle}</p>
        <div className="kiosk-ad-header__action">
          <span className="kiosk-ad-header__price">{ad.price}</span>
          <span className="kiosk-ad-header__tap">Tap to Order &rarr;</span>
        </div>
      </div>
      <div className="kiosk-ad-header__visual">
        <img src={ad.imageUrl} alt={ad.title} />
      </div>
      <div className="kiosk-ad-header__dots" onClick={(e) => e.stopPropagation()}>
        {ads.map((item, idx) => (
          <button
            key={item.id}
            className={`kiosk-ad-header__dot ${idx === current ? 'active' : ''}`}
            onClick={() => setCurrent(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </header>
  )
}
