import React from 'react'
import faker from 'faker'

class Node {
  private _title: string

  constructor() {
    this._title = faker.name.lastName()
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
