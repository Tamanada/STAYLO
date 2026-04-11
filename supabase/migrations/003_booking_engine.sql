-- ============================================
-- STAYLO Booking Engine — April 2026
-- Tables: rooms, room_availability, bookings
-- ============================================

-- ============================================
-- 1. ROOMS TABLE
-- ============================================
CREATE TABLE public.rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'standard',
  max_guests INT DEFAULT 2,
  bed_type TEXT DEFAULT 'double',
  base_price DECIMAL(10,2) NOT NULL,
  quantity INT DEFAULT 1,
  amenities TEXT[] DEFAULT '{}',
  photo_urls TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Property owners can manage their own rooms
CREATE POLICY "Owners can manage own rooms" ON public.rooms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = rooms.property_id
      AND properties.user_id = auth.uid()
    )
  );

-- Authenticated users can view active rooms
CREATE POLICY "Authenticated users can view active rooms" ON public.rooms
  FOR SELECT USING (
    auth.role() = 'authenticated' AND is_active = true
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all rooms" ON public.rooms
  FOR ALL USING (public.is_admin());

-- ============================================
-- 2. ROOM AVAILABILITY TABLE
-- ============================================
CREATE TABLE public.room_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available_count INT NOT NULL,
  price_override DECIMAL(10,2),
  is_blocked BOOLEAN DEFAULT false,
  UNIQUE(room_id, date)
);

ALTER TABLE public.room_availability ENABLE ROW LEVEL SECURITY;

-- Property owners can manage availability for their rooms
CREATE POLICY "Owners can manage own room availability" ON public.room_availability
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      JOIN public.properties ON properties.id = rooms.property_id
      WHERE rooms.id = room_availability.room_id
      AND properties.user_id = auth.uid()
    )
  );

-- Authenticated users can view availability
CREATE POLICY "Authenticated users can view availability" ON public.room_availability
  FOR SELECT USING (auth.role() = 'authenticated');

-- Admins can do everything
CREATE POLICY "Admins can manage all availability" ON public.room_availability
  FOR ALL USING (public.is_admin());

-- ============================================
-- 3. BOOKINGS TABLE
-- ============================================
CREATE TABLE public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id),
  room_id UUID NOT NULL REFERENCES public.rooms(id),
  guest_id UUID NOT NULL REFERENCES auth.users(id),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INT DEFAULT 1,
  total_price DECIMAL(10,2) NOT NULL,
  commission DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  stripe_payment_id TEXT,
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Guests can view their own bookings
CREATE POLICY "Guests can view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = guest_id);

-- Guests can create bookings
CREATE POLICY "Guests can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = guest_id);

-- Property owners can view bookings for their properties
CREATE POLICY "Owners can view property bookings" ON public.bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = bookings.property_id
      AND properties.user_id = auth.uid()
    )
  );

-- Property owners can update booking status
CREATE POLICY "Owners can update booking status" ON public.bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = bookings.property_id
      AND properties.user_id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all bookings" ON public.bookings
  FOR ALL USING (public.is_admin());

-- ============================================
-- 4. HELPER FUNCTION: check room availability
-- ============================================
CREATE OR REPLACE FUNCTION public.check_room_availability(
  p_room_id UUID,
  p_check_in DATE,
  p_check_out DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quantity INT;
  v_blocked BOOLEAN;
BEGIN
  -- Get room quantity
  SELECT quantity INTO v_quantity FROM public.rooms WHERE id = p_room_id AND is_active = true;
  IF v_quantity IS NULL THEN RETURN false; END IF;

  -- Check if any date in range is blocked
  SELECT EXISTS (
    SELECT 1 FROM public.room_availability
    WHERE room_id = p_room_id
    AND date >= p_check_in AND date < p_check_out
    AND is_blocked = true
  ) INTO v_blocked;
  IF v_blocked THEN RETURN false; END IF;

  -- Check if any date has 0 available count set explicitly
  IF EXISTS (
    SELECT 1 FROM public.room_availability
    WHERE room_id = p_room_id
    AND date >= p_check_in AND date < p_check_out
    AND available_count <= 0
  ) THEN RETURN false; END IF;

  -- Check existing bookings don't exceed quantity
  IF EXISTS (
    SELECT d.date
    FROM generate_series(p_check_in, p_check_out - INTERVAL '1 day', INTERVAL '1 day') AS d(date)
    WHERE (
      SELECT COUNT(*) FROM public.bookings
      WHERE room_id = p_room_id
      AND status IN ('pending', 'confirmed')
      AND check_in <= d.date AND check_out > d.date
    ) >= v_quantity
  ) THEN RETURN false; END IF;

  RETURN true;
END;
$$;

-- ============================================
-- 5. INDEXES for performance
-- ============================================
CREATE INDEX idx_rooms_property_id ON public.rooms(property_id);
CREATE INDEX idx_rooms_active ON public.rooms(is_active) WHERE is_active = true;
CREATE INDEX idx_room_availability_room_date ON public.room_availability(room_id, date);
CREATE INDEX idx_bookings_property_id ON public.bookings(property_id);
CREATE INDEX idx_bookings_guest_id ON public.bookings(guest_id);
CREATE INDEX idx_bookings_room_dates ON public.bookings(room_id, check_in, check_out);
CREATE INDEX idx_bookings_status ON public.bookings(status);
