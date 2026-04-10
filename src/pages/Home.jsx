import { Hero } from '../components/sections/Hero'
import { BreakFree } from '../components/sections/BreakFree'
import { CommissionCalculator } from '../components/sections/CommissionCalculator'
import { HowItWorks } from '../components/sections/HowItWorks'
import { FoundingMembers } from '../components/sections/FoundingMembers'
import { CTASection } from '../components/sections/CTASection'
import { SloganTicker } from '../components/sections/SloganTicker'
import { getFeatureFlags } from './admin/AdminSettings'

export default function Home() {
  const flags = getFeatureFlags()

  return (
    <>
      <Hero />
      <SloganTicker />
      <BreakFree />
      <CommissionCalculator />
      <HowItWorks />
      {flags.socialProof && <FoundingMembers />}
      <CTASection />
    </>
  )
}
