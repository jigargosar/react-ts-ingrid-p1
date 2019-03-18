import { useState } from 'react'
import { action, observable } from 'mobx'
import nanoid from 'nanoid'
import faker from 'faker'
import { head, makeBy } from 'fp-ts/lib/Array'
import { Option, some } from 'fp-ts/lib/Option'

// configure({ enforceActions: 'always', computedRequiresReaction: true })

export class NodeModel {
  @observable private readonly _id: string
  @observable title: string

  private constructor() {
    this._id = `id_${nanoid()}`
    this.title = faker.name.lastName()
  }

  get id() {
    return this._id
  }

  get displayTitle() {
    return this.title
  }

  static createNew() {
    return new NodeModel()
  }
}

export class Store {
  @observable nodeList: NodeModel[]
  @observable selectedId: Option<string>

  private constructor(nodeList: NodeModel[], selectedId: Option<string>) {
    this.nodeList = nodeList
    this.selectedId = selectedId
  }

  @action.bound
  setSelectedId(sid: string) {
    this.selectedId = some(sid)
  }

  isNodeSelected(node: NodeModel) {
    return node.id === this.selectedId.toUndefined()
  }

  @action
  static create(): Store {
    const nodeList = makeBy(10, NodeModel.createNew)
    return new Store(nodeList, head(nodeList).map(_ => _.id))
  }
}

export function useAppStore() {
  const [store] = useState(Store.create)
  return store
}
