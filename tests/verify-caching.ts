process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'TEST_KEY';

import { POST } from '../app/api/distance-matrix/route';
import { NextResponse } from 'next/server';

// Mock Request and Response
class MockRequest {
    body: any;
    constructor(body: any) {
        this.body = body;
    }
    async json() {
        return this.body;
    }
}

// Mock global fetch
const originalFetch = global.fetch;
let fetchCallCount = 0;

global.fetch = async (url: any) => {
    fetchCallCount++;
    console.log('Fetching URL:', url);
    return {
        json: async () => ({
            status: 'OK',
            rows: [{ elements: [{ status: 'OK', duration: { value: 100 }, distance: { value: 1000 } }] }]
        })
    } as any;
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
    await POST(new MockRequest(payload) as any);

    // Second Call (Same payload)
    console.log('2. Second Request (Should hit Cache)');
    await POST(new MockRequest(payload) as any);

    // Third Call (Different payload)
    console.log('3. Third Request (Different payload, Should hit API)');
    await POST(new MockRequest({ ...payload, mode: 'walking' }) as any);

    console.log('\n--- Results ---');
    console.log(`Total Fetch Calls: ${fetchCallCount}`);

    if (fetchCallCount === 2) {
        console.log('SUCCESS: Caching works! (2 fetch calls for 3 requests)');
    } else {
        console.error(`FAILURE: Expected 2 fetch calls, got ${fetchCallCount}`);
    }

    // Cleanup
    global.fetch = originalFetch;
}

runTest();
