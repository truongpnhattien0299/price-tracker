"use client"

import { PlusIcon, StoreIcon, XIcon } from "lucide-react"
import { useEffect, useId, useState } from "react"

import { formatDistance, StoreStatusBadge } from "@/components/dashboard/stores/store-status-badge"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { useStoreSearch } from "@/hooks/queries/use-stores"
import type { Coords } from "@/lib/photo-location"
import { cn } from "@/lib/utils"
import type { Store } from "@/types/api"

const DEBOUNCE_MS = 250

type Option = { kind: "store"; store: Store } | { kind: "create" }

/**
 * The entry form's "Cửa hàng" field (plans/09). Typing is still a free-text
 * store name; the list offers saved stores (own + global, nearest first) to
 * link instead, and "Tạo cửa hàng …" for a new one. Same hand-rolled ARIA
 * combobox as PlaceSearch, so the list stays inside the dialog's scroll area.
 */
export function StorePicker({
  id,
  text,
  near,
  disabled,
  onTextChange,
  onPick,
  onCreate,
}: {
  id?: string
  text: string
  /** Suggestions are ranked by distance from here (the photo or device position). */
  near: Coords | null
  disabled: boolean
  onTextChange: (text: string) => void
  onPick: (store: Store) => void
  onCreate: (name: string) => void
}) {
  const listId = useId()
  const [term, setTerm] = useState(text)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  useEffect(() => {
    const t = setTimeout(() => setTerm(text), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [text])

  // Fetched only once the field is used: opening the form costs no request.
  const [touched, setTouched] = useState(false)
  const search = useStoreSearch(term, near, { enabled: touched })
  const stores = search.data ?? []
  const options: Option[] = [...stores.map((store) => ({ kind: "store" as const, store })), { kind: "create" }]
  const showList = open && !disabled && (search.isSuccess || search.isPlaceholderData)

  useEffect(() => setActive(-1), [search.data])

  function choose(option: Option) {
    setOpen(false)
    if (option.kind === "store") onPick(option.store)
    else onCreate(text.trim())
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      // Never submit the entry form from here; Enter only picks a highlighted option.
      e.preventDefault()
      if (showList && options[active]) choose(options[active])
      return
    }
    if (e.key === "Escape" && showList) {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (i + 1) % options.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1))
    }
  }

  const optionId = (i: number) => `${listId}-${i}`

  return (
    <div className="relative">
      <InputGroup>
        <InputGroupAddon>
          <StoreIcon />
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          placeholder="Chọn hoặc gõ tên cửa hàng"
          maxLength={120}
          disabled={disabled}
          value={text}
          onChange={(e) => {
            onTextChange(e.target.value)
            setTouched(true)
            setOpen(true)
          }}
          onFocus={() => {
            setTouched(true)
            setOpen(true)
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {(search.isFetching || text) && (
          <InputGroupAddon align="inline-end">
            {search.isFetching ? (
              <Spinner />
            ) : (
              <InputGroupButton size="icon-xs" aria-label="Xoá tên cửa hàng" onClick={() => onTextChange("")}>
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
          aria-label="Cửa hàng đã lưu"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
          onMouseDown={(e) => e.preventDefault()}
        >
          {stores.length === 0 && (
            <li className="px-2 py-2 text-sm text-muted-foreground">
              {search.isError
                ? "Không tải được danh sách cửa hàng."
                : term.trim()
                  ? "Chưa có cửa hàng nào trùng tên."
                  : "Bạn chưa lưu cửa hàng nào."}
            </li>
          )}
          {options.map((option, i) => (
            <li
              key={option.kind === "store" ? option.store.id : "create"}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm",
                i === active && "bg-accent text-accent-foreground",
                option.kind === "create" && "text-primary",
              )}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(option)}
            >
              {option.kind === "store" ? (
                <>
                  <StoreIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">{option.store.name}</span>
                      {option.store.status === "global" && <StoreStatusBadge status="global" />}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[
                        option.store.distanceM !== undefined && formatDistance(option.store.distanceM),
                        option.store.address,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Chưa có địa chỉ"}
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <PlusIcon className="mt-0.5 size-4 shrink-0" />
                  <span className="min-w-0 truncate font-medium">
                    {text.trim() ? `Tạo cửa hàng “${text.trim()}”` : "Tạo cửa hàng mới"}
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
