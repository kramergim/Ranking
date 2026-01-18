-- =====================================================
-- HERO BANNERS - RLS POLICIES
-- =====================================================
-- Add Row Level Security for hero_banners table
-- PUBLIC can read active banners, admin can manage all banners
-- =====================================================

-- Enable RLS on hero_banners table
ALTER TABLE hero_banners ENABLE ROW LEVEL SECURITY;

-- Lecture: PUBLIC voit UNIQUEMENT banners actives
-- admin/selector voient tout
CREATE POLICY hero_banners_select ON hero_banners FOR SELECT USING (
  is_active = true OR get_user_role() IN ('admin', 'selector')
);

-- Écriture: admin uniquement
CREATE POLICY hero_banners_insert ON hero_banners FOR INSERT WITH CHECK (
  get_user_role() = 'admin'
);

CREATE POLICY hero_banners_update ON hero_banners FOR UPDATE USING (
  get_user_role() = 'admin'
);

CREATE POLICY hero_banners_delete ON hero_banners FOR DELETE USING (
  get_user_role() = 'admin'
);
