// Outcome graph service: unified queryable graph connecting accounts, people, messages, meetings, tasks, stages, and revenue.
import { prisma } from "../db";
import { HttpError } from "../utils/httpError";

export interface GraphNode {
  id: string;
  nodeType: string;
  nodeId: string;
  title: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface GraphEdge {
  id: string;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  edgeType: string;
  weight: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface GraphQueryResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export async function getOutcomeGraph(workspaceKey: string, centerNodeType?: string, centerNodeId?: string, depth = 2): Promise<GraphQueryResult> {
  if (depth < 1 || depth > 3) {
    throw new HttpError(400, "Depth must be between 1 and 3", "BAD_REQUEST");
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const visitedNodeKeys = new Set<string>();
  const visitedEdgeKeys = new Set<string>();

  const addNode = (node: { id: string; nodeType: string; nodeId: string; title: string; metadata: unknown; createdAt: Date; updatedAt: Date }) => {
    const key = `${node.nodeType}:${node.nodeId}`;
    if (!visitedNodeKeys.has(key)) {
      visitedNodeKeys.add(key);
      nodes.push({
        id: node.id,
        nodeType: node.nodeType,
        nodeId: node.nodeId,
        title: node.title,
        metadata: toRecord(node.metadata),
        createdAt: node.createdAt.toISOString(),
        updatedAt: node.updatedAt.toISOString(),
      });
    }
  };

  const addEdge = (edge: { id: string; sourceType: string; sourceId: string; targetType: string; targetId: string; edgeType: string; weight: number; metadata: unknown; createdAt: Date }) => {
    const key = `${edge.sourceType}:${edge.sourceId}->${edge.targetType}:${edge.targetId}:${edge.edgeType}`;
    if (!visitedEdgeKeys.has(key)) {
      visitedEdgeKeys.add(key);
      edges.push({
        id: edge.id,
        sourceType: edge.sourceType,
        sourceId: edge.sourceId,
        targetType: edge.targetType,
        targetId: edge.targetId,
        edgeType: edge.edgeType,
        weight: edge.weight,
        metadata: toRecord(edge.metadata),
        createdAt: edge.createdAt.toISOString(),
      });
    }
  };

  const seedNodes = centerNodeType && centerNodeId
    ? await prisma.outcomeGraphNode.findMany({
        where: { workspaceKey, nodeType: centerNodeType as any, nodeId: centerNodeId },
        take: 1,
      })
    : await prisma.outcomeGraphNode.findMany({
        where: { workspaceKey },
        orderBy: { updatedAt: "desc" },
        take: 50,
      });

  for (const seed of seedNodes) {
    addNode(seed);
    if (depth === 1) continue;

    const relatedEdges = await prisma.outcomeGraphEdge.findMany({
      where: {
        workspaceKey,
        OR: [
          { sourceType: seed.nodeType, sourceId: seed.nodeId },
          { targetType: seed.nodeType, targetId: seed.nodeId },
        ],
      },
      take: 50,
    });

    for (const edge of relatedEdges) {
      addEdge(edge);
      if (depth === 2) continue;

      const neighborIds = edge.sourceType === seed.nodeType && edge.sourceId === seed.nodeId
        ? { type: edge.targetType, id: edge.targetId }
        : { type: edge.sourceType, id: edge.sourceId };

      const neighbors = await prisma.outcomeGraphNode.findMany({
        where: { workspaceKey, nodeType: neighborIds.type as any, nodeId: neighborIds.id },
        take: 20,
      });

      for (const neighbor of neighbors) {
        addNode(neighbor);
        const nextEdges = await prisma.outcomeGraphEdge.findMany({
          where: {
            workspaceKey,
            OR: [
              { sourceType: neighbor.nodeType, sourceId: neighbor.nodeId },
              { targetType: neighbor.nodeType, targetId: neighbor.nodeId },
            ],
          },
          take: 30,
        });
        for (const nextEdge of nextEdges) {
          addEdge(nextEdge);
        }
      }
    }
  }

  return { nodes, edges };
}

export async function upsertGraphNode(workspaceKey: string, nodeType: string, nodeId: string, title: string, metadata: Record<string, unknown> = {}) {
  const existing = await prisma.outcomeGraphNode.findFirst({
    where: { workspaceKey, nodeType: nodeType as any, nodeId },
  });
  if (existing) {
    return prisma.outcomeGraphNode.update({
      where: { id: existing.id },
      data: { title, metadata: metadata as any, updatedAt: new Date() },
    });
  }
  return prisma.outcomeGraphNode.create({
    data: { nodeType: nodeType as any, nodeId, workspaceKey, title, metadata: metadata as any },
  });
}

export async function createGraphEdge(workspaceKey: string, sourceType: string, sourceId: string, targetType: string, targetId: string, edgeType: string, weight = 1, metadata: Record<string, unknown> = {}) {
  return prisma.outcomeGraphEdge.create({
    data: { workspaceKey, sourceType: sourceType as any, sourceId, targetType: targetType as any, targetId, edgeType: edgeType as any, weight, metadata: metadata as any },
  });
}

function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch (err) {
    console.error("[safeStringify] Failed to stringify object:", err);
    return "{}";
  }
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // ignore
    }
  }
  return {};
}
