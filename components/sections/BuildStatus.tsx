const checks = ['npm ci', 'TypeScript', 'Lint', 'Production build', 'Playwright E2E'];

export default function BuildStatus() {
  return (
    <section className="border-t border-line py-12">
      <div className="shell flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="label text-ion">Control plane // quality gates</p>
          <p className="mono-sm mt-2 max-w-2xl text-mist">Quality gates run in GitHub Actions on every main push. Their live result stays in CI rather than being copied into this static page, so the portfolio never presents stale build state.</p>
        </div>
        <ul className="flex flex-wrap gap-2">
          {checks.map((check) => <li key={check} className="border border-line px-3 py-1.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-mist">{check}</li>)}
        </ul>
      </div>
    </section>
  );
}
