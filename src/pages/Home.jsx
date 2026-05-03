import { Hero } from '../components/sections/Hero'
import { ValueProps } from '../components/sections/ValueProps'
import { HotelGrid } from '../components/sections/HotelGrid'
import { HowItWorks } from '../components/sections/HowItWorks'
import { CompareTable } from '../components/sections/CompareTable'
import { CTASection } from '../components/sections/CTASection'
import { Testimonials } from '../components/sections/Testimonials'
import SEO from '../components/SEO'

export default function Home() {
  return (
    <>
      <SEO
        title="STAYLO Hotels — Hotelier-owned booking platform · 10% commission for life"
        description="STAYLO is the booking platform owned by hoteliers. Pay 10% commission instead of Booking.com's 22% — locked for life. Free to join. Launching in Koh Phangan, Thailand."
        path="/"
      />
      <Hero />
      <ValueProps />
      <HotelGrid />
      <HowItWorks />
      <CompareTable />
      <CTASection />
      <Testimonials />
    </>
  )
}
