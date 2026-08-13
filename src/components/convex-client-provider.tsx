"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useState, type ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    if (!convexUrl) return null;
    return new ConvexReactClient(convexUrl);
  });

  if (!client) {
    return (
      <main className="grid min-h-dvh place-items-center px-6">
        <div className="max-w-md border border-line bg-paper p-8 paper-shadow">
          <p className="mb-2 font-display text-3xl">Convex needs a home.</p>
          <p className="leading-7 text-muted">
            Add <code className="text-ink">NEXT_PUBLIC_CONVEX_URL</code> to your
            environment, then restart the app.
          </p>
        </div>
      </main>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
