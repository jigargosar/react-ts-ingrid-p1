import React from 'react'
import faker from 'faker'

class Node {
  private title: string

  constructor() {
    this.title = faker.name.lastName()
  }

  get displayTitle() {
    return this.title
  }
}

function App() {
  const rootNode = new Node()

  return <div className="min-vh-100">HW2</div>
}

export default App
