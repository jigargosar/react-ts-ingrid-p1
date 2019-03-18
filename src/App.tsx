import React from 'react'
import cn from 'classnames'
import { observer } from 'mobx-react-lite'
import { NodeModel, Store, useAppStore } from './Store'

type NodeListItemProps = {
  node: NodeModel
  store: Store
}

const NodeListItem = observer(({ node, store }: NodeListItemProps) => {
  const isSelected = store.isNodeSelected(node)
  return (
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
  )
})

type NodeListProps = {
  store: Store
}

const NodeList = observer(({ store }: NodeListProps) => (
  <div className="pa3">
    {store.nodeList.map(node => (
      <NodeListItem key={node.id} node={node} store={store} />
    ))}
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
