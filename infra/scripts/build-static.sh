#!/usr/bin/env bash
# =============================================================================
# build-static.sh — Builds the Next.js frontend as a static export for S3.
#
# This script temporarily modifies server-side-only files so that
# `next build` produces a static HTML/CSS/JS bundle in frontend/out/.
# All original files are restored automatically on exit (success or failure).
#
# Usage:
#   ./infra/scripts/build-static.sh          # from repo root
#   SKIP_INSTALL=1 ./infra/scripts/build-static.sh  # skip npm install
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"
STASH_DIR="$(mktemp -d)"

# Track created layout files so we can remove them on cleanup
CREATED_LAYOUTS=()

# ---------------------------------------------------------------------------
# Cleanup: always restore originals, even on failure
# ---------------------------------------------------------------------------
cleanup() {
  echo ""
  echo "--- Restoring original files ---"

  # Restore backed-up files
  cp "$STASH_DIR/next.config.ts"    "$FRONTEND_DIR/next.config.ts"    2>/dev/null || true
  cp "$STASH_DIR/layout.tsx"        "$FRONTEND_DIR/src/app/layout.tsx" 2>/dev/null || true
  cp "$STASH_DIR/root-page.tsx"     "$FRONTEND_DIR/src/app/page.tsx"   2>/dev/null || true
  cp "$STASH_DIR/login-page.tsx"    "$FRONTEND_DIR/src/app/(auth)/login/page.tsx" 2>/dev/null || true

  # Restore middleware
  if [ -f "$STASH_DIR/middleware.ts" ]; then
    mv "$STASH_DIR/middleware.ts" "$FRONTEND_DIR/middleware.ts"
  fi

  # Restore API routes
  if [ -d "$STASH_DIR/api" ]; then
    rm -rf "$FRONTEND_DIR/src/app/api" 2>/dev/null || true
    mv "$STASH_DIR/api" "$FRONTEND_DIR/src/app/api"
  fi

  # Restore dynamic-route pages (remove wrappers, put originals back)
  for stashed in "$STASH_DIR"/dynamic-*; do
    [ -f "$stashed" ] || continue
    relative="${stashed#"$STASH_DIR"/dynamic-}"
    # Decode the path: slashes were replaced with __SLASH__
    original_path="${relative//__SLASH__//}"
    target="$FRONTEND_DIR/src/app/$original_path"
    rm -f "$target" 2>/dev/null || true
    rm -f "$(dirname "$target")/_client-page.tsx" 2>/dev/null || true
    cp "$stashed" "$target"
  done

  # Remove layout.tsx files we created for [id] segments
  for layout_file in "${CREATED_LAYOUTS[@]}"; do
    rm -f "$layout_file" 2>/dev/null || true
  done

  rm -rf "$STASH_DIR"
  echo "--- Restore complete ---"
}
trap cleanup EXIT

echo "=== AccordCRM Static Export Build ==="
echo "Frontend dir: $FRONTEND_DIR"
echo ""

# ---------------------------------------------------------------------------
# 1. Verify frontend exists and install dependencies
# ---------------------------------------------------------------------------
if [ ! -f "$FRONTEND_DIR/package.json" ]; then
  echo "ERROR: frontend/package.json not found. Run from the repo root."
  exit 1
fi

if [ "${SKIP_INSTALL:-}" != "1" ]; then
  echo "--- Installing dependencies ---"
  (cd "$FRONTEND_DIR" && npm ci --prefer-offline 2>/dev/null || npm install)
else
  echo "--- Skipping npm install (SKIP_INSTALL=1) ---"
fi

# ---------------------------------------------------------------------------
# 2. Stash originals
# ---------------------------------------------------------------------------
echo "--- Backing up files ---"
cp "$FRONTEND_DIR/next.config.ts"                       "$STASH_DIR/next.config.ts"
cp "$FRONTEND_DIR/src/app/layout.tsx"                    "$STASH_DIR/layout.tsx"
cp "$FRONTEND_DIR/src/app/page.tsx"                      "$STASH_DIR/root-page.tsx"
cp "$FRONTEND_DIR/src/app/(auth)/login/page.tsx"         "$STASH_DIR/login-page.tsx"

if [ -f "$FRONTEND_DIR/middleware.ts" ]; then
  mv "$FRONTEND_DIR/middleware.ts" "$STASH_DIR/middleware.ts"
fi

if [ -d "$FRONTEND_DIR/src/app/api" ]; then
  mv "$FRONTEND_DIR/src/app/api" "$STASH_DIR/api"
fi

# ---------------------------------------------------------------------------
# 3. Write export-compatible next.config.ts
# ---------------------------------------------------------------------------
echo "--- Writing static-export next.config.ts ---"
cat > "$FRONTEND_DIR/next.config.ts" << 'NEXTCONFIG'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
NEXTCONFIG

# ---------------------------------------------------------------------------
# 4. Write export-compatible root layout (no server-side session)
# ---------------------------------------------------------------------------
echo "--- Writing static-export layout.tsx ---"
cat > "$FRONTEND_DIR/src/app/layout.tsx" << 'LAYOUT'
import "./globals.css";
import { Toaster } from "sonner";
import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AccordCRM",
  description: "Customer Relationship Management (CRM) System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('accord-crm-theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${ibmPlexSans.variable} font-sans antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
LAYOUT

# ---------------------------------------------------------------------------
# 5. Write client-side redirect for root page (/ -> /login)
# ---------------------------------------------------------------------------
echo "--- Writing static-export root page ---"
cat > "$FRONTEND_DIR/src/app/page.tsx" << 'ROOTPAGE'
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  return null;
}
ROOTPAGE

# ---------------------------------------------------------------------------
# 6. Write client-side redirect for /login page (/login -> /login/agent)
# ---------------------------------------------------------------------------
echo "--- Writing static-export login redirect page ---"
cat > "$FRONTEND_DIR/src/app/(auth)/login/page.tsx" << 'LOGINPAGE'
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login/agent");
  }, [router]);
  return null;
}
LOGINPAGE

# ---------------------------------------------------------------------------
# 7. Handle dynamic [id] routes for static export
#
# Next.js 16 requires generateStaticParams() for dynamic routes when
# using output: "export". It must return at least one entry (empty arrays
# are treated as missing). We:
#   a) Create a layout.tsx in each [id] directory with generateStaticParams
#   b) Wrap each page.tsx with a server component that imports the client page
# ---------------------------------------------------------------------------
echo "--- Handling dynamic routes for static export ---"

# Dynamic segment directories that need generateStaticParams
DYNAMIC_SEGMENTS=(
  "(dashboard)/admin/agents/[id]"
  "(dashboard)/agent/clients/[id]"
)

# Create layout.tsx with generateStaticParams in each [id] directory
for segment in "${DYNAMIC_SEGMENTS[@]}"; do
  layout_path="$FRONTEND_DIR/src/app/$segment/layout.tsx"
  if [ ! -f "$layout_path" ]; then
    cat > "$layout_path" << 'DYNLAYOUT'
export async function generateStaticParams() {
  return [{ id: "_" }];
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
DYNLAYOUT
    CREATED_LAYOUTS+=("$layout_path")
    echo "  Created layout: $segment/layout.tsx"
  fi
done

# Pages within dynamic segments that need wrapping
DYNAMIC_ROUTES=(
  "(dashboard)/admin/agents/[id]/page.tsx"
  "(dashboard)/admin/agents/[id]/edit/page.tsx"
  "(dashboard)/agent/clients/[id]/page.tsx"
  "(dashboard)/agent/clients/[id]/edit/page.tsx"
)

for route in "${DYNAMIC_ROUTES[@]}"; do
  full_path="$FRONTEND_DIR/src/app/$route"
  if [ ! -f "$full_path" ]; then
    echo "  WARN: $route not found, skipping"
    continue
  fi

  # Stash original
  stash_key="${route//\//__SLASH__}"
  cp "$full_path" "$STASH_DIR/dynamic-$stash_key"

  dir="$(dirname "$full_path")"
  mv "$full_path" "$dir/_client-page.tsx"

  # Detect if the page accepts params as a prop
  if grep -q 'params.*Promise' "$dir/_client-page.tsx"; then
    cat > "$full_path" << 'WRAPPER_PARAMS'
import ClientPage from "./_client-page";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ClientPage params={params} />;
}
WRAPPER_PARAMS
    echo "  Wrapped (with params): $route"
  else
    cat > "$full_path" << 'WRAPPER_SIMPLE'
import ClientPage from "./_client-page";

export default function Page() {
  return <ClientPage />;
}
WRAPPER_SIMPLE
    echo "  Wrapped (simple): $route"
  fi
done

# ---------------------------------------------------------------------------
# 8. Clean previous build artifacts and run the build
# ---------------------------------------------------------------------------
echo ""
echo "--- Cleaning previous build output ---"
rm -rf "$FRONTEND_DIR/.next" "$FRONTEND_DIR/out"

echo "--- Running next build (static export) ---"
(cd "$FRONTEND_DIR" && npx next build)

# ---------------------------------------------------------------------------
# 9. Verify output
# ---------------------------------------------------------------------------
if [ -d "$FRONTEND_DIR/out" ]; then
  FILE_COUNT=$(find "$FRONTEND_DIR/out" -type f | wc -l | tr -d ' ')
  echo ""
  echo "=== BUILD SUCCESSFUL ==="
  echo "Static export: $FRONTEND_DIR/out/"
  echo "Total files:   $FILE_COUNT"
  echo ""
  echo "Upload this directory to S3 with:"
  echo "  aws s3 sync frontend/out/ s3://\$BUCKET_NAME/ --delete"
else
  echo ""
  echo "ERROR: Build completed but frontend/out/ was not created."
  exit 1
fi
