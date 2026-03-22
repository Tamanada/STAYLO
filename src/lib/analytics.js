import { supabase } from './supabase'

export async function trackEvent(eventName, properties = {}) {
  try {
    console.log(`[Analytics] ${eventName}`, properties)
    // In production, send to Supabase or analytics service
    // await supabase.from('analytics_events').insert({ event: eventName, properties })
  } catch (err) {
    console.error('Analytics error:', err)
  }
}

export const EVENTS = {
  PAGE_VIEW: 'page_view',
  SIGNUP: 'signup',
  SURVEY_START: 'survey_start',
  SURVEY_COMPLETE: 'survey_complete',
  PROPERTY_SUBMIT: 'property_submit',
  REFERRAL_CLICK: 'referral_click',
  LINK_PARSE: 'link_parse',
  CTA_CLICK: 'cta_click',
}
