-- ============================================================
-- AssetMaster JP — スキーマ v4 追加分
-- Supabase SQL Editor で実行してください
-- ============================================================

-- 株式に月別配当金（1株あたり・円）を追加
-- 12要素の配列。インデックス0=1月、11=12月
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS dividend_per_month NUMERIC[] DEFAULT NULL;
