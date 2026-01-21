"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'TEST_KEY';
const route_1 = require("../app/api/distance-matrix/route");
// Mock Request and Response
class MockRequest {
    constructor(body) {
        this.body = body;
    }
    async json() {
        return this.body;
    }
}
// Mock global fetch
const originalFetch = global.fetch;
let fetchCallCount = 0;
global.fetch = async (url) => {
    fetchCallCount++;
    console.log('Fetching URL:', url);
    return {
        json: async () => ({
            status: 'OK',
            rows: [{ elements: [{ status: 'OK', duration: { value: 100 }, distance: { value: 1000 } }] }]
        })
    };
};
async function runTest() {
    console.log('--- Testing Distance Matrix Caching ---');
    const payload = {
        origins: [{ lat: 0, lng: 0 }],
        destinations: [{ lat: 1, lng: 1 }],
        mode: 'driving'
    };
    // First Call
    console.log('1. First Request (Should hit API)');
    await (0, route_1.POST)(new MockRequest(payload));
    // Second Call (Same payload)
    console.log('2. Second Request (Should hit Cache)');
    await (0, route_1.POST)(new MockRequest(payload));
    // Third Call (Different payload)
    console.log('3. Third Request (Different payload, Should hit API)');
    await (0, route_1.POST)(new MockRequest(Object.assign(Object.assign({}, payload), { mode: 'walking' })));
    console.log('\n--- Results ---');
    console.log(`Total Fetch Calls: ${fetchCallCount}`);
    if (fetchCallCount === 2) {
        console.log('SUCCESS: Caching works! (2 fetch calls for 3 requests)');
    }
    else {
        console.error(`FAILURE: Expected 2 fetch calls, got ${fetchCallCount}`);
    }
    // Cleanup
    global.fetch = originalFetch;
}
runTest();
