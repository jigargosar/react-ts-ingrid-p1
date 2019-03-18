import React, { useMemo, useState } from 'react'
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
  setSelectedId: (nodeId: string) => void
}

function NodeListItem({
  node,
  isSelected,
  setSelectedId,
}: NodeListItemProps) {
  return (
    <div
      className={cn(
        'ph3 pv2 br2',
        isSelected ? 'bg-blue white hover-white-80' : 'hover-bg-black-10',
      )}
      tabIndex={isSelected ? 0 : -1}
      onFocus={() => setSelectedId(node.id)}
    >
      {node.displayTitle}
    </div>
  )
}

type NodeListProps = {
  nodeList: NodeModel[]
  selectedId: Option<string>
  setSelectedId: (nodeId: string) => void
}

function NodeList({ nodeList, selectedId, setSelectedId }: NodeListProps) {
  return (
    <div className="pa3">
      {nodeList.map(node => {
        const selected = selectedId.toUndefined() === node.id

        return (
          <NodeListItem
            key={node.id}
            node={node}
            isSelected={selected}
            setSelectedId={setSelectedId}
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

function getInitialState(): State {
  const nodeList = makeBy(10, () => new NodeModel())
  return { nodeList, selectedId: head(nodeList).map(_ => _.id) }
}

function App() {
  const [state, setState] = useState(getInitialState)
  const [nodeList] = useState(() => makeBy(10, () => new NodeModel()))

  const maybeFirst = head(nodeList)

  const [selectedId, setSelectedId] = useState(() =>
    maybeFirst.map(_ => _.id),
  )

  const effects = useMemo(() => {
    return {
      setSelectedId(sid: string) {
        setState(os => {
          return {
            ...os,
            selectedId: some(sid),
          }
        })
      },
    }
  }, [])

  return (
    <div className="min-vh-100">
      <NodeList
        nodeList={nodeList}
        selectedId={selectedId}
        setSelectedId={id => setSelectedId(some(id))}
      />
    </div>
  )
}

export default App
