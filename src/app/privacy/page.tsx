export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-zinc-300">
      <h1 className="text-2xl font-bold text-white mb-2">プライバシーポリシー</h1>
      <p className="text-sm text-zinc-500 mb-10">最終更新日: 2026年3月30日</p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">1. 取得する情報</h2>
        <p className="text-sm leading-7 mb-2">本サービスは以下の情報を取得します。</p>
        <ul className="text-sm leading-7 list-disc list-inside space-y-1 text-zinc-400">
          <li>メールアドレス（アカウント登録時）</li>
          <li>ユーザーが入力した資産情報（保有銘柄・株数・評価額・銀行残高など）</li>
          <li>配当・優待の受取記録</li>
          <li>サービス利用に伴うアクセスログ</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">2. 利用目的</h2>
        <p className="text-sm leading-7 mb-2">取得した情報は以下の目的のみに使用します。</p>
        <ul className="text-sm leading-7 list-disc list-inside space-y-1 text-zinc-400">
          <li>本サービスの提供・運営・改善</li>
          <li>ユーザー認証およびアカウント管理</li>
          <li>不正利用の検知・防止</li>
          <li>お問い合わせへの対応</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">3. 第三者への提供</h2>
        <p className="text-sm leading-7">
          当サービスは、以下の場合を除きユーザーの個人情報を第三者に提供しません。
        </p>
        <ul className="text-sm leading-7 list-disc list-inside space-y-1 text-zinc-400 mt-2">
          <li>ユーザー本人の同意がある場合</li>
          <li>法令に基づく場合</li>
          <li>人の生命・身体または財産の保護のために必要な場合</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">4. 外部サービスの利用</h2>
        <p className="text-sm leading-7 mb-2">
          本サービスは以下の外部サービスを利用しています。各サービスのプライバシーポリシーも合わせてご確認ください。
        </p>
        <ul className="text-sm leading-7 list-disc list-inside space-y-1 text-zinc-400">
          <li>
            <span className="text-zinc-300">Supabase</span>
            — データベース・認証基盤（データはSupabaseのサーバーに保存されます）
          </li>
          <li>
            <span className="text-zinc-300">Vercel</span>
            — アプリケーションのホスティング
          </li>
          <li>
            <span className="text-zinc-300">Yahoo Finance API</span>
            — 株価情報の取得（ユーザー情報は送信しません）
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">5. データの保管と安全管理</h2>
        <p className="text-sm leading-7">
          ユーザーデータはSupabaseの提供するPostgreSQLデータベースに保存され、Row Level Security（RLS）によりユーザーごとに厳密に分離されています。
          通信はTLS（HTTPS）により暗号化されます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">6. 個人情報の開示・訂正・削除</h2>
        <p className="text-sm leading-7">
          ユーザーは自身の個人情報について、開示・訂正・削除を請求する権利を有します。
          アカウントの削除はアプリ内設定またはお問い合わせにより対応します。
          アカウント削除時には、関連するすべてのデータが削除されます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">7. Cookieの使用</h2>
        <p className="text-sm leading-7">
          本サービスはユーザー認証のためにCookieを使用します。
          Cookieにはマーケティング目的のトラッキング情報は含まれません。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">8. ポリシーの変更</h2>
        <p className="text-sm leading-7">
          本ポリシーは予告なく変更される場合があります。
          重要な変更がある場合はサービス上でお知らせします。
        </p>
      </section>
    </div>
  )
}
