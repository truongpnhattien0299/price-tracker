"use client"

import { ImageOffIcon } from "lucide-react"
import { useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * A storage (R2) photo behind a presigned URL. Plain `<img>`, not `next/image`: the
 * signed URL changes on every refresh and expires in 5 minutes, so the Next
 * optimizer would only cache dead URLs.
 *
 * `src` undefined = URL still loading; `failed` = the URL request failed.
 */
export function Photo({
  src,
  alt,
  failed,
  className,
}: {
  src: string | undefined
  alt: string
  failed?: boolean
  className?: string
}) {
  const [state, setState] = useState<{ src?: string; status: "loading" | "loaded" | "error" }>({
    src,
    status: "loading",
  })
  // A new URL (refetched after expiry) starts loading again.
  if (state.src !== src) setState({ src, status: "loading" })

  if (failed || state.status === "error") {
    return (
      <div className={cn("bg-muted text-muted-foreground flex items-center justify-center", className)}>
        <ImageOffIcon className="size-5" aria-label="Không tải được ảnh" />
      </div>
    )
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {state.status !== "loaded" && <Skeleton className="absolute inset-0 rounded-none" />}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- presigned storage URL, see above
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          // Cached images can finish before React attaches onLoad.
          ref={(img) => {
            if (img?.complete && img.naturalWidth > 0 && state.status === "loading") {
              setState({ src, status: "loaded" })
            }
          }}
          onLoad={() => setState({ src, status: "loaded" })}
          onError={() => setState({ src, status: "error" })}
          className={cn(
            "size-full object-cover transition-opacity",
            state.status === "loaded" ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </div>
  )
}
