class HierarchyService {
  constructor(userData) {
    this.userData = userData;
    this.validEdges = [];
    this.invalidEntries = [];
    this.duplicateEdges = [];
    this.seenEdges = new Set();
  }

  process(data) {
    // Step 1: Validate and clean input
    this.validateInput(data);

    // Step 2-3: Build graph with multi-parent handling
    const graph = this.buildGraph();

    // Step 4: Find connected components
    const components = this.findComponents(graph);

    // Step 5-7: Process each component
    const hierarchies = [];
    let totalTrees = 0;
    let totalCycles = 0;
    let largestTreeRoot = null;
    let maxDepth = 0;

    for (const component of components) {
      const result = this.processComponent(component, graph);
      hierarchies.push(result.hierarchy);

      if (result.hasCycle) {
        totalCycles++;
      } else {
        totalTrees++;
        if (result.depth > maxDepth || 
            (result.depth === maxDepth && (!largestTreeRoot || result.root < largestTreeRoot))) {
          maxDepth = result.depth;
          largestTreeRoot = result.root;
        }
      }
    }

    return {
      ...this.userData,
      has_cycle: totalCycles > 0,
      hierarchies,
      invalid_entries: this.invalidEntries,
      duplicate_edges: this.duplicateEdges,
      summary: {
        total_trees: totalTrees,
        total_cycles: totalCycles,
        largest_tree_root: largestTreeRoot
      }
    };
  }

  validateInput(data) {
    for (const entry of data) {
      const trimmed = entry.trim();
      
      // Check valid format: X->Y where X and Y are single uppercase letters
      const match = trimmed.match(/^([A-Z])->([A-Z])$/);
      
      if (!match) {
        this.invalidEntries.push(entry);
        continue;
      }

      const [, parent, child] = match;
      
      // Self-loop is invalid
      if (parent === child) {
        this.invalidEntries.push(entry);
        continue;
      }

      const edgeKey = `${parent}->${child}`;
      
      // Check for duplicates
      if (this.seenEdges.has(edgeKey)) {
        if (!this.duplicateEdges.includes(edgeKey)) {
          this.duplicateEdges.push(edgeKey);
        }
        continue;
      }

      this.seenEdges.add(edgeKey);
      this.validEdges.push({ parent, child });
    }
  }

  buildGraph() {
    const graph = {
      adjacency: new Map(),
      children: new Set(),
      nodes: new Set()
    };

    const childParentMap = new Map();

    for (const { parent, child } of this.validEdges) {
      graph.nodes.add(parent);
      graph.nodes.add(child);

      // Multi-parent rule: first parent wins
      if (!childParentMap.has(child)) {
        childParentMap.set(child, parent);
        graph.children.add(child);
        
        if (!graph.adjacency.has(parent)) {
          graph.adjacency.set(parent, []);
        }
        graph.adjacency.get(parent).push(child);
      }
    }

    return graph;
  }

  findComponents(graph) {
    const visited = new Set();
    const components = [];

    for (const node of graph.nodes) {
      if (!visited.has(node)) {
        const component = new Set();
        this.dfsCollect(node, graph.adjacency, visited, component, graph.nodes);
        components.push(component);
      }
    }

    return components;
  }

  dfsCollect(node, adjacency, visited, component, allNodes) {
    visited.add(node);
    component.add(node);

    // Forward edges
    if (adjacency.has(node)) {
      for (const child of adjacency.get(node)) {
        if (!visited.has(child)) {
          this.dfsCollect(child, adjacency, visited, component, allNodes);
        }
      }
    }

    // Backward edges (find parents)
    for (const [parent, children] of adjacency) {
      if (children.includes(node) && !visited.has(parent)) {
        this.dfsCollect(parent, adjacency, visited, component, allNodes);
      }
    }
  }

  processComponent(component, graph) {
    // Find root (node that's not a child)
    let root = null;
    for (const node of component) {
      if (!graph.children.has(node)) {
        root = node;
        break;
      }
    }

    // If no root found, it's a pure cycle - use smallest node
    if (!root) {
      root = Array.from(component).sort()[0];
    }

    // Detect cycle
    const hasCycle = this.detectCycle(root, graph.adjacency, component);

    if (hasCycle) {
      return {
        hierarchy: {
          root,
          tree: {},
          has_cycle: true
        },
        hasCycle: true,
        root
      };
    }

    // Build tree
    const tree = this.buildTree(root, graph.adjacency);
    const depth = this.calculateDepth(tree);

    return {
      hierarchy: {
        root,
        tree,
        depth
      },
      hasCycle: false,
      depth,
      root
    };
  }

  detectCycle(start, adjacency, component) {
    const visited = new Set();
    const recStack = new Set();

    const hasCycleDFS = (node) => {
      visited.add(node);
      recStack.add(node);

      if (adjacency.has(node)) {
        for (const child of adjacency.get(node)) {
          if (!component.has(child)) continue;
          
          if (!visited.has(child)) {
            if (hasCycleDFS(child)) return true;
          } else if (recStack.has(child)) {
            return true;
          }
        }
      }

      recStack.delete(node);
      return false;
    };

    for (const node of component) {
      if (!visited.has(node)) {
        if (hasCycleDFS(node)) return true;
      }
    }

    return false;
  }

  buildTree(root, adjacency) {
    const tree = {};
    
    const buildRecursive = (node) => {
      const subtree = {};
      if (adjacency.has(node)) {
        for (const child of adjacency.get(node)) {
          subtree[child] = buildRecursive(child);
        }
      }
      return subtree;
    };

    tree[root] = buildRecursive(root);
    return tree;
  }

  calculateDepth(tree) {
    const rootNode = Object.values(tree)[0];

    const getDepth = (node) => {
      if (typeof node !== 'object' || Object.keys(node).length === 0) {
        return 1;
      }
      
      let maxChildDepth = 0;
      for (const child of Object.values(node)) {
        maxChildDepth = Math.max(maxChildDepth, getDepth(child));
      }
      
      return 1 + maxChildDepth;
    };

    return rootNode ? getDepth(rootNode) : 0;
  }
}

module.exports = HierarchyService;
