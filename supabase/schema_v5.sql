-- ============================================================
-- AssetMaster JP — スキーマ v5 追加分
-- Supabase SQL Editor で実行してください
-- ============================================================

-- 証券会社・口座種別を追加
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS broker TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT NULL;
-- account_type の値: 'nisa' / 'tokutei' / 'general'
