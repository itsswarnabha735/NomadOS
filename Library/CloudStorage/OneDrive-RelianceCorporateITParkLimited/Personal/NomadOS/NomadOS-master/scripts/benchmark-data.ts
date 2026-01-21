export interface TestLocation {
    id: string;
    name: string;
    lat: number;
    lng: number;
}

export interface TestScenario {
    id: string;
    name: string;
    type: 'linear' | 'circular' | 'cluster' | 'random';
    locations: TestLocation[];
    optimalDistance?: number;
}

function generateLinear(count: number): TestScenario {
    const locations = Array.from({ length: count }, (_, i) => ({
        id: `L${i}`,
        name: `Stop ${i}`,
        lat: 0,
        lng: i * 1 // 1km apart roughly
    }));
    return {
        id: `linear_${count}`,
        name: `Linear Route (${count} stops)`,
        type: 'linear',
        locations,
        optimalDistance: count - 1 // A->B->C is N-1 units
    };
}

function generateCircular(count: number): TestScenario {
    const radius = 5;
    const locations = Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * 2 * Math.PI;
        return {
            id: `C${i}`,
            name: `Clock ${i}`,
            lat: radius * Math.cos(angle),
            lng: radius * Math.sin(angle)
        };
    });
    return {
        id: `circle_${count}`,
        name: `Circular Route (${count} stops)`,
        type: 'circular',
        locations
    };
}

function generateClusters(clusterCount: number, perCluster: number): TestScenario {
    const locations: TestLocation[] = [];
    for (let c = 0; c < clusterCount; c++) {
        // Move clusters far apart (e.g., 20 units)
        const offsetLat = c * 20;
        const offsetLng = c * 20;

        for (let i = 0; i < perCluster; i++) {
            locations.push({
                id: `K${c}_${i}`,
                name: `Cluster ${c} Stop ${i}`,
                lat: offsetLat + Math.random() * 2,
                lng: offsetLng + Math.random() * 2
            });
        }
    }
    return {
        id: `clusters_${clusterCount}x${perCluster}`,
        name: `Clusters (${clusterCount} groups of ${perCluster})`,
        type: 'cluster',
        locations
    };
}

export function generateScenarios(): TestScenario[] {
    const scenarios: TestScenario[] = [];

    // 1. Linear Cases (Easy to hard)
    for (let i = 5; i <= 15; i += 2) scenarios.push(generateLinear(i));

    // 2. Circular Cases
    for (let i = 5; i <= 15; i += 2) scenarios.push(generateCircular(i));

    // 3. Clustered Cases
    scenarios.push(generateClusters(2, 4)); // 2 groups of 4
    scenarios.push(generateClusters(3, 4)); // 3 groups of 4
    scenarios.push(generateClusters(2, 8)); // 2 big groups
    scenarios.push(generateClusters(4, 3)); // 4 small groups

    // 4. Random / Stress Tests
    // Fill remainder up to 50
    const currentCount = scenarios.length;
    for (let i = 0; i < 50 - currentCount; i++) {
        const size = Math.floor(Math.random() * 8) + 4; // 4 to 12 stops
        const locations = Array.from({ length: size }, (_, j) => ({
            id: `R${i}_${j}`,
            name: `Random ${j}`,
            lat: Math.random() * 20,
            lng: Math.random() * 20
        }));
        scenarios.push({
            id: `random_${i}`,
            name: `Random Scatter ${i} (${size} stops)`,
            type: 'random',
            locations
        });
    }

    return scenarios;
}
