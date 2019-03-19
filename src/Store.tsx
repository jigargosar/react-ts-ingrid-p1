import { useEffect, useState } from 'react'
import { action, observable, values } from 'mobx'
import nanoid from 'nanoid'
import faker from 'faker'
import ow from 'ow'
import isHotkey from 'is-hotkey'

// configure({ enforceActions: 'always', computedRequiresReaction: true })

export class NodeModel {
  @observable readonly _id: string
  @observable title: string
  @observable childIds: string[]
  @observable collapsed: boolean
  constructor(
    id?: string,
    title?: string,
    childIds?: string[],
    collapsed?: boolean,
  ) {
    this._id = id || `id_${nanoid()}`
    this.title = title || faker.name.lastName()
    this.childIds = childIds || []
    this.collapsed = collapsed || false
  }

  toJSON() {
    return {
      _id: this.id,
      title: this.title,
      childIds: this.childIds,
      collapsed: this.collapsed,
    }
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
    return idx
  }

  get childCount() {
    return this.childIds.length
  }

  insertChildIdAt(idx: number, childId: string) {
    ow(idx, ow.number.integer.inRange(0, this.childCount))
    this.childIds.splice(idx, 0, childId)
  }

  getChildIdAt(idx: number) {
    ow(idx, ow.number.integer.greaterThanOrEqual(0))
    return this.childIds[idx]
  }

  get maybeFirstChildId() {
    return this.childIds.length > 0 ? this.childIds[0] : null
  }

  removeChildId(childId: string) {
    ow(this.childIds, ow.array.includes(childId))
    const idx = this.childIds.findIndex(cid => cid === childId)
    this.childIds.splice(idx, 1)
  }

  get hasChildren() {
    return this.childCount > 0
  }

  get hasVisibleChildren() {
    return this.hasChildren && !this.collapsed
  }

  get maybeLastVisibleChildId() {
    return this.hasVisibleChildren && this.childIds[this.childCount - 1]
  }

  maybeNextSiblingId(childId: string) {
    const idx = this.indexOfChildId(childId)

    return idx < this.childCount - 1 ? this.getChildIdAt(idx + 1) : null
  }
  collapse() {
    this.collapsed = true
  }

  expand() {
    this.collapsed = false
  }

  get canCollapse() {
    return this.hasVisibleChildren
  }

  get canExpand() {
    return this.hasChildren && this.collapsed
  }
}

export class Store {
  @observable byId: { [index: string]: NodeModel }
  @observable selectedId: string

  private constructor(
    byId: { [index: string]: NodeModel },
    selectedId: string,
  ) {
    this.byId = byId
    this.selectedId = selectedId
    this.maybeNodeWithId = this.maybeNodeWithId.bind(this)
  }

  @action
  static create(): Store {
    const store = new Store({}, NodeModel.rootNodeId)
    store.registerNode(NodeModel.getOrCreateRootNode())
    store.appendNewChild()
    store.attemptGoUp()
    store.appendNewChild()
    return store
  }

  @action
  static fromJSON() {}

  toJSON() {
    return {
      nodes: Object.values(this.byId).map(node => node.toJSON()),
      selectedId: this.selectedId,
    }
  }

  private registerNode(node: NodeModel) {
    this.byId[node.id] = node
  }

  public getVisibleChildrenOf(node: NodeModel) {
    return node.hasVisibleChildren ? this.getChildNodesOf(node) : []
  }

  private getChildNodesOf(node: NodeModel) {
    return node.childIds.map(this.maybeNodeWithId)
  }

  private maybeNodeWithId(id: string) {
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
    return this.maybeNodeWithId(this.selectedId)
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
    this.parentOfSelected.insertChildIdAt(
      this.selectedNodeIdx + 1,
      newNode.id,
    )
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
    const parentId = this.maybeParentIdOf(this.selectedNode)
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

  private maybeParentIdOf(node: NodeModel) {
    return this.idToPidLookup[node.id]
  }

  private getParentOf(node: NodeModel) {
    const pid = this.maybeParentIdOf(node)
    const parentNode = this.maybeNodeWithId(pid)
    if (!parentNode) {
      console.error('getParentOf', node, 'pid', pid, parentNode)
      throw new Error('Invariant Failed.')
    }
    return parentNode
  }

  private get maybePrevSiblingId() {
    if (this.selectedNodeIdx > 0) {
      return this.parentOfSelected.getChildIdAt(this.selectedNodeIdx - 1)
    }
    return null
  }

  private get maybeNextSiblingIdOfSelected() {
    return this.selectedNodeIdx < this.parentOfSelected.childCount - 1
      ? this.parentOfSelected.getChildIdAt(this.selectedNodeIdx + 1)
      : null
  }

  private maybeNextSiblingIdOf(node: NodeModel) {
    const maybeParent = this.maybeParentOf(node)
    return maybeParent && maybeParent.maybeNextSiblingId(node.id)
  }

  private get maybeParentIdOfSelected() {
    return this.maybeParentIdOf(this.selectedNode)
  }

  @action.bound
  goPrev() {
    if (this.isSelectedNodeRoot) return

    const maybeId = this.maybePrevSiblingId

    this.setSelectedId(
      (maybeId && this.getLastVisibleDescendentIdOrSelf(maybeId)) ||
        this.maybeParentIdOfSelected ||
        this.selectedId,
    )
  }

  private get maybeFirstVisibleChildId() {
    return (
      this.selectedNode.hasVisibleChildren &&
      this.selectedNode.maybeFirstChildId
    )
  }

  private maybeParentOf(node: NodeModel) {
    const maybePid = this.maybeParentIdOf(node)
    return maybePid && this.maybeNodeWithId(maybePid)
  }

  private maybeParentIdOfId(nodeId: string) {
    return this.idToPidLookup[nodeId]
  }

  private maybeNextSiblingIdOfFirstAncestorOfNodeId(
    nodeId: string,
  ): string | null {
    const maybeParentId = this.maybeParentIdOfId(nodeId)
    if (maybeParentId) {
      const parent = this.maybeNodeWithId(maybeParentId)
      const maybeId = this.maybeNextSiblingIdOf(parent)
      if (maybeId) {
        return maybeId
      } else {
        return this.maybeNextSiblingIdOfFirstAncestorOfNodeId(parent.id)
      }
    } else {
      return null
    }
  }

  @action.bound
  goNext() {
    this.setSelectedId(
      this.maybeFirstVisibleChildId ||
        this.maybeNextSiblingIdOfSelected ||
        this.maybeNextSiblingIdOfFirstAncestorOfNodeId(this.selectedId) ||
        this.selectedId,
    )
  }

  private get maybePrevSibling() {
    return (
      this.maybePrevSiblingId &&
      this.maybeNodeWithId(this.maybePrevSiblingId)
    )
  }

  @action.bound
  indent() {
    if (this.isSelectedNodeRoot) return

    const newParent = this.maybePrevSibling
    if (newParent) {
      this.parentOfSelected.removeChildId(this.selectedId)
      newParent.appendChildId(this.selectedId)
    }
  }

  private getLastVisibleDescendentIdOrSelf(nodeId: string): string {
    const node = this.maybeNodeWithId(nodeId)
    if (node) {
      return node.maybeLastVisibleChildId
        ? this.getLastVisibleDescendentIdOrSelf(
            node.maybeLastVisibleChildId,
          )
        : nodeId
    } else {
      return nodeId
    }
  }

  @action.bound
  outdent() {
    if (
      this.isSelectedNodeRoot ||
      this.rootNode === this.maybeParentOf(this.selectedNode)
    )
      return

    const oldParent = this.maybeParentOf(this.selectedNode)
    const grandParent = this.maybeParentOf(oldParent)

    oldParent.removeChildId(this.selectedId)

    grandParent.insertChildIdAt(
      grandParent.indexOfChildId(oldParent.id) + 1,
      this.selectedId,
    )
  }

  @action.bound
  collapseOrParent() {
    if (this.selectedNode.canCollapse) {
      this.selectedNode.collapse()
    } else {
      this.attemptGoUp()
    }
  }

  @action.bound
  expandOrNext() {
    if (this.selectedNode.canExpand) {
      this.selectedNode.expand()
    } else {
      this.goNext()
    }
  }
}

export function useAppStore() {
  const [store] = useState(Store.create)
  useEffect(() => {
    function kdl(e: KeyboardEvent) {
      const km = [
        { key: 'enter', handler: () => store.addNewNode() },
        { key: 'up', handler: () => store.goPrev() },
        { key: 'down', handler: () => store.goNext() },
        { key: 'tab', handler: () => store.indent() },
        { key: 'shift+tab', handler: () => store.outdent() },
        { key: 'left', handler: () => store.collapseOrParent() },
        { key: 'right', handler: () => store.expandOrNext() },
      ]

      km.forEach(({ key, handler }) => {
        if (isHotkey(key, e)) {
          e.preventDefault()
          handler()
        }
      })
    }
    window.addEventListener('keydown', kdl)
    return () => {
      window.removeEventListener('keydown', kdl)
    }
  }, [])
  return store
}
