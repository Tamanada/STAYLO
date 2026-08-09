// ============================================================================
// Types shared by every source parser (booking-com, expedia, agoda, airbnb).
// ============================================================================

// Subset of Postmark's inbound webhook payload we actually use.
// Full spec: https://postmarkapp.com/developer/webhooks/inbound-webhook
export interface PostmarkInboundPayload {
  MessageID?: string
  From?: string
  FromName?: string
  To?: string                      // full recipient (may include sub-address)
  OriginalRecipient?: string       // pre-forward recipient (fallback)
  Subject?: string
  TextBody?: string
  HtmlBody?: string
  StrippedTextReply?: string
  Date?: string
  Headers?: Array<{ Name: string; Value: string }>
  Attachments?: unknown[]
}

// What a parser must return. Fields that couldn't be extracted are undefined.
// The handler checks for the minimum viable set (guest_name + check_in + check_out).
export interface ParsedBooking {
  source: 'booking_com' | 'expedia' | 'agoda' | 'airbnb'

  // Identity (guest_name is required; the rest are best-effort)
  guest_name: string
  guest_email?: string
  guest_phone?: string
  guest_country?: string           // ISO 3166-1 alpha-2

  // Stay dates — ISO YYYY-MM-DD
  check_in: string
  check_out: string

  // Room + party
  room_type?: string
  guests_count?: number            // adults + children

  // Money
  total_price?: number
  currency?: string                // ISO 4217
  commission_amount?: number       // OTA cut (informational)

  // OTA tracking
  external_id?: string             // booking number

  // State
  status?: 'confirmed' | 'modified' | 'cancelled' | 'no_show'

  // Anything else the parser wants to keep for debug (surfaces in ship_bookings.raw_data)
  raw?: Record<string, unknown>
}
