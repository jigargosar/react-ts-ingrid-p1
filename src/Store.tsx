import { useState } from 'react'
import { action, observable, values } from 'mobx'
import nanoid from 'nanoid'
import faker from 'faker'

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
  @observable selectedId: string
  private constructor() {
    this.selectedId = NodeModel.rootNodeId
    this.registerNode(NodeModel.getOrCreateRootNode())
    this.appendNewChild()
    this.attemptGoUp()
    this.appendNewChild()
    this.getNodeById = this.getNodeById.bind(this)
  }

  @action.bound
  private registerNode(node: NodeModel) {
    this.byId[node.id] = node
  }

  getChildrenOf(node: NodeModel) {
    return node.childIds.map(this.getNodeById)
  }

  getNodeById(id: string) {
    return this.byId[id]
  }

  get rootNode() {
    return this.byId[NodeModel.rootNodeId]
  }

  @action.bound
  setSelectedId(sid: string) {
    this.selectedId = sid
  }

  private get selectedNode() {
    return this.getNodeById(this.selectedId)
  }

  private get selectedNodeIdx() {
    return this.selectedNode
  }

  @action.bound
  appendNewChild() {
    const newNode = NodeModel.createNew()
    this.registerNode(newNode)
    this.selectedNode.appendChildId(newNode.id)
    this.setSelectedId(newNode.id)
  }

  private get isSelectedNodeRoot() {
    return this.selectedNode === this.rootNode
  }

  @action.bound
  appendNew() {
    if (this.isSelectedNodeRoot) {
      this.appendNewChild()
    } else {
      this.appendNewSibling()
    }
  }

  private appendNewSibling() {
    const newNode = NodeModel.createNew()
    this.registerNode(newNode)
    this.selectedNode.appendChildId(newNode.id)
    this.setSelectedId(newNode.id)
  }

  @action.bound
  attemptGoUp() {
    const parentId = this.getParentIdOf(this.selectedNode)
    if (parentId) {
      this.setSelectedId(parentId)
    }
  }

  get idToPidLookup() {
    return values(this.byId).reduce((acc, node) => {
      node.childIds.forEach((cid: string) => {
        acc[cid] = node.id
      })
      return acc
    }, {})
  }

  private getParentIdOf(node: NodeModel) {
    return this.idToPidLookup[node.id]
  }

  private getParentOf(node: NodeModel) {
    const pid = this.getParentIdOf(node)
    const parentNode = this.getNodeById(pid)
    if (!parentNode) {
      console.error('getParentIdOf', node, 'pid', pid, parentNode)
      throw new Error('Invariant Failed.')
    }
    return parentNode
  }

  isNodeSelected(node: NodeModel) {
    return node.id === this.selectedId
  }

  @action
  static create(): Store {
    return new Store()
  }
}

export function useAppStore() {
  const [store] = useState(Store.create)
  return store
}
