import React from 'react'
import faker from 'faker'
import nanoid from 'nanoid'

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

  set title(value: string) {
    this._title = value
  }

  get displayTitle() {
    return this._title
  }
}

function App() {
  const rootNode = new Node()

  return <div className="min-vh-100">HW2</div>
}

export default App
