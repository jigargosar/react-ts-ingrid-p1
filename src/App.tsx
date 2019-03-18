import React, { useState } from 'react'
import faker from 'faker'
import nanoid from 'nanoid'
import { head, makeBy } from 'fp-ts/lib/Array'
import { Option, some } from 'fp-ts/lib/Option'
import cn from 'classnames'
import { observer } from 'mobx-react-lite'
import { observable } from 'mobx'

class NodeModel {
  @observable private readonly _id: string
  @observable private _title: string

  constructor() {
    this._id = `id_${nanoid()}`
    this._title = faker.name.lastName()
  }

  get id() {
    return this._id
  }

  setTitle(value: string) {
    this._title = value
  }

  get displayTitle() {
    return this._title
  }
}

class Store {
  @observable nodeList: NodeModel[]
  @observable selectedId: Option<string>

  constructor(nodeList: NodeModel[], selectedId: Option<string>) {
    this.nodeList = nodeList
    this.selectedId = selectedId
  }

  setSelectedId(sid: string) {
    this.selectedId = some(sid)
  }
}

function getInitialState(): Store {
  const nodeList = makeBy(10, () => new NodeModel())
  return new Store(nodeList, head(nodeList).map(_ => _.id))
}

function useAppStore() {
  const [store] = useState(getInitialState)
  return store
}

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
