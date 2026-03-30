-- ============================================================
-- AssetMaster JP — スキーマ v2 追加分
-- Supabase SQL Editor で schema.sql の後に実行してください
-- ============================================================

-- balance_logs に取引種別・メモ列を追加
ALTER TABLE balance_logs
  ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'adjustment'
    CHECK (transaction_type IN ('deposit', 'withdrawal', 'deduction', 'adjustment')),
  ADD COLUMN IF NOT EXISTS memo TEXT,
  ADD COLUMN IF NOT EXISTS transaction_date DATE DEFAULT CURRENT_DATE;

-- 配当・優待記録テーブル
CREATE TABLE IF NOT EXISTS dividend_records (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  asset_id       UUID REFERENCES assets(id) ON DELETE SET NULL,
  asset_name     TEXT NOT NULL,
  payment_date   DATE NOT NULL,
  amount         DECIMAL(15, 2) NOT NULL,
  dividend_type  TEXT NOT NULL DEFAULT 'dividend'
                   CHECK (dividend_type IN ('dividend', 'benefit')),
  note           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dividend_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_dividends" ON dividend_records FOR ALL USING (auth.uid() = user_id);

-- 株式に年間予想配当（1株あたり）を追加
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS annual_dividend_per_share DECIMAL(10, 4);
