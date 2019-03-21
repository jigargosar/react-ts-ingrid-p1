import { observable, values } from 'mobx'
import { NodeModel, NodeModelJSON } from './NodeModel'
import { Option } from 'fp-ts/lib/Option'
import ow from 'ow'
import { lookup } from 'fp-ts/lib/Record'

export class NodeCollection {
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

  maybeNodeWithId(id: string): Option<NodeModel> {
    return lookup(id, this.byId)
  }

  nodeWithId(id: string): NodeModel {
    const nullableNode = this.byId[id]
    ow(nullableNode, ow.object.instanceOf(NodeModel))
    return nullableNode
  }

  public get rootNode() {
    return this.nodeWithId(NodeModel.rootNodeId)
  }

  private get idToPidLookup(): Record<string, string> {
    return values(this.byId).reduce((acc, node) => {
      node.childIds.forEach((cid: string) => {
        acc[cid] = node.id
      })
      return acc
    }, {})
  }

  maybeParentIdOfId(nodeId: string): Option<string> {
    return lookup(nodeId, this.idToPidLookup)
  }

  maybeParentOfId(nodeId: string) {
    return this.maybeParentIdOfId(nodeId).chain(id =>
      this.maybeNodeWithId(id),
    )
  }

  private childNodesOf(node: NodeModel) {
    return node.childIds.map(child => this.nodeWithId(child))
  }

  public visibleChildNodesOf(node: NodeModel) {
    return node.hasVisibleChildren ? this.childNodesOf(node) : []
  }

  public maybePrevSiblingIdOfId(id: string) {
    return this.maybeParentOfId(id).chain(p => p.maybePrevChildId(id))
  }

  public maybeNextSiblingIdOfId(id: string) {
    return this.maybeParentOfId(id).chain(p => p.maybeNextChildId(id))
  }

  public maybeNextSiblingIdOfFirstAncestor(
    nodeId: string,
  ): Option<string> {
    return this.maybeParentIdOfId(nodeId).chain(parentId =>
      this.maybeNextSiblingIdOfId(parentId).orElse(() =>
        this.maybeNextSiblingIdOfFirstAncestor(parentId),
      ),
    )
  }

  public lastVisibleDescendentIdOrSelf(nodeId: string): string {
    return this.maybeNodeWithId(nodeId)
      .chain(node =>
        node.maybeLastVisibleChildId.map(lastChildId =>
          this.lastVisibleDescendentIdOrSelf(lastChildId),
        ),
      )
      .getOrElse(nodeId)
  }

  static create() {
    const nodeCollection = new NodeCollection({})
    nodeCollection.registerNode(NodeModel.getOrCreateRootNode())
    return nodeCollection
  }
}
