import dagre from '@dagrejs/dagre'
import type { Edge, Node } from '@vue-flow/core'

/** ELK is good at nested layout, but not tree layout.
 * So we use dagre to optimize the overall layout. */
export default function (nodes: Node[], edges: Edge[]) {
  const graph = new dagre.graphlib.Graph()

  // Must: set empty object to missing edges.
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: "LR" })

  for (const node of nodes) {
    graph.setNode(node.id, { width: node.width! as number, height: node.height! as number })
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target)
  }

  dagre.layout(graph)

  // Update position.
  for (const node of nodes) {
    const newPos = graph.node(node.id)
    // Conver center position from dagre to top-left position, in case that 
    // some large nodes overlap.
    // But dagre left-aligns the nodes, so we keep x-axis value as it is.
    node.position = {
      x: newPos.x,
      y: newPos.y - (node.height! as number) / 2,
    }
  }
}
