import React from 'react'
import faker from 'faker'
import nanoid from 'nanoid'
import { times } from 'ramda'

class Node {
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

function NodeView({ node }: { node: Node }) {
  return (
    <div className="ph3 pv2 br2 hover-bg-black-10">
      {node.displayTitle}
    </div>
  )
}

function App() {
  const nodeList = times(() => new Node(), 10)

  return (
    <div className="min-vh-100">
      {nodeList.map(node => (
        <NodeView key={node.id} node={node} />
      ))}
    </div>
  )
}

export default App
