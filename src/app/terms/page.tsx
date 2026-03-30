export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-zinc-300">
      <h1 className="text-2xl font-bold text-white mb-2">利用規約</h1>
      <p className="text-sm text-zinc-500 mb-10">最終更新日: 2026年3月30日</p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">第1条（適用）</h2>
        <p className="text-sm leading-7">
          本規約は、AssetMaster JP（以下「本サービス」）の利用に関する条件を定めるものです。
          ユーザーは本規約に同意の上、本サービスを利用するものとします。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">第2条（サービスの内容）</h2>
        <p className="text-sm leading-7">
          本サービスは、ユーザーが自身の資産情報を記録・管理・可視化するためのツールを提供します。
          本サービスが提供する株価・基準価額等の情報は参考情報であり、正確性・完全性を保証するものではありません。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">第3条（投資に関する免責）</h2>
        <p className="text-sm leading-7">
          本サービスは投資助言サービスではありません。本サービス上のいかなる情報も、有価証券の売買その他の投資行動を勧誘・推奨するものではありません。
          投資に関する判断は、ユーザー自身の責任において行ってください。
          本サービスの利用に起因して生じた損失・損害について、当サービスは一切の責任を負いません。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">第4条（禁止事項）</h2>
        <p className="text-sm leading-7 mb-2">ユーザーは以下の行為を行ってはなりません。</p>
        <ul className="text-sm leading-7 list-disc list-inside space-y-1 text-zinc-400">
          <li>法令または公序良俗に違反する行為</li>
          <li>本サービスのサーバーへの過度な負荷をかける行為</li>
          <li>第三者のアカウントへの不正アクセス</li>
          <li>本サービスの運営を妨害する行為</li>
          <li>その他、当サービスが不適切と判断する行為</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">第5条（アカウントの管理）</h2>
        <p className="text-sm leading-7">
          ユーザーはアカウントのパスワードを自己の責任において管理するものとします。
          アカウントの不正利用によって生じた損害について、当サービスは責任を負いません。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">第6条（サービスの変更・停止）</h2>
        <p className="text-sm leading-7">
          当サービスは、事前の通知なくサービス内容の変更・停止・終了を行う場合があります。
          これによってユーザーに生じた損害について、当サービスは責任を負いません。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">第7条（規約の変更）</h2>
        <p className="text-sm leading-7">
          当サービスは、必要に応じて本規約を変更することがあります。
          変更後の規約はサービス上に掲示した時点から効力を生じるものとします。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">第8条（準拠法・管轄）</h2>
        <p className="text-sm leading-7">
          本規約の解釈は日本法に準拠し、紛争が生じた場合は当サービス運営者の所在地を管轄する裁判所を合意管轄とします。
        </p>
      </section>
    </div>
  )
}
