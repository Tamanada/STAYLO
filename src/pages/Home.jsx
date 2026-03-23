import { Hero } from '../components/sections/Hero'
import { BreakFree } from '../components/sections/BreakFree'
import { CommissionCalculator } from '../components/sections/CommissionCalculator'
import { HowItWorks } from '../components/sections/HowItWorks'
import { FoundingMembers } from '../components/sections/FoundingMembers'
import { CTASection } from '../components/sections/CTASection'
import { SloganTicker } from '../components/sections/SloganTicker'
import { SketchDecorations } from '../components/ui/SketchDecorations'

export default function Home() {
  return (
    <>
      <Hero />
      <SloganTicker />
      <div className="relative">
        <SketchDecorations lightMode />
        <BreakFree />
        <CommissionCalculator />
        <HowItWorks />
      </div>
      <FoundingMembers />
      <CTASection />
    </>
  )
}
