import { useState } from 'react'
import { action, configure, observable } from 'mobx'
import nanoid from 'nanoid'
import faker from 'faker'
import { head, makeBy } from 'fp-ts/lib/Array'
import { Option, some } from 'fp-ts/lib/Option'

configure({ enforceActions: 'always', computedRequiresReaction: true })

export class NodeModel {
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

export class Store {
  @observable nodeList: NodeModel[]
  @observable selectedId: Option<string>

  constructor(nodeList: NodeModel[], selectedId: Option<string>) {
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
  static createStore(): Store {
    const nodeList = makeBy(10, () => new NodeModel())
    return new Store(nodeList, head(nodeList).map(_ => _.id))
  }
}

export function useAppStore() {
  const [store] = useState(Store.createStore)
  return store
}
