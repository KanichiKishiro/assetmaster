-- ============================================================
-- AssetMaster JP — スキーマ v6 追加分
-- Supabase SQL Editor で実行してください
-- ============================================================

-- 投資信託のファンドコード（8桁英数字）を追加
-- Yahoo Finance から基準価額を自動取得するために使用
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS fund_code TEXT DEFAULT NULL;
