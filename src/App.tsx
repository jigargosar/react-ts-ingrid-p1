import React from 'react'
import faker from 'faker'
import nanoid from 'nanoid'
import { head, makeBy } from 'fp-ts/lib/Array'
import { Option } from 'fp-ts/lib/Option'

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

type NodeListItemProps = { node: NodeModel; isSelected: boolean }

function NodeListItem({ node, isSelected }: NodeListItemProps) {
  return (
    <div className="ph3 pv2 br2 hover-bg-black-10">
      {node.displayTitle}
    </div>
  )
}

type NodeListProps = { nodeList: NodeModel[]; selectedId: Option<string> }

function NodeList({ nodeList, selectedId }: NodeListProps) {
  return (
    <div className="pa3">
      {nodeList.map(node => (
        <NodeListItem
          key={node.id}
          node={node}
          isSelected={selectedId.toUndefined() === node.id}
        />
      ))}
    </div>
  )
}

function App() {
  const nodeList = makeBy(10, () => new NodeModel())

  const maybeFirst = head(nodeList)
  const selectedId = maybeFirst.map(_ => _.id)

  return (
    <div className="min-vh-100">
      <NodeList nodeList={nodeList} selectedId={selectedId} />
    </div>
  )
}

export default App
