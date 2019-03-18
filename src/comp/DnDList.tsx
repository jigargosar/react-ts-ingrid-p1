import { observer, useObservable } from 'mobx-react-lite'
import React, { useEffect } from 'react'
import cn from 'classnames'

export const DnDList = observer(
  ({
    list,
    renderItem,
  }: {
    list: any[]
    renderItem: (item: any, idx: number) => React.ReactNode
  }) => {
    const state = useObservable({ di: null, px: 0, py: 0 })

    useEffect(() => {
      function mouseUpListener(e: MouseEvent) {
        state.di = null
      }

      function mouseMoveListener(e: MouseEvent) {
        if (state.di) {
          state.px = e.pageX
          state.py = e.pageY
        }
      }

      window.addEventListener('mouseup', mouseUpListener)
      window.addEventListener('mousemove', mouseMoveListener)
      return () => {
        window.removeEventListener('mouseup', mouseUpListener)
        window.removeEventListener('mousemove', mouseMoveListener)
      }
    }, [])

    const isDragging = !!state.di
    return (
      <div className={cn('relative', { 'us-none': isDragging })}>
        {list.map((item, idx) => {
          return (
            <div
              className={cn({ 'o-30': item === state.di })}
              onMouseDown={e => {
                e.persist()
                console.log(`e`, e)
                state.di = item
                state.px = e.pageX
                state.py = e.pageY
              }}
              key={idx}
            >
              {renderItem(item, idx)}
            </div>
          )
        })}
        {isDragging && (
          <div
            className="absolute"
            style={{ left: state.px, top: state.py }}
          >
            {renderItem(state.di, -1)}
          </div>
        )}
      </div>
    )
  },
)
