/**
 * Fallback A* Algorithm Skeleton
 * 
 * This module provides a skeletal structure for implementing pathfinding using the A* algorithm.
 * To make this functional, you must provide a preprocessed road graph (e.g., from OpenStreetMap).
 * 
 * RECOMMENDED INTEGRATION:
 * For production-grade routing, consider using:
 * 1. OSRM (Open Source Routing Machine)
 * 2. GraphHopper
 * 3. Mapbox Directions API
 * 4. Google Maps Directions API
 */

class AStarNode {
  constructor(id, lat, lng) {
    this.id = id;
    this.lat = lat;
    this.lng = lng;
    this.g = Infinity; // Cost from start
    this.h = 0;        // Heuristic (estimated cost to end)
    this.f = Infinity; // Total cost (g + h)
    this.parent = null;
    this.neighbors = []; // Array of { node, weight }
  }
}

/**
 * A* pathfinding function
 * @param {AStarNode} startNode 
 * @param {AStarNode} targetNode 
 */
const findPath = (startNode, targetNode) => {
  const openSet = [startNode];
  const closedSet = new Set();
  
  startNode.g = 0;
  startNode.h = heuristic(startNode, targetNode);
  startNode.f = startNode.h;

  while (openSet.length > 0) {
    // 1. Get node with lowest f-score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();

    // 2. Check if reached target
    if (current.id === targetNode.id) {
      return reconstructPath(current);
    }

    closedSet.add(current.id);

    // 3. Process neighbors
    for (const { node: neighbor, weight } of current.neighbors) {
      if (closedSet.has(neighbor.id)) continue;

      const tentativeG = current.g + weight;

      if (!openSet.find(n => n.id === neighbor.id)) {
        openSet.push(neighbor);
      } else if (tentativeG >= neighbor.g) {
        continue;
      }

      neighbor.parent = current;
      neighbor.g = tentativeG;
      neighbor.h = heuristic(neighbor, targetNode);
      neighbor.f = neighbor.g + neighbor.h;
    }
  }

  return null; // No path found
};

const heuristic = (nodeA, nodeB) => {
  // Use Euclidean or Haversine distance as heuristic
  const dLat = nodeA.lat - nodeB.lat;
  const dLng = nodeA.lng - nodeB.lng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
};

const reconstructPath = (node) => {
  const path = [];
  let current = node;
  while (current) {
    path.push({ lat: current.lat, lng: current.lng });
    current = current.parent;
  }
  return path.reverse();
};

module.exports = {
  findPath,
  AStarNode
};
