"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { ThemeProvider } from "next-themes"
import { useState } from "react"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { HttpError } from "@/lib/api/client"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        // 4xx won't fix itself on retry (401 already redirected to /login).
        retry: (failureCount, error) =>
          !(error instanceof HttpError && error.status >= 400 && error.status < 500) &&
          failureCount < 2,
      },
    },
  })
}

export function Providers({ children }: { children: React.ReactNode }) {
  // One client per browser session; useState keeps it out of module scope so
  // server renders never share a cache between requests.
  const [queryClient] = useState(makeQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <TooltipProvider>
          {children}
          <Toaster richColors />
        </TooltipProvider>
      </ThemeProvider>
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools buttonPosition="bottom-left" />}
    </QueryClientProvider>
  )
}
