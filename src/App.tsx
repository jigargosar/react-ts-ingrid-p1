import React from 'react'
import cn from 'classnames'
import { observer } from 'mobx-react-lite'
import { NodeModel, Store, useAppStore } from './Store'

type NodeListItemProps = {
  node: NodeModel
  isSelected: boolean
  store: Store
}

const NodeListItem = observer(
  ({ node, isSelected, store }: NodeListItemProps) => (
    <div
      className={cn(
        'ph3 pv2 br2',
        isSelected ? 'bg-blue white hover-white-80' : 'hover-bg-black-10',
      )}
      tabIndex={isSelected ? 0 : -1}
      onFocus={() => store.setSelectedId(node.id)}
    >
      {node.displayTitle}
    </div>
  ),
)

type NodeListProps = {
  store: Store
}

const NodeList = observer(({ store }: NodeListProps) => (
  <div className="pa3">
    {store.nodeList.map(node => {
      const selected = store.selectedId.toUndefined() === node.id

      return (
        <NodeListItem
          key={node.id}
          node={node}
          isSelected={selected}
          store={store}
        />
      )
    })}
  </div>
))

const App = observer(() => {
  const store = useAppStore()

  return (
    <div className="min-vh-100">
      <NodeList store={store} />
    </div>
  )
})

export default App
