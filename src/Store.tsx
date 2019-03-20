import { useEffect, useState } from 'react'
import { action, autorun, observable } from 'mobx'
import isHotkey from 'is-hotkey'
import { getCached, setCache } from './cache-helpers'
import { useDisposable } from 'mobx-react-lite'
import { NodeModel, NodeModelJSON } from './model/NodeModel'
import { NodeCollection } from './model/NodeCollection'
import { fromNullable, none, Option } from 'fp-ts/lib/Option'

// configure({ enforceActions: 'always', computedRequiresReaction: true })

type StoreJSON = {
  nodes: NodeModelJSON[]
  selectedId: string
}

export class Store {
  @observable nodeCollection: NodeCollection
  @observable selectedId: string

  private constructor(nodeCollection: NodeCollection, selectedId: string) {
    this.nodeCollection = nodeCollection
    this.selectedId = selectedId
  }

  private static create(): Store {
    const store = new Store(NodeCollection.create(), NodeModel.rootNodeId)

    store.addNewNode()
    store.attemptGoUp()
    store.addNewNode()
    return store
  }

  private static fromJSON(json: StoreJSON) {
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
    return this.nodeCollection.getVisibleChildrenOf(node)
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

  private get nullableParentOfSelected() {
    return this.nodeCollection.nullableParentOf(this.selectedNode)
  }

  private get maybeParentOfSelected() {
    return this.nodeCollection.maybeParentOf(this.selectedNode)
  }

  private get isSelectedNodeRoot() {
    return this.nodeCollection.isRootNode(this.selectedNode)
  }

  public isNodeSelected(node: NodeModel) {
    return node.id === this.selectedId
  }

  @action.bound
  addNewNode() {
    const newNode = NodeModel.createNew()
    this.registerNode(newNode)
    const maybeParent = this.nullableParentOfSelected
    if (maybeParent) {
      maybeParent.insertNewChildIdAfter(this.selectedId, newNode.id)
    } else {
      this.selectedNode.appendNewChildId(newNode.id)
    }
    this.setSelectedId(newNode.id)
  }

  private attemptGoUp() {
    const parent = this.nullableParentOfSelected
    if (parent) {
      this.setSelectedId(parent.id)
    }
  }

  private get maybePrevSiblingIdOfSelected() {
    return (
      this.nullableParentOfSelected &&
      this.nullableParentOfSelected.maybePrevChildId(this.selectedId)
    )
  }

  private maybeNextSiblingIdOf(node: NodeModel) {
    const maybeParent = this.nodeCollection.nullableParentOf(node)
    return maybeParent && maybeParent.maybeNextSiblingId(node.id)
  }

  private get maybeParentIdOfSelected() {
    return fromNullable(
      this.nodeCollection.nullableParentOf(this.selectedNode),
    ).map(p => p.id)
  }

  @action.bound
  goPrev() {
    this.setSelectedId(
      fromNullable(this.maybePrevSiblingIdOfSelected)
        .map(this.getLastVisibleDescendentIdOrSelf)

        .orElse(() => this.maybeParentIdOfSelected)
        .getOrElse(this.selectedId),
    )
  }

  private maybeNextSiblingIdOfFirstAncestor(
    nodeId: string,
  ): Option<string> {
    const maybeParent = this.nodeCollection.maybeParentOfId(nodeId)
    if (maybeParent) {
      const parent = maybeParent
      return fromNullable(this.maybeNextSiblingIdOf(parent)).orElse(() =>
        this.maybeNextSiblingIdOfFirstAncestor(parent.id),
      )
    } else {
      return none
    }
  }

  @action.bound
  goNext() {
    const sid = this.selectedNode.maybeFirstVisibleChildId
      .orElse(() =>
        this.maybeParentOfSelected.chain(parent =>
          parent.maybeNextChildId(this.selectedId),
        ),
      )
      .orElse(() =>
        this.maybeNextSiblingIdOfFirstAncestor(this.selectedId),
      )

      .getOrElse(this.selectedId)
    this.setSelectedId(sid)
  }

  private get maybePrevSibling() {
    return (
      this.maybePrevSiblingIdOfSelected &&
      this.maybeNodeWithId(this.maybePrevSiblingIdOfSelected)
    )
  }

  @action.bound
  indent() {
    const oldParent = this.nullableParentOfSelected
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
      this.rootNode ===
        this.nodeCollection.nullableParentOf(this.selectedNode)
    )
      return

    const oldParent = this.nodeCollection.nullableParentOf(
      this.selectedNode,
    )
    const grandParent = this.nodeCollection.nullableParentOf(oldParent)

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
