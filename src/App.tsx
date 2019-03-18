import React, { Dispatch, SetStateAction, useMemo, useState } from 'react'
import faker from 'faker'
import nanoid from 'nanoid'
import { head, makeBy } from 'fp-ts/lib/Array'
import { fromNullable, Option, some } from 'fp-ts/lib/Option'
import cn from 'classnames'

class NodeModel {
  private readonly _id: string
  private _title: string

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

function NodeListItem({ node, isSelected, effects }: NodeListItemProps) {
  return (
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
  )
}

type NodeListProps = {
  nodeList: NodeModel[]
  selectedId: Option<string>
  effects: Effects
}

function NodeList({ nodeList, selectedId, effects }: NodeListProps) {
  return (
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
  )
}

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

type State = {
  nodeList: NodeModel[]
  selectedId: Option<string>
}

type Effects = { setSelectedId: (nodeId: string) => void }

function getInitialState(): State {
  const nodeList = makeBy(10, () => new NodeModel())
  return { nodeList, selectedId: head(nodeList).map(_ => _.id) }
}

type SetState = Dispatch<SetStateAction<State>>

function useActions(setState: SetState) {
  return useMemo(() => {
    return {
      setSelectedId(sid: string) {
        setState((os: State) => ({
          nodeList: os.nodeList,
          selectedId: some(sid),
        }))
      },
    }
  }, [])
}

function App() {
  const [state, setState] = useState(getInitialState)

  const effects = useActions(setState)

  return (
    <div className="min-vh-100">
      <NodeList
        nodeList={state.nodeList}
        selectedId={state.selectedId}
        effects={effects}
      />
    </div>
  )
}

export default App
