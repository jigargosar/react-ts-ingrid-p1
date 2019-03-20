import { observable } from 'mobx'
import nanoid from 'nanoid'
import faker from 'faker'
import ow from 'ow'
import { none, some } from 'fp-ts/lib/Option'

export type NodeModelJSON = {
  _id: string
  title: string
  childIds: string[]
  collapsed: boolean
}

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

  static createNew(
    id?: string,
    title?: string,
    childIds?: string[],
    collapsed?: boolean,
  ) {
    return new NodeModel(id, title, childIds, collapsed)
  }

  private static _rootNode: NodeModel

  static readonly rootNodeId = 'id_root_node'

  static getOrCreateRootNode() {
    if (!NodeModel._rootNode) {
      NodeModel._rootNode = new NodeModel(NodeModel.rootNodeId, 'Root')
    }
    return NodeModel._rootNode
  }

  appendNewChildId(id: string) {
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

  public insertNewChildIdAfter(
    existingChildId: string,
    newChildId: string,
  ) {
    const idx = this.indexOfChildId(existingChildId)
    this.insertChildIdAt(idx + 1, newChildId)
  }

  public maybePrevChildId(existingChildId: string) {
    const idx = this.indexOfChildId(existingChildId)
    return idx > 0 ? this.childIds[idx - 1] : null
  }

  public maybeNextChildId(existingChildId: string) {
    const idx = this.indexOfChildId(existingChildId)
    return idx < this.childCount - 1 ? this.childIds[idx + 1] : null
  }

  getChildIdAt(idx: number) {
    ow(idx, ow.number.integer.greaterThanOrEqual(0))
    return this.childIds[idx]
  }

  get maybeFirstChildId() {
    return this.childIds.length > 0 ? some(this.childIds[0]) : none
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

  public get maybeFirstVisibleChildId() {
    return this.hasVisibleChildren ? this.maybeFirstChildId : none
  }
}
