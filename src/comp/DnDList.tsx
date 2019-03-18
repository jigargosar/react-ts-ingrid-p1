import { observer } from 'mobx-react-lite'
import React, { useEffect, useRef, useState } from 'react'
import cn from 'classnames'
import { observable } from 'mobx'

class DnDState {
  @observable _di: any = null
  @observable px = 0
  @observable py = 0
  @observable _overItem: any = null
  @observable _insertAtBottom = true

  get isDraggingAny() {
    return !!this._di
  }
  isDraggingItem(item: any) {
    return this.isDraggingAny && this._di === item
  }

  isDraggedOver(item: any) {
    return this.isDraggingAny && this._overItem === item
  }

  startDraggingItem(item: any) {
    this._di = item
  }

  stopDragging() {
    this._di = null
  }

  get draggedItem() {
    if (!this.isDraggingAny) {
      throw new Error('Not Dragging Any')
    }
    return this._di
  }

  draggableHandlersForItem(item: any, ref: React.MutableRefObject<any>) {
    return {
      onMouseDown: (e: React.MouseEvent) => {
        if (this.isDraggingAny) return
        e.persist()
        console.log(`e`, e)
        this.startDraggingItem(item)
        this.px = e.pageX
        this.py = e.pageY
      },
      onMouseMove: (e: React.MouseEvent) => {
        if (!this.isDraggingAny) return
        this._overItem = item
        const el: HTMLDivElement | undefined = ref.current
        if (el) {
          const clientRect = el.getBoundingClientRect()
          e.persist()
          const clientCY = clientRect.top + clientRect.height / 2
          console.log(`clientRect`, clientRect.top, clientCY, e.clientY)
          this._insertAtBottom = e.clientY >= clientCY
        }
      },
      onMouseLeave: (e: React.MouseEvent) => {
        if (!this.isDraggingAny) return
        if (this._overItem === item) {
          this._overItem = null
        }
      },
    }
  }
}

type DnDItemProps = {
  state: DnDState
  item: any
  children: React.ReactNode
}

function DnDItem({ state, item, children }: DnDItemProps) {
  const isBeingDragged = state.isDraggingItem(item)
  const isBeingDraggedOver = state.isDraggedOver(item)
  const shouldInsertAtBottom = state._insertAtBottom

  const ref: React.MutableRefObject<any> = useRef()
  return (
    <div
      ref={ref}
      className={cn(
        { 'o-30': isBeingDragged },
        { 'bw2 b--red': isBeingDraggedOver },
        isBeingDraggedOver ? (shouldInsertAtBottom ? 'bb' : 'bt') : '',
      )}
      {...state.draggableHandlersForItem(item, ref)}
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
        state.stopDragging()
      }

      function mouseMoveListener(e: MouseEvent) {
        if (state.isDraggingAny) {
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

    return (
      <div className={cn('relative', { 'us-none': state.isDraggingAny })}>
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
        {state.isDraggingAny && (
          <div
            className="absolute"
            style={{ left: state.px, top: state.py }}
          >
            {renderItem(state.draggedItem, -1)}
          </div>
        )}
      </div>
    )
  },
)
