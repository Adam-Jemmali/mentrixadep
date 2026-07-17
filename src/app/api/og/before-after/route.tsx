import { ImageResponse } from "next/og";
import { loadBeforeAfterShareByToken } from "@/features/share-artifacts/load-share-artifact";
import { formatShareAccuracy } from "@/features/share-artifacts/before-after-pure";

export const runtime = "nodejs";

async function loadPlayfair(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      "https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjNxBf8Bni5_g.woff",
      { cache: "force-cache" },
    );
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim();
  if (!token) {
    return new Response("Missing token", { status: 400 });
  }

  const artifact = await loadBeforeAfterShareByToken(token);
  if (!artifact) {
    return new Response("Not found", { status: 404 });
  }

  const before = formatShareAccuracy(artifact.beforeValue);
  const after = formatShareAccuracy(artifact.afterValue);
  const rankLine = artifact.rankUsername
    ? `mentrixa.one/rank/${artifact.rankUsername}`
    : "mentrixa.one";
  const guideLine = artifact.guideName?.trim()
    ? `with ${artifact.guideName.trim()}`
    : null;

  const playfair = await loadPlayfair();
  const numberFont = playfair
    ? { fontFamily: "Playfair Display", fontStyle: "normal" as const }
    : { fontFamily: "Georgia, Times New Roman, serif", fontStyle: "italic" as const };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 64,
          background: "#0F172A",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            maxWidth: 980,
            justifyContent: "space-between",
            alignItems: "center",
            gap: 40,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            <div style={{ fontSize: 22, color: "#64748B", letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Before
            </div>
            <div
              style={{
                marginTop: 12,
                fontSize: 96,
                fontWeight: 700,
                color: "#EF4444",
                lineHeight: 1,
                ...numberFont,
              }}
            >
              {before}
            </div>
          </div>

          <div style={{ width: 2, height: 160, background: "#7C3AED" }} />

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            <div style={{ fontSize: 22, color: "#64748B", letterSpacing: "0.2em", textTransform: "uppercase" }}>
              After
            </div>
            <div
              style={{
                marginTop: 12,
                fontSize: 96,
                fontWeight: 700,
                color: "#22C55E",
                lineHeight: 1,
                ...numberFont,
              }}
            >
              {after}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 48,
            fontSize: 36,
            fontWeight: 600,
            color: "#FFFFFF",
            textAlign: "center",
          }}
        >
          {artifact.nodeName}
        </div>

        {guideLine ? (
          <div style={{ marginTop: 12, fontSize: 22, color: "#94A3B8" }}>{guideLine}</div>
        ) : null}

        <div
          style={{
            marginTop: 40,
            fontSize: 18,
            fontWeight: 600,
            color: "#7C3AED",
            letterSpacing: "0.04em",
          }}
        >
          {rankLine}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: playfair
        ? [
            {
              name: "Playfair Display",
              data: playfair,
              style: "normal",
              weight: 700,
            },
          ]
        : undefined,
    },
  );
}
