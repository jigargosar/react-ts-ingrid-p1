import React from 'react'
import faker from 'faker'
import nanoid from 'nanoid'
import { head, times } from 'ramda'

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

function NodeListItem({ node }: { node: NodeModel }) {
  return (
    <div className="ph3 pv2 br2 hover-bg-black-10">
      {node.displayTitle}
    </div>
  )
}

function NodeList(props: { nodeList: NodeModel[]; selectedId?: string }) {
  const { nodeList } = props
  return (
    <div className="pa3">
      {nodeList.map(node => (
        <NodeListItem key={node.id} node={node} />
      ))}
    </div>
  )
}

function App() {
  const nodeList = times(() => new NodeModel(), 10)

  const maybeFirst = head(nodeList)
  const selectedId = maybeFirst ? maybeFirst.id : maybeFirst

  return (
    <div className="min-vh-100">
      <NodeList nodeList={nodeList} selectedId={selectedId} />
    </div>
  )
}

export default App
