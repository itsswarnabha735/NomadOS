"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tsp_solver_1 = require("../lib/tsp-solver");
const locations = [
    { lat: 0, lng: 0, name: 'Start', openingTime: '09:00', closingTime: '18:00' },
    { lat: 0.01, lng: 0.01, name: 'Place A', openingTime: '10:00', closingTime: '12:00', duration: 60 }, // Should visit early
    { lat: 0.02, lng: 0.02, name: 'Place B', openingTime: '14:00', closingTime: '16:00', duration: 60 }, // Should visit late
    { lat: 0.005, lng: 0.005, name: 'Place C' } // Flexible
];
// Mock distance matrix (in seconds)
// 0.01 deg approx 1.1km. 
// Let's say travel time is proportional to index diff for simplicity in mock
// But we need a matrix.
const matrix = [
    [0, 600, 1200, 300], // Start -> A (10m), B (20m), C (5m)
    [600, 0, 600, 300], // A -> Start, B, C
    [1200, 600, 0, 900], // B -> ...
    [300, 300, 900, 0] // C -> ...
];
console.log('--- Testing Basic TSP with Time Windows ---');
const path = (0, tsp_solver_1.solveTSP)(locations, matrix);
console.log('Optimized Path:', path.map(l => l.name));
// Expected: Start -> C -> A -> B
// Start (9:00) -> C (9:05, dur 60) -> 10:05.
// C -> A (5m) -> 10:10. A opens 10:00. OK. Dur 60 -> 11:10.
// A -> B (10m) -> 11:20. B opens 14:00. Wait until 14:00. Dur 60 -> 15:00.
// Total time valid.
// Test Hierarchical
const hierarchicalLocations = [
    { id: 'p1', lat: 0, lng: 0, name: 'Place 1' },
    { id: 'p2', lat: 0.1, lng: 0.1, name: 'Place 2' },
    { id: 'poi1', lat: 0, lng: 0, name: 'POI 1.1', parentId: 'p1' },
    { id: 'poi2', lat: 0, lng: 0, name: 'POI 1.2', parentId: 'p1' },
    { id: 'poi3', lat: 0.1, lng: 0.1, name: 'POI 2.1', parentId: 'p2' }
];
console.log('\n--- Testing Hierarchical TSP ---');
const hPath = (0, tsp_solver_1.solveHierarchicalTSP)(hierarchicalLocations);
console.log('Hierarchical Path:', hPath.map(l => l.name));
// Expected: Place 1, POI 1.1, POI 1.2 (or swapped), Place 2, POI 2.1
