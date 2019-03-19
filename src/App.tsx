import React from 'react'
import cn from 'classnames'
import { observer } from 'mobx-react-lite'
import { NodeModel, Store, useAppStore } from './Store'

type NodeTreeProps = {
  node: NodeModel
  store: Store
}

function getNodeIcon(node: NodeModel) {
  return node.canCollapse ? '-' : node.canExpand ? '+' : ' '
}

const NodeTree = observer(({ node, store }: NodeTreeProps) => {
  const isSelected = store.isNodeSelected(node)
  return (
    <div className="code">
      <div className="flex">
        <div
          className="flex items-center justify-center"
          style={{ width: '1.5rem' }}
        >
          {getNodeIcon(node)}
        </div>
        <div
          className={cn(
            'outline-0 ph2 br2 pv1',
            isSelected
              ? 'bg-blue white hover-white-80'
              : 'hover-bg-black-10',
          )}
          tabIndex={isSelected ? 0 : -1}
          onFocus={() => store.setSelectedId(node.id)}
        >
          {node.displayTitle}
        </div>
      </div>
      <div className="pl4">
        {store.getVisibleChildrenOf(node).map(childNode => (
          <NodeTree key={childNode.id} node={childNode} store={store} />
        ))}
      </div>
    </div>
  )
})

const App = observer(() => {
  const store = useAppStore()

  return (
    <div className="min-vh-100">
      <div className="pa2">
        <NodeTree node={store.rootNode} store={store} />
      </div>
    </div>
  )
})

export default App
