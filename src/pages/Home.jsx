import { Hero } from '../components/sections/Hero'
import { ValueProps } from '../components/sections/ValueProps'
import { HotelGrid } from '../components/sections/HotelGrid'
import { HowItWorks } from '../components/sections/HowItWorks'
import { CompareTable } from '../components/sections/CompareTable'
import { CTASection } from '../components/sections/CTASection'
import { Testimonials } from '../components/sections/Testimonials'

export default function Home() {
  return (
    <>
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
