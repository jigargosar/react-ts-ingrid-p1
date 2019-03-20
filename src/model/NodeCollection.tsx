import { observable, values } from 'mobx'
import { NodeModel, NodeModelJSON } from './NodeModel'

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

  private maybeParentIdOfId(nodeId: string) {
    return this.idToPidLookup[nodeId]
  }

  maybeParentOf(node: NodeModel) {
    return this.maybeParentOfId(node.id)
  }

  maybeParentOfId(nodeId: string) {
    const pid = this.maybeParentIdOfId(nodeId)
    return pid && this.maybeNodeWithId(pid)
  }

  isRootNode(node: NodeModel) {
    return this.rootNode === node
  }

  private getChildNodesOf(node: NodeModel) {
    return node.childIds.map(child => this.maybeNodeWithId(child))
  }

  public getVisibleChildrenOf(node: NodeModel) {
    return node.hasVisibleChildren ? this.getChildNodesOf(node) : []
  }

  static create() {
    const nodeCollection = new NodeCollection({})
    nodeCollection.registerNode(NodeModel.getOrCreateRootNode())
    return nodeCollection
  }
}
