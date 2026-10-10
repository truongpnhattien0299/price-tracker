"use client"

import { MapPinIcon, SearchIcon, XIcon } from "lucide-react"
import { useEffect, useId, useState } from "react"

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { PLACE_SEARCH_MIN, usePlaceSearch } from "@/hooks/queries/use-place-search"
import type { Coords } from "@/lib/photo-location"
import { cn } from "@/lib/utils"
import type { PlaceSuggestion } from "@/types/api"

const DEBOUNCE_MS = 350

/**
 * Address / place search above the entry form's map: type, pick a suggestion,
 * and the pin jumps there. A hand-rolled combobox (ARIA 1.2 pattern) rather
 * than a popover, so the list stays inside the dialog's scroll area.
 */
export function PlaceSearch({
  near,
  disabled,
  onPick,
}: {
  /** Results are ranked by distance from here (the current pin), else from HCMC. */
  near: Coords | null
  disabled: boolean
  onPick: (place: PlaceSuggestion) => void
}) {
  const listId = useId()
  const [text, setText] = useState("")
  const [term, setTerm] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  useEffect(() => {
    const t = setTimeout(() => setTerm(text), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [text])

  const search = usePlaceSearch(term, near)
  const results = search.data ?? []
  const searchable = text.trim().length >= PLACE_SEARCH_MIN
  const settled = term === text && !search.isFetching
  const showList = open && searchable && (results.length > 0 || settled)

  // A new result set starts with nothing highlighted.
  useEffect(() => setActive(-1), [search.data])

  function pick(place: PlaceSuggestion) {
    setText(place.name)
    setTerm(place.name)
    setOpen(false)
    onPick(place)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Enter here must never submit the entry form.
    if (e.key === "Enter") {
      e.preventDefault()
      const place = results[active] ?? (results.length === 1 ? results[0] : undefined)
      if (showList && place) pick(place)
      return
    }
    if (e.key === "Escape" && showList) {
      // Close the list, not the dialog.
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      return
    }
    if (!results.length) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (i + 1) % results.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1))
    }
  }

  const optionId = (i: number) => `${listId}-${i}`

  return (
    <div className="relative">
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          type="text"
          role="combobox"
          aria-label="Tìm địa chỉ hoặc cửa hàng"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Tìm địa chỉ, cửa hàng, chợ…"
          maxLength={100}
          disabled={disabled}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {(search.isFetching || text) && (
          <InputGroupAddon align="inline-end">
            {search.isFetching ? (
              <Spinner />
            ) : (
              <InputGroupButton
                size="icon-xs"
                aria-label="Xoá từ khoá"
                onClick={() => {
                  setText("")
                  setTerm("")
                }}
              >
                <XIcon />
              </InputGroupButton>
            )}
          </InputGroupAddon>
        )}
      </InputGroup>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Gợi ý địa điểm"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
          // Keep focus in the input, so the click lands before onBlur closes the list.
          onMouseDown={(e) => e.preventDefault()}
        >
          {results.length === 0 ? (
            <li className="px-2 py-3 text-center text-sm text-muted-foreground">
              {search.isError ? "Không tìm được, thử lại sau." : "Không tìm thấy địa điểm."}
            </li>
          ) : (
            results.map((place, i) => (
              <li
                key={place.id}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm",
                  i === active && "bg-accent text-accent-foreground",
                )}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(place)}
              >
                <MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{place.name}</span>
                  {place.address && (
                    <span className="block truncate text-xs text-muted-foreground">{place.address}</span>
                  )}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
