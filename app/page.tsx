"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/Map").then((m) => m.MapView), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-zinc-100" />,
});

export default function Home() {
  return (
    <main className="fixed inset-0">
      <MapView />
    </main>
  );
}
