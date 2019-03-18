import { useState } from 'react'
import { action, observable } from 'mobx'
import nanoid from 'nanoid'
import faker from 'faker'
import { head, makeBy } from 'fp-ts/lib/Array'
import { Option, some } from 'fp-ts/lib/Option'

// configure({ enforceActions: 'always', computedRequiresReaction: true })

export class NodeModel {
  @observable readonly _id: string
  @observable title: string
  @observable childIds: string[]
  @observable collapsed: boolean

  constructor(id?: string) {
    this._id = id || `id_${nanoid()}`
    this.title = faker.name.lastName()
    this.childIds = []
    this.collapsed = false
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

  private static _rootNode: NodeModel

  static getOrCreateRootNode() {
    if (!NodeModel._rootNode) {
      NodeModel._rootNode = new NodeModel('id_root_node')
    }
    return NodeModel._rootNode
  }
}

export class Store {
  @observable byId: { [index: string]: NodeModel } = {}
  @observable nodeList: NodeModel[]
  @observable selectedId: Option<string>

  private constructor(nodeList: NodeModel[], selectedId: Option<string>) {
    this.nodeList = nodeList
    this.selectedId = selectedId
    const rootNode = NodeModel.getOrCreateRootNode()
    this.byId[rootNode.id] = rootNode
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
