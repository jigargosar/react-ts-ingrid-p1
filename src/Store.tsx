import { useEffect, useState } from 'react'
import { action, autorun, observable } from 'mobx'
import isHotkey from 'is-hotkey'
import { getCached, setCache } from './cache-helpers'
import { useDisposable } from 'mobx-react-lite'
import { NodeModel, NodeModelJSON } from './model/NodeModel'
import { NodeCollection } from './model/NodeCollection'
import { Option } from 'fp-ts/lib/Option'

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

  private setMaybeSelectedId(maybeSid: Option<string>) {
    maybeSid.map(sid => {
      this.selectedId = sid
    })
  }

  private get selectedNode(): NodeModel {
    return this.nodeCollection.nodeWithId(this.selectedId)
  }

  private get maybeParentOfSelected() {
    return this.nodeCollection.maybeParentOf(this.selectedNode)
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

  private get maybePrevSiblingIdOfSelected() {
    return this.maybeParentOfSelected.chain(p =>
      p.maybePrevChildId(this.selectedId),
    )
  }

  private maybeNextSiblingIdOf(node: NodeModel) {
    return this.nodeCollection
      .maybeParentOfId(node.id)
      .chain(p => p.maybeNextChildId(node.id))
  }

  private get maybeParentIdOfSelected() {
    return this.nodeCollection
      .maybeParentOf(this.selectedNode)
      .map(p => p.id)
  }

  @action.bound
  goPrev() {
    this.setMaybeSelectedId(
      this.maybePrevSiblingIdOfSelected
        .map(id => this.getLastVisibleDescendentIdOrSelf(id))
        .orElse(() => this.maybeParentIdOfSelected),
    )
  }

  private maybeNextSiblingIdOfFirstAncestor(
    nodeId: string,
  ): Option<string> {
    return this.nodeCollection
      .maybeParentOfId(nodeId)
      .chain(parent =>
        this.maybeNextSiblingIdOf(parent).orElse(() =>
          this.maybeNextSiblingIdOfFirstAncestor(parent.id),
        ),
      )
  }

  @action.bound
  goNext() {
    const maybeSid = this.selectedNode.maybeFirstVisibleChildId
      .orElse(() =>
        this.maybeParentOfSelected.chain(parent =>
          parent.maybeNextChildId(this.selectedId),
        ),
      )
      .orElse(() =>
        this.maybeNextSiblingIdOfFirstAncestor(this.selectedId),
      )

    this.setMaybeSelectedId(maybeSid)
  }

  private get maybePrevSibling() {
    return this.maybePrevSiblingIdOfSelected.chain(sibId =>
      this.nodeCollection.maybeNodeWithId(sibId),
    )
  }

  @action.bound
  indent() {
    this.maybePrevSibling.map(newParent => {
      this.maybeParentOfSelected.map(oldParent => {
        oldParent.removeChildId(this.selectedId)
        newParent.appendNewChildId(this.selectedId)
        newParent.expand()
      })
    })
  }

  private getLastVisibleDescendentIdOrSelf(nodeId: string): string {
    return this.maybeNodeWithId(nodeId)
      .chain(node =>
        node.maybeLastVisibleChildId.map(lastChildId =>
          this.getLastVisibleDescendentIdOrSelf(lastChildId),
        ),
      )
      .getOrElse(nodeId)
  }

  @action.bound
  outdent() {
    this.nodeCollection.maybeParentOf(this.selectedNode).map(oldParent => {
      this.nodeCollection.maybeParentOf(oldParent).map(grandParent => {
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
