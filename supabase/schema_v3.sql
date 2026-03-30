-- ============================================================
-- AssetMaster JP — スキーマ v3 追加分
-- Supabase SQL Editor で実行してください
-- ============================================================

-- 株式に配当月を追加（優待確定月と別管理）
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS dividend_months INTEGER[];
