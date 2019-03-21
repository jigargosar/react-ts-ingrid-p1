import { observable, values } from 'mobx'
import { NodeModel, NodeModelJSON } from './NodeModel'
import { Option } from 'fp-ts/lib/Option'
import ow from 'ow'
import { lookup } from 'fp-ts/lib/Record'
import * as strMap from 'fp-ts/lib/StrMap'
import { StrMap } from 'fp-ts/lib/StrMap'

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

  nullableNodeWithId(id: string): NodeModel | undefined {
    return this.byId[id]
  }

  maybeNodeWithId(id: string): Option<NodeModel> {
    return lookup(id, this.byId)
  }

  nodeWithId(id: string): NodeModel {
    const nullableNode = this.nullableNodeWithId(id)
    ow(nullableNode, ow.undefined.not)
    return nullableNode as NodeModel
  }

  public get rootNode() {
    return this.nodeWithId(NodeModel.rootNodeId)
  }

  private get idToPidLookup(): StrMap<string> {
    return values(this.byId).reduce((acc, node) => {
      node.childIds.forEach((cid: string) => {
        acc[cid] = node.id
      })
      return acc
    }, {})
  }

  private nullableParentIdOfId(nodeId: string): string | undefined {
    // @ts-ignore
    return this.idToPidLookup[nodeId]
  }

  private maybeParentIdOfId(nodeId: string) {
    return strMap.lookup(nodeId, this.idToPidLookup)
  }

  nullableParentOf(node: NodeModel) {
    return this.nullableParentOfId(node.id)
  }

  maybeParentOfId(nodeId: string) {
    return this.maybeParentIdOfId(nodeId).chain(id =>
      this.maybeNodeWithId(id),
    )
  }

  maybeParentOf(node: NodeModel) {
    return this.maybeParentOfId(node.id)
  }

  nullableParentOfId(nodeId: string) {
    const pid = this.nullableParentIdOfId(nodeId)
    return pid && this.nullableNodeWithId(pid)
  }

  isRootNode(node: NodeModel) {
    return this.rootNode === node
  }

  private childNodesOf(node: NodeModel) {
    return node.childIds.map(child => this.nullableNodeWithId(child))
  }

  public getVisibleChildrenOf(node: NodeModel) {
    return node.hasVisibleChildren ? this.childNodesOf(node) : []
  }

  static create() {
    const nodeCollection = new NodeCollection({})
    nodeCollection.registerNode(NodeModel.getOrCreateRootNode())
    return nodeCollection
  }
}
