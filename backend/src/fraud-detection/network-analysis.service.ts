import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionGraphEdgeEntity } from './entities/transaction-graph-edge.entity';

interface TransactionGraph {
  nodes: Map<string, any>;
  edges: TransactionGraphEdgeEntity[];
}

interface FraudRing {
  id: string;
  members: string[];
  centralNode: string;
  riskScore: number;
  patterns: string[];
}

interface SimilarityScore {
  entity1: string;
  entity2: string;
  similarity: number;
  commonConnections: number;
}

interface LaunderingPattern {
  type: string;
  entities: string[];
  riskScore: number;
  description: string;
}

@Injectable()
export class NetworkAnalysisService {
  constructor(
    @InjectRepository(TransactionGraphEdgeEntity)
    private graphEdgeRepository: Repository<TransactionGraphEdgeEntity>,
  ) {}

  async buildTransactionGraph(timeWindow: { startDate: Date; endDate: Date }): Promise<TransactionGraph> {
    const edges = await this.graphEdgeRepository
      .createQueryBuilder('edge')
      .where('edge.first_seen >= :startDate', { startDate: timeWindow.startDate })
      .andWhere('edge.last_seen <= :endDate', { endDate: timeWindow.endDate })
      .getMany();

    const nodes = new Map<string, any>();

    // Build nodes from edges
    for (const edge of edges) {
      if (!nodes.has(edge.source_entity)) {
        nodes.set(edge.source_entity, { id: edge.source_entity, connections: 0 });
      }
      if (!nodes.has(edge.target_entity)) {
        nodes.set(edge.target_entity, { id: edge.target_entity, connections: 0 });
      }
      nodes.get(edge.source_entity).connections++;
      nodes.get(edge.target_entity).connections++;
    }

    return {
      nodes,
      edges,
    };
  }

  async detectFraudRings(graph: TransactionGraph): Promise<FraudRing[]> {
    const fraudRings: FraudRing[] = [];
    const visited = new Set<string>();
    const adjacencyList = this.buildAdjacencyList(graph.edges);

    // Find connected components (potential fraud rings)
    for (const nodeId of graph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        const component = this.findConnectedComponent(nodeId, adjacencyList, visited);
        
        if (component.size >= 3) { // Only consider components with 3+ members
          const ring = await this.analyzeComponent(component, graph);
          if (ring.riskScore > 50) {
            fraudRings.push(ring);
          }
        }
      }
    }

    return fraudRings;
  }

  async calculateSimilarity(entity1: string, entity2: string): Promise<SimilarityScore> {
    const entity1Connections = await this.graphEdgeRepository.find({
      where: [{ source_entity: entity1 }, { target_entity: entity1 }],
    });

    const entity2Connections = await this.graphEdgeRepository.find({
      where: [{ source_entity: entity2 }, { target_entity: entity2 }],
    });

    const entity1Neighbors = new Set<string>();
    const entity2Neighbors = new Set<string>();

    for (const edge of entity1Connections) {
      entity1Neighbors.add(edge.source_entity === entity1 ? edge.target_entity : edge.source_entity);
    }

    for (const edge of entity2Connections) {
      entity2Neighbors.add(edge.source_entity === entity2 ? edge.target_entity : edge.source_entity);
    }

    const commonConnections = [...entity1Neighbors].filter(n => entity2Neighbors.has(n));
    const totalUnique = new Set([...entity1Neighbors, ...entity2Neighbors]).size;
    const similarity = totalUnique > 0 ? (commonConnections.length / totalUnique) * 100 : 0;

    return {
      entity1,
      entity2,
      similarity: Math.round(similarity * 100) / 100,
      commonConnections: commonConnections.length,
    };
  }

  async detectMoneyLaundering(graph: TransactionGraph): Promise<LaunderingPattern[]> {
    const patterns: LaunderingPattern[] = [];
    const adjacencyList = this.buildAdjacencyList(graph.edges);

    // Detect cycles (potential money laundering)
    for (const nodeId of graph.nodes.keys()) {
      const cycles = this.findCycles(nodeId, nodeId, adjacencyList, [], 5);
      
      for (const cycle of cycles) {
        if (cycle.length >= 3) {
          patterns.push({
            type: 'circular_transaction',
            entities: cycle,
            riskScore: 75,
            description: 'Circular transaction pattern detected - potential money laundering',
          });
        }
      }
    }

    // Detect rapid chain transactions
    for (const edge of graph.edges) {
      if (edge.transaction_count && edge.transaction_count > 10) {
        patterns.push({
          type: 'rapid_chain',
          entities: [edge.source_entity, edge.target_entity],
          riskScore: 65,
          description: 'High frequency transactions between same entities',
        });
      }
    }

    // Detect fan-out patterns (one entity sending to many)
    const fanOutThreshold = 5;
    for (const [nodeId, nodeData] of graph.nodes.entries()) {
      if (nodeData.connections >= fanOutThreshold) {
        const neighbors = adjacencyList.get(nodeId) || [];
        if (neighbors.length >= fanOutThreshold) {
          patterns.push({
            type: 'fan_out',
            entities: [nodeId, ...neighbors],
            riskScore: 60,
            description: 'Single entity sending to multiple recipients - potential layering',
          });
        }
      }
    }

    return patterns;
  }

  private buildAdjacencyList(edges: TransactionGraphEdgeEntity[]): Map<string, string[]> {
    const adjacencyList = new Map<string, string[]>();

    for (const edge of edges) {
      if (!adjacencyList.has(edge.source_entity)) {
        adjacencyList.set(edge.source_entity, []);
      }
      if (!adjacencyList.has(edge.target_entity)) {
        adjacencyList.set(edge.target_entity, []);
      }
      adjacencyList.get(edge.source_entity)!.push(edge.target_entity);
      adjacencyList.get(edge.target_entity)!.push(edge.source_entity);
    }

    return adjacencyList;
  }

  private findConnectedComponent(
    startNode: string,
    adjacencyList: Map<string, string[]>,
    visited: Set<string>
  ): Set<string> {
    const component = new Set<string>();
    const queue = [startNode];
    visited.add(startNode);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.add(current);

      const neighbors = adjacencyList.get(current) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return component;
  }

  private async analyzeComponent(component: Set<string>, graph: TransactionGraph): Promise<FraudRing> {
    const members = Array.from(component);
    
    // Find central node (node with most connections)
    let centralNode = members[0];
    let maxConnections = 0;

    for (const memberId of members) {
      const nodeData = graph.nodes.get(memberId);
      if (nodeData && nodeData.connections > maxConnections) {
        maxConnections = nodeData.connections;
        centralNode = memberId;
      }
    }

    // Calculate risk score based on component characteristics
    const size = component.size;
    const avgConnections = members.reduce((sum, id) => sum + (graph.nodes.get(id)?.connections || 0), 0) / size;
    
    let riskScore = 30; // Base risk
    riskScore += Math.min(size * 5, 30); // Size factor
    riskScore += Math.min(avgConnections * 2, 25); // Connection density factor

    // Detect patterns
    const patterns: string[] = [];
    if (size > 5) patterns.push('large_network');
    if (avgConnections > 3) patterns.push('highly_connected');
    if (avgConnections > size * 0.7) patterns.push('clique_structure');

    return {
      id: `ring-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      members,
      centralNode,
      riskScore: Math.min(riskScore, 100),
      patterns,
    };
  }

  private findCycles(
    start: string,
    current: string,
    adjacencyList: Map<string, string[]>,
    path: string[],
    maxLength: number
  ): string[][] {
    if (path.length > maxLength) return [];
    if (path.includes(current)) {
      if (current === start && path.length >= 3) {
        return [path];
      }
      return [];
    }

    const cycles: string[][] = [];
    const neighbors = adjacencyList.get(current) || [];

    for (const neighbor of neighbors) {
      const newPath = [...path, current];
      const foundCycles = this.findCycles(start, neighbor, adjacencyList, newPath, maxLength);
      cycles.push(...foundCycles);
    }

    return cycles;
  }
}