import { useState } from 'react'
import { action, observable, values } from 'mobx'
import nanoid from 'nanoid'
import faker from 'faker'
import ow from 'ow'

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

  indexOfChildId(childId: string) {
    const idx = this.childIds.indexOf(childId)
    ow(idx, ow.number.integer.greaterThanOrEqual(0))
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

  private registerNode(node: NodeModel) {
    this.byId[node.id] = node
  }

  public getChildrenOf(node: NodeModel) {
    return node.childIds.map(this.getNodeById)
  }

  private getNodeById(id: string) {
    return this.byId[id]
  }

  public get rootNode() {
    return this.byId[NodeModel.rootNodeId]
  }

  @action.bound
  setSelectedId(sid: string) {
    this.selectedId = sid
  }

  private get selectedNode() {
    return this.getNodeById(this.selectedId)
  }

  private get parentOfSelected() {
    return this.getParentOf(this.selectedNode)
  }

  private get selectedNodeIdx() {
    return this.parentOfSelected.indexOfChildId(this.selectedId)
  }

  private get isSelectedNodeRoot() {
    return this.selectedNode === this.rootNode
  }

  public isNodeSelected(node: NodeModel) {
    return node.id === this.selectedId
  }

  private appendNewChild() {
    const newNode = NodeModel.createNew()
    this.registerNode(newNode)
    this.selectedNode.appendChildId(newNode.id)
    this.setSelectedId(newNode.id)
  }

  private appendNewSibling() {
    const newNode = NodeModel.createNew()
    this.registerNode(newNode)
    this.selectedNode.appendChildId(newNode.id)
    this.setSelectedId(newNode.id)
  }

  @action.bound
  addNewNode() {
    if (this.isSelectedNodeRoot) {
      this.appendNewChild()
    } else {
      this.appendNewSibling()
    }
  }

  @action.bound
  attemptGoUp() {
    const parentId = this.getParentIdOf(this.selectedNode)
    if (parentId) {
      this.setSelectedId(parentId)
    }
  }

  private get idToPidLookup() {
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

  @action
  static create(): Store {
    return new Store()
  }
}

export function useAppStore() {
  const [store] = useState(Store.create)
  return store
}
