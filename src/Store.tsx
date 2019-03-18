import { useState } from 'react'
import { action, observable } from 'mobx'
import nanoid from 'nanoid'
import faker from 'faker'
import { makeBy } from 'fp-ts/lib/Array'

// configure({ enforceActions: 'always', computedRequiresReaction: true })

export class NodeModel {
  @observable readonly _id: string
  @observable title: string
  @observable childIds: string[]
  @observable collapsed: boolean

  constructor(id?: string, title?: string) {
    this._id = id || `id_${nanoid()}`
    this.title = title || faker.name.lastName()
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

  static readonly rootNodeId = 'id_root_node'

  static getOrCreateRootNode() {
    if (!NodeModel._rootNode) {
      NodeModel._rootNode = new NodeModel(NodeModel.rootNodeId, 'Root')
    }
    return NodeModel._rootNode
  }

  appendChildId(id: string) {
    this.childIds.push(id)
  }
}

export class Store {
  @observable byId: { [index: string]: NodeModel } = {}
  @observable nodeList: NodeModel[]
  @observable selectedId: string
  private constructor(nodeList: NodeModel[]) {
    this.nodeList = nodeList
    this.selectedId = NodeModel.rootNodeId
    this.registerNode(NodeModel.getOrCreateRootNode())
    this.appendNewChild()
    this.appendNewChild()
    this.getById = this.getById.bind(this)
  }

  @action.bound
  private registerNode(node: NodeModel) {
    this.byId[node.id] = node
  }

  getChildrenOf(node: NodeModel) {
    return node.childIds.map(this.getById)
  }

  getById(id: string) {
    return this.byId[id]
  }

  get rootNode() {
    return this.byId[NodeModel.rootNodeId]
  }

  @action.bound
  setSelectedId(sid: string) {
    this.selectedId = sid
  }

  get selectedNode() {
    return this.getById(this.selectedId)
  }

  @action.bound
  appendNewChild() {
    const newNode = NodeModel.createNew()
    this.registerNode(newNode)
    this.selectedNode.appendChildId(newNode.id)
    this.setSelectedId(newNode.id)
  }

  isNodeSelected(node: NodeModel) {
    return node.id === this.selectedId
  }

  @action
  static create(): Store {
    const nodeList = makeBy(10, NodeModel.createNew)
    return new Store(nodeList)
  }
}

export function useAppStore() {
  const [store] = useState(Store.create)
  return store
}
