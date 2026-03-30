# AssetMaster JP

個人向け資産管理Webアプリケーション。日本株・米国株・投資信託・銀行預金を一元管理し、資産推移・配当収入・株主優待をトラッキングできます。

---

## 主な機能

| 機能 | 説明 |
|------|------|
| ダッシュボード | 総資産・含み益・前日比をリアルタイム表示。資産配分パイチャートと推移グラフ |
| 資産管理 | 日本株 / 米国株 / 投資信託 / 銀行預金の登録・編集・削除 |
| 配当管理 | 配当・優待の受取記録、月別・銘柄別の収入グラフ |
| 分析 | カテゴリ別・口座種別（NISA / 特定 / 一般）の内訳グラフ |
| 株価自動取得 | Yahoo Finance API（日本株・米国株、15分キャッシュ）|
| 基準価額自動取得 | minkabu スクレイピング（投資信託、15分キャッシュ）|
| CSVインポート | 銀行・証券口座の取引データをCSVで一括取込 |
| スナップショット | 日次で総資産を自動記録し、最大30日の推移グラフを表示 |

---

## 技術スタック

- **フロントエンド**: Next.js 16 (App Router) / React 19 / TypeScript
- **スタイリング**: Tailwind CSS v4 / shadcn/ui (Radix UI)
- **チャート**: Recharts
- **バックエンド / DB**: Supabase (PostgreSQL + Auth + RLS)
- **データ取得**: TanStack Query v5
- **外部API**: Yahoo Finance API、minkabu（itf.minkabu.jp）

---

## 想定環境

| 項目 | バージョン |
|------|-----------|
| Node.js | 20.x 以上 |
| npm | 10.x 以上（または pnpm / yarn） |
| Supabase | クラウド版（無料プランで動作確認済み）|

---

## デプロイ（本番公開 / 別PCから使う）

ローカル環境を作らずにブラウザだけで使いたい場合は **Vercel** へのデプロイが最も簡単です。

### Vercel へのデプロイ手順

1. [vercel.com](https://vercel.com) で GitHub アカウントと連携してサインアップ
2. ダッシュボード → **Add New → Project** → このリポジトリを選択
3. 「Environment Variables」に以下を入力

   ```
   NEXT_PUBLIC_SUPABASE_URL      = https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
   ```

4. **Deploy** ボタンを押す（数分で完了）
5. 発行された URL（例: `https://your-app.vercel.app`）をブラウザで開く
6. `/auth/register` から新規アカウントを作成して利用開始

> Supabase の RLS によりユーザーデータは完全に分離されるため、同じ Supabase プロジェクトを複数人で共有できます。

---

## ローカルセットアップ手順

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd assetmanagement
```

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. Supabase プロジェクトの作成

1. [supabase.com](https://supabase.com) でアカウントを作成し、新しいプロジェクトを作成する
2. **Settings → API** を開き、以下の値を控える
   - `Project URL`（`NEXT_PUBLIC_SUPABASE_URL`）
   - `anon public` キー（`NEXT_PUBLIC_SUPABASE_ANON_KEY`）

### 4. データベーススキーマの適用

Supabase ダッシュボードの **SQL Editor** で、以下のファイルを**順番に**実行する。

```
supabase/schema.sql      # テーブル定義・RLS・トリガー（初回のみ）
supabase/schema_v2.sql   # 取引種別・配当テーブル追加
supabase/schema_v3.sql   # 配当月カラム追加
supabase/schema_v4.sql   # 月別配当金カラム追加
supabase/schema_v5.sql   # 証券会社・口座種別カラム追加
supabase/schema_v6.sql   # 投資信託ファンドコードカラム追加
```

> 新規セットアップの場合、すべて順番に実行してください。

### 5. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を開き、手順 3 で控えた値を入力する。

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開く。

---

## 利用可能なコマンド

```bash
npm run dev      # 開発サーバー起動（Turbopack）
npm run build    # 本番ビルド
npm run start    # 本番サーバー起動
npm run lint     # ESLint 実行
```

---

## ディレクトリ構成

```
src/
├── app/
│   ├── analysis/      # 分析ページ
│   ├── assets/        # 資産管理ページ
│   ├── auth/          # 認証（ログイン・登録）
│   ├── dashboard/     # ダッシュボード
│   ├── dividends/     # 配当管理ページ
│   ├── settings/      # 設定・CSVインポート
│   └── api/           # API Routes（株価取得など）
├── components/        # 共通UIコンポーネント
└── lib/
    ├── actions/       # Server Actions（CRUD）
    ├── supabase/      # Supabaseクライアント
    ├── stock-prices.ts # 株価・基準価額取得
    ├── csv-parser.ts  # CSVパーサー
    ├── types.ts       # 型定義
    └── utils.ts       # ユーティリティ関数

supabase/              # DBスキーマSQLファイル
```

---

## データベース設計

主要テーブルの概要：

| テーブル | 内容 |
|---------|------|
| `assets` | 資産マスター（株・投信・銀行を統合） |
| `user_settings` | ユーザー設定（USD/JPYレートなど） |
| `balance_logs` | 銀行残高の変更ログ |
| `dividend_records` | 配当・優待の受取記録 |
| `asset_snapshots` | 日次の総資産スナップショット |

全テーブルに Row Level Security (RLS) が設定されており、ユーザーは自分のデータのみアクセス可能。

---

## 資産カテゴリと入力項目

| カテゴリ | 主な入力項目 |
|---------|-------------|
| 日本株 (`japan_stock`) | 銘柄コード（4桁）、株数、取得単価、配当月、優待情報 |
| 米国株 (`us_stock`) | ティッカーシンボル、株数、取得単価（USD）|
| 投資信託 (`mutual_fund`) | ファンドコード（8桁）、口数、取得時基準価額 |
| 銀行・現金 (`bank`) | 残高（JPY）|

口座種別として NISA / 特定口座 / 一般口座を選択可能。

---

## 認証

Supabase Auth によるメール＋パスワード認証。
`/auth/login` でログイン、`/auth/register` で新規登録。
未認証ユーザーはミドルウェアによりログインページへリダイレクトされる。
