import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import * as React from 'react'
import { cn } from '../lib/cn'
import { Button } from './button'
import { EmptyState, type EmptyStateProps } from './empty-state'
import { Checkbox } from './input'

export interface Column<T> {
  key: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  sortValue?: (row: T) => string | number
  className?: string
  align?: 'left' | 'right'
}

export interface DataTableProps<T> {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  rowActions?: (row: T) => React.ReactNode
  pageSize?: number
  empty?: EmptyStateProps
  className?: string
  selectedKeys?: Set<string>
  onSelectionChange?: (keys: Set<string>) => void
  selectionLabel?: string
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  rowActions,
  pageSize = 10,
  empty,
  className,
  selectedKeys,
  onSelectionChange,
  selectionLabel = 'Select row',
}: DataTableProps<T>) {
  const [page, setPage] = React.useState(0)
  const [sort, setSort] = React.useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)

  const sorted = React.useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return rows
    const sv = col.sortValue
    return rows.slice().sort((a, b) => {
      const av = sv(a)
      const bv = sv(b)
      const r = av < bv ? -1 : av > bv ? 1 : 0
      return sort.dir === 'asc' ? r : -r
    })
  }, [rows, columns, sort])

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const current = Math.min(page, pages - 1)
  const slice = sorted.slice(current * pageSize, current * pageSize + pageSize)

  function toggleSort(key: string) {
    setSort((s) =>
      s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' },
    )
  }

  const selectable = Boolean(selectedKeys && onSelectionChange)
  const visibleKeys = slice.map(rowKey)
  const allVisibleSelected =
    visibleKeys.length > 0 && visibleKeys.every((key) => selectedKeys?.has(key))

  function toggleAll(checked: boolean) {
    if (!selectedKeys || !onSelectionChange) return
    const next = new Set(selectedKeys)
    for (const key of visibleKeys) checked ? next.add(key) : next.delete(key)
    onSelectionChange(next)
  }

  function toggleOne(key: string, checked: boolean) {
    if (!selectedKeys || !onSelectionChange) return
    const next = new Set(selectedKeys)
    checked ? next.add(key) : next.delete(key)
    onSelectionChange(next)
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-border border-b">
              {selectable ? (
                <th className="h-10 w-12 px-4">
                  <Checkbox
                    checked={allVisibleSelected}
                    aria-label="Select visible rows"
                    onChange={(event) => toggleAll(event.target.checked)}
                  />
                </th>
              ) : null}
              {columns.map((c) => (
                <th
                  key={c.key}
                  aria-sort={
                    c.sortValue
                      ? sort?.key === c.key
                        ? sort.dir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined
                  }
                  className={cn(
                    'text-muted h-10 px-4 text-left text-xs font-semibold tracking-wide uppercase',
                    c.align === 'right' && 'text-right',
                    c.className,
                  )}
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className="hover:text-foreground focus-visible:ring-accent inline-flex min-h-10 items-center gap-1 rounded-lg focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {c.header}
                      {sort?.key === c.key ? (
                        sort.dir === 'asc' ? (
                          <ChevronUp className="size-3.5" />
                        ) : (
                          <ChevronDown className="size-3.5" />
                        )
                      ) : (
                        <ChevronsUpDown className="size-3.5 opacity-50" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
              {rowActions ? <th className="h-10 w-24 px-4" /> : null}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (rowActions ? 1 : 0) + (selectable ? 1 : 0)}>
                  <EmptyState
                    {...(empty ?? {
                      title: 'Nothing here yet',
                      description: 'No records match the current filters.',
                    })}
                  />
                </td>
              </tr>
            ) : (
              slice.map((row) => (
                <tr
                  key={rowKey(row)}
                  data-clickable={Boolean(onRowClick)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className="group border-border hover:bg-surface-2 border-b last:border-0 data-[clickable=true]:cursor-pointer"
                >
                  {selectable ? (
                    <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        checked={selectedKeys?.has(rowKey(row))}
                        aria-label={`${selectionLabel} ${rowKey(row)}`}
                        onChange={(event) => toggleOne(rowKey(row), event.target.checked)}
                      />
                    </td>
                  ) : null}
                  {columns.map((c, index) => (
                    <td
                      key={c.key}
                      className={cn(
                        'px-4 py-3 align-middle',
                        c.align === 'right' && 'text-right',
                        c.className,
                      )}
                    >
                      {index === 0 && onRowClick ? (
                        <button
                          type="button"
                          className="focus-visible:ring-accent w-full rounded-lg text-left focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                          onClick={(event) => {
                            event.stopPropagation()
                            onRowClick(row)
                          }}
                        >
                          {c.cell(row)}
                        </button>
                      ) : (
                        c.cell(row)
                      )}
                    </td>
                  ))}
                  {rowActions ? (
                    <td className="px-4 py-3 align-middle">
                      <div
                        className="flex justify-end gap-1 opacity-60 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {rowActions(row)}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 p-3 md:hidden">
        {slice.length === 0 ? (
          <EmptyState
            {...(empty ?? {
              title: 'Nothing here yet',
              description: 'No records match the current filters.',
            })}
          />
        ) : (
          slice.map((row) => {
            const key = rowKey(row)
            return (
              <article
                key={key}
                data-clickable={Boolean(onRowClick)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className="border-border bg-card data-[clickable=true]:hover:bg-surface-2 rounded-2xl border p-4 data-[clickable=true]:cursor-pointer"
              >
                <div className="space-y-3">
                  {selectable ? (
                    <div onClick={(event) => event.stopPropagation()}>
                      <label className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold">
                        <Checkbox
                          checked={selectedKeys?.has(key)}
                          onChange={(event) => toggleOne(key, event.target.checked)}
                        />
                        Select
                      </label>
                    </div>
                  ) : null}
                  {columns.map((column, index) => (
                    <div
                      key={column.key}
                      className={cn(index === 0 ? 'block' : 'grid grid-cols-[7rem_1fr] gap-3')}
                    >
                      {index > 0 ? (
                        <p className="text-muted text-xs font-semibold">{column.header}</p>
                      ) : null}
                      <div className={cn(index > 0 && column.align === 'right' && 'text-left')}>
                        {index === 0 && onRowClick ? (
                          <button
                            type="button"
                            className="focus-visible:ring-accent min-h-11 w-full rounded-lg text-left focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                            onClick={(event) => {
                              event.stopPropagation()
                              onRowClick(row)
                            }}
                          >
                            {column.cell(row)}
                          </button>
                        ) : (
                          column.cell(row)
                        )}
                      </div>
                    </div>
                  ))}
                  {rowActions ? (
                    <div
                      className="border-border flex justify-end gap-1 border-t pt-3"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {rowActions(row)}
                    </div>
                  ) : null}
                </div>
              </article>
            )
          })
        )}
      </div>
      {sorted.length > pageSize ? (
        <div className="border-border text-muted flex items-center justify-between border-t px-4 py-3 text-sm">
          <span role="status" aria-live="polite" aria-atomic="true">
            {current * pageSize + 1}–{Math.min(sorted.length, (current + 1) * pageSize)} of{' '}
            {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              className="rounded-full"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={current === 0}
              aria-label="Previous page"
            >
              <ChevronLeft />
            </Button>
            <span className="tabular-nums">
              Page {current + 1} / {pages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              className="rounded-full"
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              disabled={current >= pages - 1}
              aria-label="Next page"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
