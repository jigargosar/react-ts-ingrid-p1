import { useEffect, useState } from 'react'
import { action, autorun, observable } from 'mobx'
import isHotkey from 'is-hotkey'
import { getCached, setCache } from './cache-helpers'
import { useDisposable } from 'mobx-react-lite'
import { NodeModel, NodeModelJSON } from './model/NodeModel'
import { NodeCollection } from './model/NodeCollection'

// configure({ enforceActions: 'always', computedRequiresReaction: true })

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

    store.addNewNode()
    store.attemptGoUp()
    store.addNewNode()
    return store
  }

  private static fromJSON(json: {
    nodes: NodeModelJSON[]
    selectedId: string
  }) {
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

  private get maybeParentOfSelected() {
    return this.maybeParentOf(this.selectedNode)
  }

  private get isSelectedNodeRoot() {
    return this.selectedNode === this.rootNode
  }

  public isNodeSelected(node: NodeModel) {
    return node.id === this.selectedId
  }

  @action.bound
  addNewNode() {
    const newNode = NodeModel.createNew()
    this.registerNode(newNode)
    const maybeParent = this.maybeParentOfSelected
    if (maybeParent) {
      maybeParent.insertNewChildIdAfter(this.selectedId, newNode.id)
    } else {
      this.selectedNode.appendNewChildId(newNode.id)
    }
    this.setSelectedId(newNode.id)
  }

  private attemptGoUp() {
    const parentId = this.maybeParentIdOf(this.selectedNode)
    if (parentId) {
      this.setSelectedId(parentId)
    }
  }

  private maybeParentIdOf(node: NodeModel) {
    return this.nodeCollection.maybeParentIdOf(node)
  }

  private get maybePrevSiblingIdOfSelected() {
    return (
      this.maybeParentOfSelected &&
      this.maybeParentOfSelected.maybePrevChildId(this.selectedId)
    )
  }

  private get maybeNextSiblingIdOfSelected() {
    return (
      this.maybeParentOfSelected &&
      this.maybeParentOfSelected.maybeNextChildId(this.selectedId)
    )
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
    const maybeId = this.maybePrevSiblingIdOfSelected

    this.setSelectedId(
      (maybeId && this.getLastVisibleDescendentIdOrSelf(maybeId)) ||
        this.maybeParentIdOfSelected ||
        this.selectedId,
    )
  }

  private maybeParentOf(node: NodeModel) {
    const maybePid = this.maybeParentIdOf(node)
    return maybePid && this.maybeNodeWithId(maybePid)
  }

  private maybeParentIdOfId(nodeId: string) {
    return this.nodeCollection.maybeParentIdOfId(nodeId)
  }

  private maybeNextSiblingIdOfFirstAncestor(
    nodeId: string,
  ): string | null {
    const maybeParentId = this.maybeParentIdOfId(nodeId)
    if (maybeParentId) {
      const parent = this.maybeNodeWithId(maybeParentId)
      const maybeId = this.maybeNextSiblingIdOf(parent)
      return maybeId
        ? maybeId
        : this.maybeNextSiblingIdOfFirstAncestor(parent.id)
    } else {
      return null
    }
  }

  @action.bound
  goNext() {
    this.setSelectedId(
      this.selectedNode.maybeFirstVisibleChildId ||
        this.maybeNextSiblingIdOfSelected ||
        this.maybeNextSiblingIdOfFirstAncestor(this.selectedId) ||
        this.selectedId,
    )
  }

  private get maybePrevSibling() {
    return (
      this.maybePrevSiblingIdOfSelected &&
      this.maybeNodeWithId(this.maybePrevSiblingIdOfSelected)
    )
  }

  @action.bound
  indent() {
    const oldParent = this.maybeParentOfSelected
    const newParent = this.maybePrevSibling
    if (oldParent && newParent) {
      oldParent.removeChildId(this.selectedId)
      newParent.appendNewChildId(this.selectedId)
      newParent.expand()
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
