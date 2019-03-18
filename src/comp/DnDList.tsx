import { observer } from 'mobx-react-lite'
import React, { useEffect, useState } from 'react'
import cn from 'classnames'
import { observable } from 'mobx'

class DnDState {
  @observable di: any = null
  @observable px = 0
  @observable py = 0
}

type DnDItemProps = {
  state: DnDState
  item: any
  children: React.ReactNode
}

function DnDItem({ state, item, children }: DnDItemProps) {
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
    >
      {children}
    </div>
  )
}

export const DnDList = observer(
  ({
    list,
    renderItem,
  }: {
    list: any[]
    renderItem: (item: any, idx: number) => React.ReactNode
  }) => {
    const [state] = useState(() => new DnDState())

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
            <DnDItem
              key={idx}
              item={item}
              state={state}
              children={renderItem(item, idx)}
            />
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
