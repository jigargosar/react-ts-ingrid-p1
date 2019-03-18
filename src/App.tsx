import React, { Dispatch, SetStateAction, useMemo, useState } from 'react'
import faker from 'faker'
import nanoid from 'nanoid'
import { head, makeBy } from 'fp-ts/lib/Array'
import { fromNullable, Option, some } from 'fp-ts/lib/Option'
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

type NodeListItemProps = {
  node: NodeModel
  isSelected: boolean
  effects: Effects
}

const NodeListItem = observer(
  ({ node, isSelected, effects }: NodeListItemProps) => (
    <div
      className={cn(
        'ph3 pv2 br2',
        isSelected ? 'bg-blue white hover-white-80' : 'hover-bg-black-10',
      )}
      tabIndex={isSelected ? 0 : -1}
      onFocus={() => effects.setSelectedId(node.id)}
    >
      {node.displayTitle}
    </div>
  ),
)

type NodeListProps = {
  state: State
  effects: Effects
}

const NodeList = observer(
  ({ state: { nodeList, selectedId }, effects }: NodeListProps) => (
    <div className="pa3">
      {nodeList.map(node => {
        const selected = selectedId.toUndefined() === node.id

        return (
          <NodeListItem
            key={node.id}
            node={node}
            isSelected={selected}
            effects={effects}
          />
        )
      })}
    </div>
  ),
)

function getCached(key: string) {
  return fromNullable(localStorage.getItem(key)).map(str => {
    try {
      return JSON.parse(str)
    } catch (e) {
      console.error(e)
      return null
    }
  })
}

class State {
  nodeList: NodeModel[]
  selectedId: Option<string>

  constructor(nodeList: NodeModel[], selectedId: Option<string>) {
    this.nodeList = nodeList
    this.selectedId = selectedId
  }
}

type Effects = { setSelectedId: (nodeId: string) => void }

function getInitialState(): State {
  const nodeList = makeBy(10, () => new NodeModel())
  return new State(nodeList, head(nodeList).map(_ => _.id))
}

type SetState = Dispatch<SetStateAction<State>>

function useActions(setState: SetState) {
  return useMemo(() => {
    return {
      setSelectedId(sid: string) {
        setState(os => ({
          ...os,
          selectedId: some(sid),
        }))
      },
    }
  }, [])
}

const App = observer(() => {
  const [state, setState] = useState(getInitialState)

  const effects = useActions(setState)

  return (
    <div className="min-vh-100">
      <NodeList state={state} effects={effects} />
    </div>
  )
})

export default App
