import { useState } from 'react'
import { action, autorun, observable } from 'mobx'
import { getCached, setCache } from './cache-helpers'
import { useDisposable } from 'mobx-react-lite'
import { NodeModel, NodeModelJSON } from './model/NodeModel'
import { NodeCollection } from './model/NodeCollection'
import { Option } from 'fp-ts/lib/Option'
import { useWindowIsHotKey } from './hooks/useWindowIsHotKey'

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
    return this.nodeCollection.visibleChildNodesOf(node)
  }

  public get rootNode() {
    return this.nodeCollection.rootNode
  }

  @action.bound
  setSelectedId(sid: string) {
    this.selectedId = sid
  }

  private setMaybeSelectedId(maybeSid: Option<string>) {
    maybeSid.map(sid => this.setSelectedId(sid))
  }

  private get selectedNode(): NodeModel {
    return this.nodeCollection.nodeWithId(this.selectedId)
  }

  private get maybeParentOfSelected() {
    return this.nodeCollection.maybeParentOfId(this.selectedId)
  }

  public isNodeSelected(node: NodeModel) {
    return node.id === this.selectedId
  }

  @action.bound
  addNewNode() {
    const newNode = NodeModel.createNew()
    this.registerNode(newNode)

    this.maybeParentOfSelected
      .map(p => p.insertNewChildIdAfter(this.selectedId, newNode.id))
      .getOrElseL(() => this.selectedNode.appendNewChildId(newNode.id))

    this.setSelectedId(newNode.id)
  }

  private attemptGoUp() {
    const maybeId = this.maybeParentOfSelected.map(p => p.id)

    this.setMaybeSelectedId(maybeId)
  }

  @action.bound
  goPrev() {
    const maybeSid = this.nodeCollection
      .maybePrevSiblingIdOfId(this.selectedId)
      .map(id => this.nodeCollection.lastVisibleDescendentIdOrSelf(id))
      .orElse(() => this.nodeCollection.maybeParentIdOfId(this.selectedId))

    this.setMaybeSelectedId(maybeSid)
  }

  @action.bound
  goNext() {
    const maybeSid = this.selectedNode.maybeFirstVisibleChildId
      .orElse(() =>
        this.nodeCollection.maybeNextSiblingIdOfId(this.selectedId),
      )
      .orElse(() =>
        this.nodeCollection.maybeNextSiblingIdOfFirstAncestor(
          this.selectedId,
        ),
      )

    this.setMaybeSelectedId(maybeSid)
  }

  @action.bound
  indent() {
    this.nodeCollection
      .maybePrevSiblingIdOfId(this.selectedId)
      .chain(sibId => this.nodeCollection.maybeNodeWithId(sibId))
      .map(newParent => {
        this.maybeParentOfSelected.map(oldParent => {
          oldParent.removeChildId(this.selectedId)
          newParent.appendNewChildId(this.selectedId)
          newParent.expand()
        })
      })
  }

  @action.bound
  outdent() {
    this.nodeCollection.maybeParentOfId(this.selectedId).map(oldParent => {
      this.nodeCollection
        .maybeParentOfId(oldParent.id)
        .map(grandParent => {
          oldParent.removeChildId(this.selectedId)

          grandParent.insertNewChildIdAfter(oldParent.id, this.selectedId)
        })
    })
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
  const km = [
    { key: 'enter', handler: () => store.addNewNode() },
    { key: 'up', handler: () => store.goPrev() },
    { key: 'down', handler: () => store.goNext() },
    { key: 'tab', handler: () => store.indent() },
    { key: 'shift+tab', handler: () => store.outdent() },
    { key: 'left', handler: () => store.collapseOrParent() },
    { key: 'right', handler: () => store.expandOrNext() },
  ]

  useWindowIsHotKey(km)

  return store
}
