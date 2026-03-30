-- ============================================================
-- AssetMaster JP — Supabase スキーマ
-- Supabase ダッシュボード → SQL Editor で実行してください
-- ============================================================

-- ユーザー設定
CREATE TABLE IF NOT EXISTS user_settings (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  usd_jpy     DECIMAL(10, 4) NOT NULL DEFAULT 149.5,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 資産マスター（日本株・米国株・投資信託・銀行を統合）
CREATE TABLE IF NOT EXISTS assets (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category            TEXT NOT NULL CHECK (category IN ('japan_stock', 'us_stock', 'mutual_fund', 'bank')),
  name                TEXT NOT NULL,

  -- 株式共通
  ticker              TEXT,
  shares              DECIMAL(15, 4),
  purchase_price      DECIMAL(15, 4),    -- JPY or USD

  -- 投資信託
  units               DECIMAL(20, 4),    -- 口数
  nav_at_purchase     DECIMAL(15, 4),    -- 取得時基準価額（10,000口あたり）
  current_nav         DECIMAL(15, 4),    -- 現在基準価額（手動更新 or API同期）

  -- 銀行・現金
  balance             DECIMAL(15, 2),    -- JPY

  -- 株主優待
  settlement_months   INTEGER[],
  benefit_description TEXT,
  benefit_value       INTEGER,

  sort_order          INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 銀行残高変更ログ（自動記録）
CREATE TABLE IF NOT EXISTS balance_logs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id          UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  previous_balance  DECIMAL(15, 2),
  new_balance       DECIMAL(15, 2) NOT NULL,
  diff              DECIMAL(15, 2),
  note              TEXT,
  recorded_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 資産推移スナップショット（日次）
CREATE TABLE IF NOT EXISTS asset_snapshots (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_jpy     DECIMAL(18, 2) NOT NULL,
  snapshot_date DATE NOT NULL,
  UNIQUE(user_id, snapshot_date)
);

-- ============================================================
-- Row Level Security (RLS) — 全テーブルでユーザー分離
-- ============================================================
ALTER TABLE user_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_snapshots  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_settings"   ON user_settings   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_assets"     ON assets          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_logs"       ON balance_logs    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_snapshots"  ON asset_snapshots FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- updated_at 自動更新トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
