import { loadParentCustodianView } from "@/features/parent-custodian/load-parent-custodian-view";
import { verifiedPercentileGoldStyle } from "@/features/trajectory-index/trajectory-certificate-pure";

interface ParentViewPageProps {
  params: Promise<{ token: string }>;
}

export default async function ParentCustodianViewPage({ params }: ParentViewPageProps) {
  const { token } = await params;
  const view = await loadParentCustodianView(token);

  if (!view) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-zinc-900">Invite expired or invalid</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Ask your student to send a fresh parent custodian link from their Mentrixa profile.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
        Parent custodian view
      </p>
      <h1 className="mt-2 text-2xl font-black text-zinc-900">{view.studentFirstName}</h1>
      <p className="mt-1 text-sm text-zinc-600">{view.subject} · read only</p>
      <p className="mt-6 text-sm font-semibold text-zinc-900">{view.verdict}</p>
      <p className="mt-2 text-sm text-zinc-600">{view.nextAction}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 p-4">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Verified percentile</p>
          <p className="mt-1 text-2xl font-black" style={verifiedPercentileGoldStyle()}>
            {view.verifiedPercentile != null
              ? `${Math.round(view.verifiedPercentile)}th`
              : "Calibrating"}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-4">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Trajectory Index</p>
          <p className="mt-1 text-2xl font-black text-indigo-950">{view.trajectoryScore}</p>
        </div>
      </div>
    </main>
  );
}
