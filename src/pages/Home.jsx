import { Hero } from '../components/sections/Hero'
import { BreakFree } from '../components/sections/BreakFree'
import { CommissionCalculator } from '../components/sections/CommissionCalculator'
import { HowItWorks } from '../components/sections/HowItWorks'
import { FoundingMembers } from '../components/sections/FoundingMembers'
import { CTASection } from '../components/sections/CTASection'

export default function Home() {
  return (
    <>
      <Hero />
      <BreakFree />
      <CommissionCalculator />
      <HowItWorks />
      <FoundingMembers />
      <CTASection />
    </>
  )
}
