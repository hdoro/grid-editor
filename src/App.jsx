import React, { useCallback, useEffect, useRef, useState } from 'react'

const COLUMN_COUNT = 12

/**
 * @type {{ position: [rowStart: number, rowEnd: number, colStart: number, colEnd: number], _key: string }[]}
 * All 0-based
 */
const STARTING_ITEMS = [
  { position: [0, 0, 0, 8], _key: '1' },
  { position: [0, 0, 9, 11], _key: '2' },
  { position: [2, 2, 0, 11], _key: '3' },
  { position: [2, 3, 4, 5], _key: '4' },
]

/**
 * Production-ready packages:
 * - https://packery.metafizzy.co/
 * - https://www.npmjs.com/package/react-grid-layout
 * - https://www.npmjs.com/package/sortablejs
 *
 */
function App() {
  const containerRef = useRef()
  const [_mounted, setMounted] = useState(false)

  useEffect(() => {
    // Force re-rendering containerRef
    setMounted(true)
  }, [])

  const [items, setItems] = useState(STARTING_ITEMS)
  const rowCount = Math.max(
    1, // at least one row
    Math.max(...items.map((item) => item.position[1])),
  )

  const updateItem = useCallback(
    (item) => {
      if (
        !item._key ||
        !Array.isArray(item.position) ||
        item.position.length !== 4
      ) {
        return
      }

      // const index = items.
      setItems((prevItems) => {
        return [
          ...prevItems.filter((i) => i._key !== item._key),
          // Updated items should come last so to have a higher z-index
          { position: item.position, _key: item._key },
        ]
      })
    },
    [setItems],
  )

  const containerRect = containerRef?.current?.getBoundingClientRect()
  const containerPadding = getPaddingMap(containerRef?.current)
  const columnWidth = containerRect?.width
    ? (containerRect?.width - containerPadding.left - containerPadding.right) /
      COLUMN_COUNT
    : 0
  const rowHeight = containerRect?.height
    ? (containerRect?.height - containerPadding.top - containerPadding.bottom) /
      rowCount
    : 0

  const parseDragPosition = useCallback(
    /**
     *
     * @param {React.DragEvent<HTMLDivElement>} event
     */
    (event) => {
      const _key = event.dataTransfer.getData('application/card')
      if (!_key) {
        return
      }
      event.preventDefault()
      const current = items.find((item) => item._key === _key)
      if (!containerRect || !current) return

      const relativePosition = {
        x: event.clientX - containerRect.x - containerPadding.left,
        y: event.clientY - containerRect.y - containerPadding.top,
      }
      const columnSpan = current.position[3] - current.position[2]
      let columnStart = Math.min(
        Math.floor(relativePosition.x / columnWidth),
        COLUMN_COUNT - 1,
      )
      const columnEnd = Math.min(columnStart + columnSpan, COLUMN_COUNT - 1)
      // Prevent items from overflowing by reducing columnStart
      if (columnEnd - columnStart < columnSpan) {
        columnStart = columnEnd - columnSpan
      }

      const rowSpan = current.position[1] - current.position[0]
      const rowStart = Math.round(relativePosition.y / rowHeight)
      const rowEnd = rowStart + rowSpan

      const updated = {
        _key,
        position: [rowStart, rowEnd, columnStart, columnEnd],
      }
      return updated
    },
    [containerPadding, rowHeight, columnWidth, items],
  )

  return (
    <div className="p-4 flex h-[100vh] items-center justify-center">
      <div
        className="bg-slate-100 rounded-md gap-4 grid grid-cols-12 w-full relative p-7"
        ref={containerRef}
        onDragEnter={(event) => {
          const _key = event.dataTransfer.getData('application/card')
          if (_key) {
            event.preventDefault()
          }
        }}
        onDragOver={(event) => {
          const updated = parseDragPosition(event)
          updateItem(updated)
        }}
      >
        {items.map((item, index) => {
          const [rowStart, rowEnd, columnStart, columnEnd] = item.position
          const rowSpan = rowEnd - rowStart
          return (
            <div
              key={item._key}
              style={{
                // in CSS grid, the row/column end always must be at least > 1 larger than the start to create a new row/column, hence the +2 here
                gridRow: `${rowStart + 1} / ${rowEnd + 2}`,
                gridColumn: `${columnStart + 1} / ${columnEnd + 2}`,
                height: `calc(calc(100vw / 12) * ${rowSpan + 1})`,
                zIndex: index + 1,
              }}
              className="bg-white border border-slate-300 relative rounded-sm active:border-slate-600"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('application/card', item._key)
                event.dataTransfer.setData(
                  'text/plain',
                  `Moving item: ${item._key}`,
                )
                event.dataTransfer.effectAllowed = 'move'
              }}
            >
              {/* @TODO: draggable handles to resize items */}
              <div
                // draggable
                className="absolute left-0 top-0 h-full w-1 cursor-ew-resize hover:bg-blue-500 transition-all"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default App

function pxToNumber(str) {
  return Number(str.replace(/\D/g, ''))
}

function getPaddingMap(element) {
  if (!element) return { top: 0, right: 0, bottom: 0, left: 0 }

  const styles = window.getComputedStyle(element)

  return {
    top: pxToNumber(styles.paddingTop),
    right: pxToNumber(styles.paddingRight),
    bottom: pxToNumber(styles.paddingBottom),
    left: pxToNumber(styles.paddingLeft),
  }
}
