import type { ReadonlyURLSearchParams } from "next/navigation"
import type { MobileLensKey } from "./mobile-priority-view-model"

export function buildLensUrl(
  basePath: string,
  currentParams: URLSearchParams | ReadonlyURLSearchParams,
  lens: MobileLensKey,
): string {
  const params = new URLSearchParams(currentParams.toString())

  if (lens === "all") {
    params.delete("lens")
  } else {
    params.set("lens", lens)
  }

  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}
