"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const VideoCallLazy = dynamic(
  () => import("@/features/video/video-call").then((m) => ({ default: m.VideoCall })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <p className="text-sm text-gray-400">Connecting to session…</p>
      </div>
    ),
  },
);

export function VideoCall(props: ComponentProps<typeof VideoCallLazy>) {
  return <VideoCallLazy {...props} />;
}
