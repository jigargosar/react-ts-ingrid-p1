import { useEffect, useState } from 'react'
import { action, autorun, observable, values } from 'mobx'
import isHotkey from 'is-hotkey'
import { getCached, setCache } from './cache-helpers'
import { useDisposable } from 'mobx-react-lite'
import { NodeModel, NodeModelJSON } from './model/NodeModel'

// configure({ enforceActions: 'always', computedRequiresReaction: true })

class NodeCollection {
  @observable byId: { [index: string]: NodeModel }
  constructor(byId: { [index: string]: NodeModel }) {
    this.byId = byId
  }

  toJSON() {
    return Object.values(this.byId).map(node => node.toJSON())
  }

  static fromJSON(json: NodeModelJSON[]) {
    const byId = json.reduce(
      (
        acc: { [index: string]: NodeModel },
        { _id, title, childIds, collapsed },
      ) => {
        acc[_id] = NodeModel.createNew(_id, title, childIds, collapsed)
        return acc
      },
      {},
    )
    return new NodeCollection(byId)
  }

  registerNode(node: NodeModel) {
    this.byId[node.id] = node
  }

  public getVisibleChildrenOf(node: NodeModel) {
    return node.hasVisibleChildren ? this.getChildNodesOf(node) : []
  }

  private getChildNodesOf(node: NodeModel) {
    return node.childIds.map(childNode => this.maybeNodeWithId(childNode))
  }

  maybeNodeWithId(id: string) {
    return this.byId[id]
  }

  public get rootNode() {
    return this.byId[NodeModel.rootNodeId]
  }

  private get idToPidLookup() {
    return values(this.byId).reduce((acc, node) => {
      node.childIds.forEach((cid: string) => {
        acc[cid] = node.id
      })
      return acc
    }, {})
  }

  maybeParentIdOfId(nodeId: string) {
    return this.idToPidLookup[nodeId]
  }

  maybeParentIdOf(node: NodeModel) {
    return this.idToPidLookup[node.id]
  }

  private maybeParentOf(node: NodeModel) {
    const pid = this.maybeParentIdOf(node)
    return pid && this.maybeNodeWithId(pid)
  }

  private isRootNode(node: NodeModel) {
    return this.rootNode === node
  }

  static create() {
    const nodeCollection = new NodeCollection({})
    nodeCollection.registerNode(NodeModel.getOrCreateRootNode())
    return nodeCollection
  }
}

export class Store {
  @observable nodeCollection: NodeCollection
  @observable selectedId: string

  private constructor(nodeCollection: NodeCollection, selectedId: string) {
    this.nodeCollection = nodeCollection
    this.selectedId = selectedId
    this.maybeNodeWithId = this.maybeNodeWithId.bind(this)
  }

  @action
  public static create(): Store {
    const store = new Store(NodeCollection.create(), NodeModel.rootNodeId)

    store.appendNewChild()
    store.attemptGoUp()
    store.appendNewChild()
    return store
  }

  private static fromJSON(json: {
    nodes: NodeModelJSON[]
    selectedId: string
  }) {
    const byId = json.nodes.reduce(
      (
        acc: { [index: string]: NodeModel },
        { _id, title, childIds, collapsed },
      ) => {
        acc[_id] = NodeModel.createNew(_id, title, childIds, collapsed)
        return acc
      },
      {},
    )
    return new Store(NodeCollection.fromJSON(json.nodes), json.selectedId)
  }

  @action
  public static fromCache(cachedJSON: any) {
    return cachedJSON ? Store.fromJSON(cachedJSON) : Store.create()
  }

  toJSON() {
    return {
      nodes: this.nodeCollection.toJSON(),
      selectedId: this.selectedId,
    }
  }

  private registerNode(node: NodeModel) {
    this.nodeCollection.registerNode(node)
  }

  public getVisibleChildrenOf(node: NodeModel) {
    return node.hasVisibleChildren ? this.getChildNodesOf(node) : []
  }

  private getChildNodesOf(node: NodeModel) {
    return node.childIds.map(this.maybeNodeWithId)
  }

  private maybeNodeWithId(id: string) {
    return this.nodeCollection.maybeNodeWithId(id)
  }

  public get rootNode() {
    return this.nodeCollection.rootNode
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

  private maybeParentIdOf(node: NodeModel) {
    return this.nodeCollection.maybeParentIdOf(node)
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
    return this.nodeCollection.maybeParentIdOfId(nodeId)
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
  const [store] = useState(() =>
    Store.fromCache(getCached('rts-ingrid-p1')),
  )
  useDisposable(() =>
    autorun(() => {
      setCache('rts-ingrid-p1', store.toJSON())
    }),
  )
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
