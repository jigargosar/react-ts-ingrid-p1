import React from 'react'
import cn from 'classnames'
import { observer } from 'mobx-react-lite'
import { NodeModel, Store, useAppStore } from './Store'
import isHotKey from 'is-hotkey'

type NodeTreeProps = {
  node: NodeModel
  store: Store
}

const NodeTree = observer(({ node, store }: NodeTreeProps) => {
  const isSelected = store.isNodeSelected(node)
  return (
    <>
      <div
        className={cn(
          'pa2 br2',
          isSelected
            ? 'bg-blue white hover-white-80'
            : 'hover-bg-black-10',
        )}
        tabIndex={isSelected ? 0 : -1}
        onFocus={() => store.setSelectedId(node.id)}
        onKeyDown={e => {
          const km = [{ key: 'enter', handler: () => store.addNewNode() }]

          km.forEach(({ key, handler }) => {
            if (isHotKey(key, e.nativeEvent)) {
              e.preventDefault()
              handler()
            }
          })
        }}
      >
        {node.displayTitle}
      </div>
      <div className="pl4">
        {store.getChildrenOf(node).map(childNode => (
          <NodeTree key={childNode.id} node={childNode} store={store} />
        ))}
      </div>
    </>
  )
})

const App = observer(() => {
  const store = useAppStore()

  return (
    <div className="min-vh-100">
      <NodeTree node={store.rootNode} store={store} />
    </div>
  )
})

export default App
