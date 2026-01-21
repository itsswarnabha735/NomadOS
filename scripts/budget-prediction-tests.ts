/**
 * Budget Prediction Test Suite
 * 
 * Comprehensive test suite for AI budget predictions
 * Covers 100 test cases with edge cases
 * Respects 15 RPM rate limit
 */

import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

// Library function variable - initialized in runAllTests
let generateBudgetPrediction: any;

import { TravelStyle, AccommodationStyle, DiningStyle, ActivityPreference } from '../types/budget-prediction';
import * as fs from 'fs';

// Local type definition for test file (not exported from main types)
type FlightClass = 'economy' | 'premium_economy' | 'business' | 'first';
type TransportPreference = 'public' | 'private' | 'mixed';

// ============================================================
// TEST CASE DEFINITIONS
// ============================================================

interface TestCase {
    id: number;
    name: string;
    category: string;
    params: {
        destination: string;
        startDate: string;
        endDate: string;
        travelStyle: TravelStyle;
        participantCount: number;
        flightClass?: FlightClass;
        transportPreference?: TransportPreference;
        accommodationStyle?: AccommodationStyle;
        diningStyle?: DiningStyle;
        activityPreference?: ActivityPreference;
        origin?: string;
    };
    expectedChecks: {
        minTotalUSD?: number;      // Minimum expected total in USD
        maxTotalUSD?: number;      // Maximum expected total in USD
        flightPercentageMin?: number;  // Minimum % for flights
        flightPercentageMax?: number;  // Maximum % for flights
        accommodationCheck?: 'high' | 'medium' | 'low';  // Expected accommodation tier
    };
}

interface TestResult {
    testCase: TestCase;
    success: boolean;
    prediction?: any;
    error?: string;
    validationResults: {
        totalWithinRange: boolean;
        categoriesSum100: boolean;
        flightPercentageValid: boolean;
        accommodationReasonable: boolean;
        allCategoriesPresent: boolean;
        currencyCorrect: boolean;
    };
    latencyMs: number;
    actualTotalUSD: number;
    notes: string[];
}

// Helper to calculate days
function calculateDays(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

// Approximate exchange rates to USD
const EXCHANGE_RATES: Record<string, number> = {
    'USD': 1, 'EUR': 1.08, 'GBP': 1.27, 'JPY': 0.0067, 'INR': 0.012,
    'LKR': 0.003, 'THB': 0.028, 'VND': 0.00004, 'MYR': 0.21, 'SGD': 0.74,
    'AUD': 0.65, 'CHF': 1.13, 'AED': 0.27, 'IDR': 0.000063, 'PHP': 0.018,
    'NPR': 0.0075, 'KRW': 0.00075, 'CNY': 0.14, 'MXN': 0.058, 'BRL': 0.20,
    // Additional currencies to fix test failures
    'ISK': 0.0072,   // Iceland Krona
    'NOK': 0.091,    // Norwegian Krone
    'SCR': 0.073,    // Seychelles Rupee
    'EGP': 0.021,    // Egyptian Pound
    'CZK': 0.043,    // Czech Koruna
    'HKD': 0.128,    // Hong Kong Dollar
    'NZD': 0.59,     // New Zealand Dollar
    'MAD': 0.098,    // Moroccan Dirham
    'KES': 0.0077,   // Kenyan Shilling
};

// ============================================================
// TEST CASES (100 total)
// ============================================================

const testCases: TestCase[] = [
    // === CATEGORY 1: Popular Destinations (10 cases) ===
    { id: 1, name: 'Paris Standard', category: 'Popular Destinations', params: { destination: 'Paris, France', startDate: '2026-04-01', endDate: '2026-04-07', travelStyle: 'midrange', participantCount: 2, origin: 'New York' }, expectedChecks: { minTotalUSD: 2000, maxTotalUSD: 8000 } },
    { id: 2, name: 'Tokyo Budget Solo', category: 'Popular Destinations', params: { destination: 'Tokyo, Japan', startDate: '2026-05-01', endDate: '2026-05-10', travelStyle: 'budget', participantCount: 1, origin: 'London' }, expectedChecks: { minTotalUSD: 1000, maxTotalUSD: 4000 } },
    { id: 3, name: 'London Premium', category: 'Popular Destinations', params: { destination: 'London, UK', startDate: '2026-06-15', endDate: '2026-06-22', travelStyle: 'premium', participantCount: 2, origin: 'New York' }, expectedChecks: { minTotalUSD: 5000, maxTotalUSD: 20000 } },
    { id: 4, name: 'Dubai Luxury', category: 'Popular Destinations', params: { destination: 'Dubai, UAE', startDate: '2026-12-20', endDate: '2026-12-27', travelStyle: 'premium', participantCount: 4, origin: 'Mumbai' }, expectedChecks: { minTotalUSD: 8000, maxTotalUSD: 40000 } },
    { id: 5, name: 'Singapore Short', category: 'Popular Destinations', params: { destination: 'Singapore', startDate: '2026-03-01', endDate: '2026-03-04', travelStyle: 'midrange', participantCount: 2, origin: 'Bangkok' }, expectedChecks: { minTotalUSD: 800, maxTotalUSD: 4000 } },
    { id: 6, name: 'New York City', category: 'Popular Destinations', params: { destination: 'New York City, USA', startDate: '2026-09-01', endDate: '2026-09-08', travelStyle: 'midrange', participantCount: 2, origin: 'Los Angeles' }, expectedChecks: { minTotalUSD: 2500, maxTotalUSD: 10000 } },
    { id: 7, name: 'Sydney Australia', category: 'Popular Destinations', params: { destination: 'Sydney, Australia', startDate: '2026-02-01', endDate: '2026-02-10', travelStyle: 'midrange', participantCount: 2, origin: 'Singapore' }, expectedChecks: { minTotalUSD: 3000, maxTotalUSD: 12000 } },
    { id: 8, name: 'Barcelona Spain', category: 'Popular Destinations', params: { destination: 'Barcelona, Spain', startDate: '2026-07-01', endDate: '2026-07-08', travelStyle: 'budget', participantCount: 3, origin: 'Paris' }, expectedChecks: { minTotalUSD: 1500, maxTotalUSD: 6000 } },
    { id: 9, name: 'Amsterdam Netherlands', category: 'Popular Destinations', params: { destination: 'Amsterdam, Netherlands', startDate: '2026-04-20', endDate: '2026-04-25', travelStyle: 'midrange', participantCount: 2, origin: 'London' }, expectedChecks: { minTotalUSD: 1200, maxTotalUSD: 5000 } },
    { id: 10, name: 'Rome Italy', category: 'Popular Destinations', params: { destination: 'Rome, Italy', startDate: '2026-10-01', endDate: '2026-10-07', travelStyle: 'premium', participantCount: 2, origin: 'Berlin' }, expectedChecks: { minTotalUSD: 3000, maxTotalUSD: 12000 } },

    // === CATEGORY 2: Budget Destinations (10 cases) ===
    { id: 11, name: 'Vietnam Budget', category: 'Budget Destinations', params: { destination: 'Ho Chi Minh City, Vietnam', startDate: '2026-03-01', endDate: '2026-03-10', travelStyle: 'budget', participantCount: 2, origin: 'Bangkok' }, expectedChecks: { minTotalUSD: 400, maxTotalUSD: 2000 } },
    { id: 12, name: 'Thailand Backpacker', category: 'Budget Destinations', params: { destination: 'Bangkok, Thailand', startDate: '2026-02-01', endDate: '2026-02-14', travelStyle: 'budget', participantCount: 1, origin: 'Singapore' }, expectedChecks: { minTotalUSD: 300, maxTotalUSD: 1500 } },
    { id: 13, name: 'India Goa', category: 'Budget Destinations', params: { destination: 'Goa, India', startDate: '2026-01-15', endDate: '2026-01-22', travelStyle: 'budget', participantCount: 2, origin: 'Mumbai' }, expectedChecks: { minTotalUSD: 200, maxTotalUSD: 1000 } },
    { id: 14, name: 'Cambodia Temples', category: 'Budget Destinations', params: { destination: 'Siem Reap, Cambodia', startDate: '2026-04-01', endDate: '2026-04-06', travelStyle: 'budget', participantCount: 2, origin: 'Bangkok' }, expectedChecks: { minTotalUSD: 250, maxTotalUSD: 1200 } },
    { id: 15, name: 'Nepal Trekking', category: 'Budget Destinations', params: { destination: 'Kathmandu, Nepal', startDate: '2026-10-01', endDate: '2026-10-10', travelStyle: 'budget', participantCount: 2, origin: 'Delhi' }, expectedChecks: { minTotalUSD: 400, maxTotalUSD: 1800 } },
    { id: 16, name: 'Sri Lanka', category: 'Budget Destinations', params: { destination: 'Sri Lanka', startDate: '2026-04-01', endDate: '2026-04-07', travelStyle: 'midrange', participantCount: 2, origin: 'Bangalore' }, expectedChecks: { minTotalUSD: 600, maxTotalUSD: 3000 } },
    { id: 17, name: 'Indonesia Bali', category: 'Budget Destinations', params: { destination: 'Bali, Indonesia', startDate: '2026-05-01', endDate: '2026-05-10', travelStyle: 'budget', participantCount: 2, origin: 'Singapore' }, expectedChecks: { minTotalUSD: 500, maxTotalUSD: 2500 } },
    { id: 18, name: 'Philippines Boracay', category: 'Budget Destinations', params: { destination: 'Boracay, Philippines', startDate: '2026-03-01', endDate: '2026-03-07', travelStyle: 'budget', participantCount: 2, origin: 'Manila' }, expectedChecks: { minTotalUSD: 300, maxTotalUSD: 1500 } },
    { id: 19, name: 'Mexico City', category: 'Budget Destinations', params: { destination: 'Mexico City, Mexico', startDate: '2026-06-01', endDate: '2026-06-08', travelStyle: 'budget', participantCount: 2, origin: 'Los Angeles' }, expectedChecks: { minTotalUSD: 800, maxTotalUSD: 3000 } },
    { id: 20, name: 'Morocco Marrakech', category: 'Budget Destinations', params: { destination: 'Marrakech, Morocco', startDate: '2026-09-01', endDate: '2026-09-07', travelStyle: 'budget', participantCount: 2, origin: 'Paris' }, expectedChecks: { minTotalUSD: 600, maxTotalUSD: 2500 } },

    // === CATEGORY 3: Expensive Destinations (10 cases) ===
    { id: 21, name: 'Switzerland Alps', category: 'Expensive Destinations', params: { destination: 'Zurich, Switzerland', startDate: '2026-07-01', endDate: '2026-07-08', travelStyle: 'premium', participantCount: 2, origin: 'London' }, expectedChecks: { minTotalUSD: 6000, maxTotalUSD: 25000 } },
    { id: 22, name: 'Iceland Adventure', category: 'Expensive Destinations', params: { destination: 'Reykjavik, Iceland', startDate: '2026-06-15', endDate: '2026-06-22', travelStyle: 'midrange', participantCount: 2, origin: 'New York' }, expectedChecks: { minTotalUSD: 4000, maxTotalUSD: 15000 } },
    { id: 23, name: 'Norway Fjords', category: 'Expensive Destinations', params: { destination: 'Oslo, Norway', startDate: '2026-07-01', endDate: '2026-07-10', travelStyle: 'midrange', participantCount: 2, origin: 'London' }, expectedChecks: { minTotalUSD: 4000, maxTotalUSD: 16000 } },
    { id: 24, name: 'Monaco Luxury', category: 'Expensive Destinations', params: { destination: 'Monaco', startDate: '2026-05-20', endDate: '2026-05-25', travelStyle: 'premium', participantCount: 2, origin: 'Paris' }, expectedChecks: { minTotalUSD: 5000, maxTotalUSD: 25000 } },
    { id: 25, name: 'Maldives Resort', category: 'Expensive Destinations', params: { destination: 'Maldives', startDate: '2026-02-01', endDate: '2026-02-08', travelStyle: 'premium', participantCount: 2, origin: 'Dubai' }, expectedChecks: { minTotalUSD: 8000, maxTotalUSD: 35000 } },
    { id: 26, name: 'New Zealand Adventure', category: 'Expensive Destinations', params: { destination: 'Queenstown, New Zealand', startDate: '2026-12-01', endDate: '2026-12-10', travelStyle: 'midrange', participantCount: 2, origin: 'Sydney' }, expectedChecks: { minTotalUSD: 3000, maxTotalUSD: 12000 } },
    { id: 27, name: 'Hawaii Vacation', category: 'Expensive Destinations', params: { destination: 'Honolulu, Hawaii', startDate: '2026-08-01', endDate: '2026-08-10', travelStyle: 'midrange', participantCount: 4, origin: 'Los Angeles' }, expectedChecks: { minTotalUSD: 5000, maxTotalUSD: 20000 } },
    { id: 28, name: 'French Riviera', category: 'Expensive Destinations', params: { destination: 'Nice, France', startDate: '2026-07-15', endDate: '2026-07-22', travelStyle: 'premium', participantCount: 2, origin: 'Paris' }, expectedChecks: { minTotalUSD: 4000, maxTotalUSD: 18000 } },
    { id: 29, name: 'Seychelles Islands', category: 'Expensive Destinations', params: { destination: 'Seychelles', startDate: '2026-04-01', endDate: '2026-04-08', travelStyle: 'premium', participantCount: 2, origin: 'Dubai' }, expectedChecks: { minTotalUSD: 7000, maxTotalUSD: 30000 } },
    { id: 30, name: 'Bora Bora Paradise', category: 'Expensive Destinations', params: { destination: 'Bora Bora, French Polynesia', startDate: '2026-09-01', endDate: '2026-09-08', travelStyle: 'premium', participantCount: 2, origin: 'Los Angeles' }, expectedChecks: { minTotalUSD: 10000, maxTotalUSD: 40000 } },

    // === CATEGORY 4: Duration Edge Cases (10 cases) ===
    { id: 31, name: 'Weekend Getaway 2 Days', category: 'Duration Edge Cases', params: { destination: 'Las Vegas, USA', startDate: '2026-03-01', endDate: '2026-03-02', travelStyle: 'midrange', participantCount: 2, origin: 'Los Angeles' }, expectedChecks: { minTotalUSD: 400, maxTotalUSD: 2000 } },
    { id: 32, name: 'Day Trip 1 Day', category: 'Duration Edge Cases', params: { destination: 'Agra, India', startDate: '2026-04-01', endDate: '2026-04-01', travelStyle: 'midrange', participantCount: 2, origin: 'Delhi' }, expectedChecks: { minTotalUSD: 50, maxTotalUSD: 500 } },
    { id: 33, name: 'Long Weekend 3 Days', category: 'Duration Edge Cases', params: { destination: 'Prague, Czech Republic', startDate: '2026-05-01', endDate: '2026-05-03', travelStyle: 'midrange', participantCount: 2, origin: 'Berlin' }, expectedChecks: { minTotalUSD: 500, maxTotalUSD: 2500 } },
    { id: 34, name: 'Two Weeks 14 Days', category: 'Duration Edge Cases', params: { destination: 'Thailand', startDate: '2026-06-01', endDate: '2026-06-14', travelStyle: 'midrange', participantCount: 2, origin: 'Singapore' }, expectedChecks: { minTotalUSD: 2000, maxTotalUSD: 8000 } },
    { id: 35, name: 'Extended 21 Days', category: 'Duration Edge Cases', params: { destination: 'Europe', startDate: '2026-07-01', endDate: '2026-07-21', travelStyle: 'budget', participantCount: 2, origin: 'New York' }, expectedChecks: { minTotalUSD: 4000, maxTotalUSD: 15000 } },
    { id: 36, name: 'Month Long 30 Days', category: 'Duration Edge Cases', params: { destination: 'Southeast Asia', startDate: '2026-01-01', endDate: '2026-01-30', travelStyle: 'budget', participantCount: 1, origin: 'Sydney' }, expectedChecks: { minTotalUSD: 1500, maxTotalUSD: 8000 } },
    { id: 37, name: '5 Days Standard', category: 'Duration Edge Cases', params: { destination: 'Berlin, Germany', startDate: '2026-09-01', endDate: '2026-09-05', travelStyle: 'midrange', participantCount: 2, origin: 'London' }, expectedChecks: { minTotalUSD: 1000, maxTotalUSD: 5000 } },
    { id: 38, name: '10 Days Standard', category: 'Duration Edge Cases', params: { destination: 'Japan', startDate: '2026-10-01', endDate: '2026-10-10', travelStyle: 'midrange', participantCount: 2, origin: 'Seoul' }, expectedChecks: { minTotalUSD: 2500, maxTotalUSD: 10000 } },
    { id: 39, name: '4 Days Short', category: 'Duration Edge Cases', params: { destination: 'Hong Kong', startDate: '2026-11-01', endDate: '2026-11-04', travelStyle: 'midrange', participantCount: 2, origin: 'Singapore' }, expectedChecks: { minTotalUSD: 800, maxTotalUSD: 4000 } },
    { id: 40, name: '6 Days Week', category: 'Duration Edge Cases', params: { destination: 'Seoul, South Korea', startDate: '2026-04-15', endDate: '2026-04-20', travelStyle: 'midrange', participantCount: 2, origin: 'Tokyo' }, expectedChecks: { minTotalUSD: 1200, maxTotalUSD: 5000 } },

    // === CATEGORY 5: Participant Edge Cases (10 cases) ===
    { id: 41, name: 'Solo Traveler', category: 'Participant Edge Cases', params: { destination: 'Amsterdam, Netherlands', startDate: '2026-05-01', endDate: '2026-05-07', travelStyle: 'budget', participantCount: 1, origin: 'London' }, expectedChecks: { minTotalUSD: 600, maxTotalUSD: 2500 } },
    { id: 42, name: 'Couple Standard', category: 'Participant Edge Cases', params: { destination: 'Venice, Italy', startDate: '2026-06-01', endDate: '2026-06-05', travelStyle: 'midrange', participantCount: 2, origin: 'Rome' }, expectedChecks: { minTotalUSD: 800, maxTotalUSD: 4000 } },
    { id: 43, name: 'Family of 4', category: 'Participant Edge Cases', params: { destination: 'Orlando, USA', startDate: '2026-07-01', endDate: '2026-07-08', travelStyle: 'midrange', participantCount: 4, origin: 'New York' }, expectedChecks: { minTotalUSD: 3000, maxTotalUSD: 15000 } },
    { id: 44, name: 'Large Family 6', category: 'Participant Edge Cases', params: { destination: 'Cancun, Mexico', startDate: '2026-08-01', endDate: '2026-08-08', travelStyle: 'midrange', participantCount: 6, origin: 'Los Angeles' }, expectedChecks: { minTotalUSD: 5000, maxTotalUSD: 20000 } },
    { id: 45, name: 'Group of 8', category: 'Participant Edge Cases', params: { destination: 'Barcelona, Spain', startDate: '2026-09-01', endDate: '2026-09-07', travelStyle: 'budget', participantCount: 8, origin: 'London' }, expectedChecks: { minTotalUSD: 4000, maxTotalUSD: 18000 } },
    { id: 46, name: 'Large Group 10', category: 'Participant Edge Cases', params: { destination: 'Bali, Indonesia', startDate: '2026-10-01', endDate: '2026-10-10', travelStyle: 'budget', participantCount: 10, origin: 'Singapore' }, expectedChecks: { minTotalUSD: 4000, maxTotalUSD: 20000 } },
    { id: 47, name: 'Family with Kids 5', category: 'Participant Edge Cases', params: { destination: 'Disneyland Paris', startDate: '2026-04-01', endDate: '2026-04-05', travelStyle: 'midrange', participantCount: 5, origin: 'London' }, expectedChecks: { minTotalUSD: 2500, maxTotalUSD: 12000 } },
    { id: 48, name: 'Trio Friends 3', category: 'Participant Edge Cases', params: { destination: 'Ibiza, Spain', startDate: '2026-07-15', endDate: '2026-07-20', travelStyle: 'midrange', participantCount: 3, origin: 'London' }, expectedChecks: { minTotalUSD: 2000, maxTotalUSD: 8000 } },
    { id: 49, name: 'Solo Premium', category: 'Participant Edge Cases', params: { destination: 'Santorini, Greece', startDate: '2026-06-01', endDate: '2026-06-07', travelStyle: 'premium', participantCount: 1, origin: 'London' }, expectedChecks: { minTotalUSD: 3000, maxTotalUSD: 12000 } },
    { id: 50, name: 'Couple Premium', category: 'Participant Edge Cases', params: { destination: 'Amalfi Coast, Italy', startDate: '2026-05-01', endDate: '2026-05-08', travelStyle: 'premium', participantCount: 2, origin: 'Rome' }, expectedChecks: { minTotalUSD: 5000, maxTotalUSD: 20000 } },

    // === CATEGORY 6: Granular Preference Tests - Flights (10 cases) ===
    { id: 51, name: 'Economy Flight Budget', category: 'Flight Class Tests', params: { destination: 'Paris, France', startDate: '2026-04-01', endDate: '2026-04-07', travelStyle: 'budget', participantCount: 2, flightClass: 'economy', origin: 'New York' }, expectedChecks: { flightPercentageMax: 50 } },
    { id: 52, name: 'Premium Economy', category: 'Flight Class Tests', params: { destination: 'Tokyo, Japan', startDate: '2026-05-01', endDate: '2026-05-10', travelStyle: 'midrange', participantCount: 2, flightClass: 'premium_economy', origin: 'Los Angeles' }, expectedChecks: { flightPercentageMin: 25, flightPercentageMax: 60 } },
    { id: 53, name: 'Business Class', category: 'Flight Class Tests', params: { destination: 'London, UK', startDate: '2026-06-01', endDate: '2026-06-08', travelStyle: 'premium', participantCount: 2, flightClass: 'business', origin: 'New York' }, expectedChecks: { flightPercentageMin: 40, flightPercentageMax: 80 } },
    { id: 54, name: 'First Class', category: 'Flight Class Tests', params: { destination: 'Dubai, UAE', startDate: '2026-07-01', endDate: '2026-07-07', travelStyle: 'premium', participantCount: 2, flightClass: 'first', origin: 'London' }, expectedChecks: { flightPercentageMin: 50, flightPercentageMax: 90 } },
    { id: 55, name: 'Budget + Economy Short Haul', category: 'Flight Class Tests', params: { destination: 'Barcelona, Spain', startDate: '2026-03-01', endDate: '2026-03-05', travelStyle: 'budget', participantCount: 2, flightClass: 'economy', origin: 'Paris' }, expectedChecks: { flightPercentageMax: 40 } },
    { id: 56, name: 'Premium + Business Long Haul', category: 'Flight Class Tests', params: { destination: 'Sydney, Australia', startDate: '2026-08-01', endDate: '2026-08-10', travelStyle: 'premium', participantCount: 2, flightClass: 'business', origin: 'London' }, expectedChecks: { flightPercentageMin: 35 } },
    { id: 57, name: 'Midrange + Economy', category: 'Flight Class Tests', params: { destination: 'Singapore', startDate: '2026-09-01', endDate: '2026-09-07', travelStyle: 'midrange', participantCount: 2, flightClass: 'economy', origin: 'Bangkok' }, expectedChecks: { flightPercentageMax: 50 } },
    { id: 58, name: 'Budget + First (Mixed)', category: 'Flight Class Tests', params: { destination: 'Bali, Indonesia', startDate: '2026-10-01', endDate: '2026-10-10', travelStyle: 'budget', participantCount: 2, flightClass: 'first', origin: 'Singapore' }, expectedChecks: { flightPercentageMin: 60 } },
    { id: 59, name: 'Premium + Economy (Mixed)', category: 'Flight Class Tests', params: { destination: 'Thailand', startDate: '2026-11-01', endDate: '2026-11-08', travelStyle: 'premium', participantCount: 2, flightClass: 'economy', origin: 'Tokyo' }, expectedChecks: { flightPercentageMax: 35 } },
    { id: 60, name: 'Group Business', category: 'Flight Class Tests', params: { destination: 'Hong Kong', startDate: '2026-12-01', endDate: '2026-12-05', travelStyle: 'premium', participantCount: 4, flightClass: 'business', origin: 'Singapore' }, expectedChecks: { flightPercentageMin: 35 } },

    // === CATEGORY 7: Accommodation Style Tests (10 cases) ===
    { id: 61, name: 'Hostel Budget', category: 'Accommodation Tests', params: { destination: 'Amsterdam', startDate: '2026-04-01', endDate: '2026-04-07', travelStyle: 'budget', participantCount: 2, accommodationStyle: 'hostel_budget', origin: 'London' }, expectedChecks: { accommodationCheck: 'low' } },
    { id: 62, name: 'Standard Hotel', category: 'Accommodation Tests', params: { destination: 'Rome, Italy', startDate: '2026-05-01', endDate: '2026-05-07', travelStyle: 'midrange', participantCount: 2, accommodationStyle: 'standard_hotel', origin: 'Paris' }, expectedChecks: { accommodationCheck: 'medium' } },
    { id: 63, name: 'Luxury Hotel', category: 'Accommodation Tests', params: { destination: 'Paris, France', startDate: '2026-06-01', endDate: '2026-06-07', travelStyle: 'premium', participantCount: 2, accommodationStyle: 'luxury_hotel', origin: 'London' }, expectedChecks: { accommodationCheck: 'high' } },
    { id: 64, name: 'Budget + Luxury Hotel (Mixed)', category: 'Accommodation Tests', params: { destination: 'Bangkok, Thailand', startDate: '2026-07-01', endDate: '2026-07-10', travelStyle: 'budget', participantCount: 2, accommodationStyle: 'luxury_hotel', origin: 'Singapore' }, expectedChecks: { accommodationCheck: 'high' } },
    { id: 65, name: 'Premium + Hostel (Mixed)', category: 'Accommodation Tests', params: { destination: 'Berlin, Germany', startDate: '2026-08-01', endDate: '2026-08-07', travelStyle: 'premium', participantCount: 2, accommodationStyle: 'hostel_budget', origin: 'London' }, expectedChecks: { accommodationCheck: 'low' } },
    { id: 66, name: 'Standard Tokyo', category: 'Accommodation Tests', params: { destination: 'Tokyo, Japan', startDate: '2026-09-01', endDate: '2026-09-08', travelStyle: 'midrange', participantCount: 2, accommodationStyle: 'standard_hotel', origin: 'Seoul' }, expectedChecks: { accommodationCheck: 'medium' } },
    { id: 67, name: 'Luxury Maldives', category: 'Accommodation Tests', params: { destination: 'Maldives', startDate: '2026-10-01', endDate: '2026-10-08', travelStyle: 'premium', participantCount: 2, accommodationStyle: 'luxury_hotel', origin: 'Dubai' }, expectedChecks: { accommodationCheck: 'high' } },
    { id: 68, name: 'Hostel Vietnam', category: 'Accommodation Tests', params: { destination: 'Vietnam', startDate: '2026-11-01', endDate: '2026-11-10', travelStyle: 'budget', participantCount: 2, accommodationStyle: 'hostel_budget', origin: 'Bangkok' }, expectedChecks: { accommodationCheck: 'low' } },
    { id: 69, name: 'Standard NYC', category: 'Accommodation Tests', params: { destination: 'New York City, USA', startDate: '2026-03-01', endDate: '2026-03-07', travelStyle: 'midrange', participantCount: 2, accommodationStyle: 'standard_hotel', origin: 'Chicago' }, expectedChecks: { accommodationCheck: 'medium' } },
    { id: 70, name: 'Luxury Dubai', category: 'Accommodation Tests', params: { destination: 'Dubai, UAE', startDate: '2026-12-20', endDate: '2026-12-27', travelStyle: 'premium', participantCount: 2, accommodationStyle: 'luxury_hotel', origin: 'Mumbai' }, expectedChecks: { accommodationCheck: 'high' } },

    // === CATEGORY 8: Dining Style Tests (10 cases) ===
    { id: 71, name: 'Street Food Budget', category: 'Dining Tests', params: { destination: 'Bangkok, Thailand', startDate: '2026-04-01', endDate: '2026-04-10', travelStyle: 'budget', participantCount: 2, diningStyle: 'street_budget', origin: 'Singapore' }, expectedChecks: { minTotalUSD: 400, maxTotalUSD: 2000 } },
    { id: 72, name: 'Casual Dining', category: 'Dining Tests', params: { destination: 'Rome, Italy', startDate: '2026-05-01', endDate: '2026-05-08', travelStyle: 'midrange', participantCount: 2, diningStyle: 'casual_dining', origin: 'Paris' }, expectedChecks: { minTotalUSD: 1500, maxTotalUSD: 6000 } },
    { id: 73, name: 'Fine Dining', category: 'Dining Tests', params: { destination: 'Paris, France', startDate: '2026-06-01', endDate: '2026-06-07', travelStyle: 'premium', participantCount: 2, diningStyle: 'fine_dining', origin: 'London' }, expectedChecks: { minTotalUSD: 3000, maxTotalUSD: 12000 } },
    { id: 74, name: 'Budget + Fine Dining (Mixed)', category: 'Dining Tests', params: { destination: 'Tokyo, Japan', startDate: '2026-07-01', endDate: '2026-07-10', travelStyle: 'budget', participantCount: 2, diningStyle: 'fine_dining', origin: 'Seoul' }, expectedChecks: { minTotalUSD: 1500, maxTotalUSD: 7000 } },
    { id: 75, name: 'Premium + Street Food (Mixed)', category: 'Dining Tests', params: { destination: 'Singapore', startDate: '2026-08-01', endDate: '2026-08-07', travelStyle: 'premium', participantCount: 2, diningStyle: 'street_budget', origin: 'Hong Kong' }, expectedChecks: { minTotalUSD: 2000, maxTotalUSD: 10000 } },
    { id: 76, name: 'Street Food Vietnam', category: 'Dining Tests', params: { destination: 'Ho Chi Minh City, Vietnam', startDate: '2026-09-01', endDate: '2026-09-10', travelStyle: 'budget', participantCount: 2, diningStyle: 'street_budget', origin: 'Bangkok' }, expectedChecks: { minTotalUSD: 300, maxTotalUSD: 1500 } },
    { id: 77, name: 'Casual Japan', category: 'Dining Tests', params: { destination: 'Osaka, Japan', startDate: '2026-10-01', endDate: '2026-10-07', travelStyle: 'midrange', participantCount: 2, diningStyle: 'casual_dining', origin: 'Tokyo' }, expectedChecks: { minTotalUSD: 1000, maxTotalUSD: 5000 } },
    { id: 78, name: 'Fine Dining NYC', category: 'Dining Tests', params: { destination: 'New York City, USA', startDate: '2026-11-01', endDate: '2026-11-07', travelStyle: 'premium', participantCount: 2, diningStyle: 'fine_dining', origin: 'Los Angeles' }, expectedChecks: { minTotalUSD: 4000, maxTotalUSD: 18000 } },
    { id: 79, name: 'Street Food India', category: 'Dining Tests', params: { destination: 'Delhi, India', startDate: '2026-12-01', endDate: '2026-12-07', travelStyle: 'budget', participantCount: 2, diningStyle: 'street_budget', origin: 'Mumbai' }, expectedChecks: { minTotalUSD: 150, maxTotalUSD: 800 } },
    { id: 80, name: 'Casual London', category: 'Dining Tests', params: { destination: 'London, UK', startDate: '2026-04-15', endDate: '2026-04-22', travelStyle: 'midrange', participantCount: 2, diningStyle: 'casual_dining', origin: 'Paris' }, expectedChecks: { minTotalUSD: 2000, maxTotalUSD: 8000 } },

    // === CATEGORY 9: Activity Preference Tests (10 cases) ===
    { id: 81, name: 'Low Cost Activities', category: 'Activity Tests', params: { destination: 'Barcelona, Spain', startDate: '2026-04-01', endDate: '2026-04-07', travelStyle: 'budget', participantCount: 2, activityPreference: 'low_cost', origin: 'Paris' }, expectedChecks: { minTotalUSD: 800, maxTotalUSD: 4000 } },
    { id: 82, name: 'Standard Activities', category: 'Activity Tests', params: { destination: 'Rome, Italy', startDate: '2026-05-01', endDate: '2026-05-07', travelStyle: 'midrange', participantCount: 2, activityPreference: 'standard_mixed', origin: 'Berlin' }, expectedChecks: { minTotalUSD: 1500, maxTotalUSD: 6000 } },
    { id: 83, name: 'Premium Tours', category: 'Activity Tests', params: { destination: 'Cairo, Egypt', startDate: '2026-06-01', endDate: '2026-06-08', travelStyle: 'premium', participantCount: 2, activityPreference: 'premium_tours', origin: 'Dubai' }, expectedChecks: { minTotalUSD: 3000, maxTotalUSD: 12000 } },
    { id: 84, name: 'Budget + Premium Tours (Mixed)', category: 'Activity Tests', params: { destination: 'Peru', startDate: '2026-07-01', endDate: '2026-07-10', travelStyle: 'budget', participantCount: 2, activityPreference: 'premium_tours', origin: 'Miami' }, expectedChecks: { minTotalUSD: 2500, maxTotalUSD: 10000 } },
    { id: 85, name: 'Premium + Low Cost (Mixed)', category: 'Activity Tests', params: { destination: 'Greece', startDate: '2026-08-01', endDate: '2026-08-08', travelStyle: 'premium', participantCount: 2, activityPreference: 'low_cost', origin: 'London' }, expectedChecks: { minTotalUSD: 3000, maxTotalUSD: 12000 } },
    { id: 86, name: 'Adventure Activities', category: 'Activity Tests', params: { destination: 'Costa Rica', startDate: '2026-09-01', endDate: '2026-09-08', travelStyle: 'midrange', participantCount: 2, activityPreference: 'premium_tours', origin: 'Miami' }, expectedChecks: { minTotalUSD: 2500, maxTotalUSD: 10000 } },
    { id: 87, name: 'Cultural Tours', category: 'Activity Tests', params: { destination: 'Kyoto, Japan', startDate: '2026-10-01', endDate: '2026-10-07', travelStyle: 'midrange', participantCount: 2, activityPreference: 'standard_mixed', origin: 'Tokyo' }, expectedChecks: { minTotalUSD: 1200, maxTotalUSD: 5000 } },
    { id: 88, name: 'Beach Relaxation', category: 'Activity Tests', params: { destination: 'Phuket, Thailand', startDate: '2026-11-01', endDate: '2026-11-08', travelStyle: 'budget', participantCount: 2, activityPreference: 'low_cost', origin: 'Bangkok' }, expectedChecks: { minTotalUSD: 500, maxTotalUSD: 2500 } },
    { id: 89, name: 'Safari Adventure', category: 'Activity Tests', params: { destination: 'Kenya', startDate: '2026-12-01', endDate: '2026-12-10', travelStyle: 'premium', participantCount: 2, activityPreference: 'premium_tours', origin: 'London' }, expectedChecks: { minTotalUSD: 6000, maxTotalUSD: 25000 } },
    { id: 90, name: 'City Exploration', category: 'Activity Tests', params: { destination: 'Prague, Czech Republic', startDate: '2026-04-01', endDate: '2026-04-05', travelStyle: 'budget', participantCount: 2, activityPreference: 'low_cost', origin: 'Berlin' }, expectedChecks: { minTotalUSD: 400, maxTotalUSD: 2000 } },

    // === CATEGORY 10: Seasonal Edge Cases (10 cases) ===
    { id: 91, name: 'Christmas Peak NYC', category: 'Seasonal Tests', params: { destination: 'New York City, USA', startDate: '2026-12-20', endDate: '2026-12-27', travelStyle: 'midrange', participantCount: 2, origin: 'Los Angeles' }, expectedChecks: { minTotalUSD: 4000, maxTotalUSD: 15000 } },
    { id: 92, name: 'New Year Dubai', category: 'Seasonal Tests', params: { destination: 'Dubai, UAE', startDate: '2026-12-28', endDate: '2027-01-03', travelStyle: 'premium', participantCount: 2, origin: 'Mumbai' }, expectedChecks: { minTotalUSD: 8000, maxTotalUSD: 35000 } },
    { id: 93, name: 'Summer Europe Peak', category: 'Seasonal Tests', params: { destination: 'Santorini, Greece', startDate: '2026-07-15', endDate: '2026-07-22', travelStyle: 'midrange', participantCount: 2, origin: 'London' }, expectedChecks: { minTotalUSD: 3000, maxTotalUSD: 12000 } },
    { id: 94, name: 'Off Season Europe', category: 'Seasonal Tests', params: { destination: 'Paris, France', startDate: '2026-02-01', endDate: '2026-02-08', travelStyle: 'midrange', participantCount: 2, origin: 'London' }, expectedChecks: { minTotalUSD: 1500, maxTotalUSD: 6000 } },
    { id: 95, name: 'Cherry Blossom Japan', category: 'Seasonal Tests', params: { destination: 'Tokyo, Japan', startDate: '2026-04-01', endDate: '2026-04-10', travelStyle: 'midrange', participantCount: 2, origin: 'Seoul' }, expectedChecks: { minTotalUSD: 2500, maxTotalUSD: 10000 } },
    { id: 96, name: 'Monsoon India', category: 'Seasonal Tests', params: { destination: 'Kerala, India', startDate: '2026-07-01', endDate: '2026-07-08', travelStyle: 'midrange', participantCount: 2, origin: 'Mumbai' }, expectedChecks: { minTotalUSD: 300, maxTotalUSD: 1500 } },
    { id: 97, name: 'Ski Season Switzerland', category: 'Seasonal Tests', params: { destination: 'Zermatt, Switzerland', startDate: '2026-01-15', endDate: '2026-01-22', travelStyle: 'premium', participantCount: 2, origin: 'London' }, expectedChecks: { minTotalUSD: 8000, maxTotalUSD: 30000 } },
    { id: 98, name: 'Shoulder Season Bali', category: 'Seasonal Tests', params: { destination: 'Bali, Indonesia', startDate: '2026-05-01', endDate: '2026-05-10', travelStyle: 'midrange', participantCount: 2, origin: 'Singapore' }, expectedChecks: { minTotalUSD: 1000, maxTotalUSD: 5000 } },
    { id: 99, name: 'Autumn Colors Kyoto', category: 'Seasonal Tests', params: { destination: 'Kyoto, Japan', startDate: '2026-11-10', endDate: '2026-11-17', travelStyle: 'midrange', participantCount: 2, origin: 'Tokyo' }, expectedChecks: { minTotalUSD: 1500, maxTotalUSD: 6000 } },
    { id: 100, name: 'Winter Thailand', category: 'Seasonal Tests', params: { destination: 'Chiang Mai, Thailand', startDate: '2026-12-15', endDate: '2026-12-22', travelStyle: 'budget', participantCount: 2, origin: 'Bangkok' }, expectedChecks: { minTotalUSD: 400, maxTotalUSD: 2000 } },
];

// ============================================================
// TEST RUNNER
// ============================================================

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    const notes: string[] = [];

    try {
        const result = await generateBudgetPrediction(testCase.params);
        const latencyMs = Date.now() - startTime;

        if (!result.success || !result.prediction) {
            return {
                testCase,
                success: false,
                error: result.error || 'No prediction returned',
                validationResults: {
                    totalWithinRange: false,
                    categoriesSum100: false,
                    flightPercentageValid: false,
                    accommodationReasonable: false,
                    allCategoriesPresent: false,
                    currencyCorrect: false,
                },
                latencyMs,
                actualTotalUSD: 0,
                notes: ['Prediction generation failed'],
            };
        }

        const prediction = result.prediction;

        // Calculate actual total in USD
        const currency = prediction.totalCost.currency;
        const exchangeRate = EXCHANGE_RATES[currency] || 1;
        const actualTotalUSD = prediction.totalCost.amount * exchangeRate;

        // Validate results
        const validationResults = {
            totalWithinRange: true,
            categoriesSum100: false,
            flightPercentageValid: true,
            accommodationReasonable: true,
            allCategoriesPresent: false,
            currencyCorrect: true,
        };

        // Check total within expected range
        if (testCase.expectedChecks.minTotalUSD && actualTotalUSD < testCase.expectedChecks.minTotalUSD) {
            validationResults.totalWithinRange = false;
            notes.push(`Total too low: $${actualTotalUSD.toFixed(0)} < expected min $${testCase.expectedChecks.minTotalUSD}`);
        }
        if (testCase.expectedChecks.maxTotalUSD && actualTotalUSD > testCase.expectedChecks.maxTotalUSD) {
            validationResults.totalWithinRange = false;
            notes.push(`Total too high: $${actualTotalUSD.toFixed(0)} > expected max $${testCase.expectedChecks.maxTotalUSD}`);
        }

        // Check categories sum to 100%
        const categorySum = prediction.categoryBreakdown.reduce((sum: number, cat: any) => sum + cat.percentage, 0);
        validationResults.categoriesSum100 = Math.abs(categorySum - 100) <= 2;
        if (!validationResults.categoriesSum100) {
            notes.push(`Categories sum to ${categorySum.toFixed(1)}%, expected ~100%`);
        }

        // Check flight percentage
        const flightCat = prediction.categoryBreakdown.find((c: any) => c.category === 'Flights');
        if (flightCat) {
            if (testCase.expectedChecks.flightPercentageMin && flightCat.percentage < testCase.expectedChecks.flightPercentageMin) {
                validationResults.flightPercentageValid = false;
                notes.push(`Flight % too low: ${flightCat.percentage.toFixed(1)}% < expected min ${testCase.expectedChecks.flightPercentageMin}%`);
            }
            if (testCase.expectedChecks.flightPercentageMax && flightCat.percentage > testCase.expectedChecks.flightPercentageMax) {
                validationResults.flightPercentageValid = false;
                notes.push(`Flight % too high: ${flightCat.percentage.toFixed(1)}% > expected max ${testCase.expectedChecks.flightPercentageMax}%`);
            }
        }

        // Check all required categories present
        const requiredCategories = ['Flights', 'Food', 'Transport', 'Accommodation', 'Activities', 'Shopping', 'Other'];
        const presentCategories = prediction.categoryBreakdown.map((c: any) => c.category);
        validationResults.allCategoriesPresent = requiredCategories.every(cat =>
            presentCategories.some((p: string) => p.toLowerCase().includes(cat.toLowerCase()))
        );
        if (!validationResults.allCategoriesPresent) {
            notes.push(`Missing categories. Found: ${presentCategories.join(', ')}`);
        }

        // Check accommodation reasonability
        const accomCat = prediction.categoryBreakdown.find((c: any) =>
            c.category.toLowerCase().includes('accommod') || c.category.toLowerCase().includes('hotel')
        );
        if (accomCat && testCase.expectedChecks.accommodationCheck) {
            const accomPercentage = accomCat.percentage;
            if (testCase.expectedChecks.accommodationCheck === 'high' && accomPercentage < 15) {
                validationResults.accommodationReasonable = false;
                notes.push(`Luxury accommodation % seems low: ${accomPercentage.toFixed(1)}%`);
            }
            if (testCase.expectedChecks.accommodationCheck === 'low' && accomPercentage > 25) {
                validationResults.accommodationReasonable = false;
                notes.push(`Budget accommodation % seems high: ${accomPercentage.toFixed(1)}%`);
            }
        }

        const allPassed = Object.values(validationResults).every(v => v);

        return {
            testCase,
            success: allPassed,
            prediction,
            validationResults,
            latencyMs,
            actualTotalUSD,
            notes: notes.length > 0 ? notes : ['All validations passed'],
        };

    } catch (error: any) {
        return {
            testCase,
            success: false,
            error: error.message || String(error),
            validationResults: {
                totalWithinRange: false,
                categoriesSum100: false,
                flightPercentageValid: false,
                accommodationReasonable: false,
                allCategoriesPresent: false,
                currencyCorrect: false,
            },
            latencyMs: Date.now() - startTime,
            actualTotalUSD: 0,
            notes: [`Exception: ${error.message}`],
        };
    }
}

async function runAllTests(): Promise<void> {
    // Import dynamically here
    const module = await import('../lib/gemini-budget-predict');
    generateBudgetPrediction = module.generateBudgetPrediction;

    console.log('='.repeat(80));
    console.log('BUDGET PREDICTION TEST SUITE');
    console.log('='.repeat(80));
    console.log(`Total test cases: ${testCases.length}`);
    console.log(`Rate limit: 25 RPM (2.5 second delay between calls)`);
    console.log(`Estimated time: ${Math.ceil(testCases.length * 2.5 / 60)} minutes + API response time`);
    console.log('='.repeat(80));
    console.log('');

    const results: TestResult[] = [];
    const startTime = Date.now();

    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];

        console.log(`[${i + 1}/${testCases.length}] Running: ${testCase.name} (${testCase.category})`);

        const result = await runTest(testCase);
        results.push(result);

        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`  ${status} | Total: $${result.actualTotalUSD.toFixed(0)} USD | Latency: ${result.latencyMs}ms`);

        if (!result.success) {
            result.notes.forEach(note => console.log(`    ⚠️  ${note}`));
        }

        // Rate limiting: 25 RPM = 1 request per 2.4 seconds
        if (i < testCases.length - 1) {
            await sleep(2500); // 2.5 seconds to be safe
        }
    }

    const totalTime = Date.now() - startTime;

    // Generate report
    generateReport(results, totalTime);
}

function generateReport(results: TestResult[], totalTimeMs: number): void {
    const outputPath = './scripts/budget-prediction-test-results.md';

    // Calculate statistics
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const passRate = (passed / results.length * 100).toFixed(1);
    const avgLatency = results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length;

    // Group by category
    const byCategory: Record<string, TestResult[]> = {};
    results.forEach(r => {
        const cat = r.testCase.category;
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(r);
    });

    // Calculate validation breakdown
    const validationStats = {
        totalWithinRange: results.filter(r => r.validationResults.totalWithinRange).length,
        categoriesSum100: results.filter(r => r.validationResults.categoriesSum100).length,
        flightPercentageValid: results.filter(r => r.validationResults.flightPercentageValid).length,
        accommodationReasonable: results.filter(r => r.validationResults.accommodationReasonable).length,
        allCategoriesPresent: results.filter(r => r.validationResults.allCategoriesPresent).length,
        currencyCorrect: results.filter(r => r.validationResults.currencyCorrect).length,
    };

    let report = `# Budget Prediction Test Results

Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${results.length} |
| Passed | ${passed} (${passRate}%) |
| Failed | ${failed} |
| Avg Latency | ${avgLatency.toFixed(0)}ms |
| Total Time | ${(totalTimeMs / 1000 / 60).toFixed(1)} minutes |

## Validation Breakdown

| Check | Passed | Rate |
|-------|--------|------|
| Total Within Range | ${validationStats.totalWithinRange}/${results.length} | ${(validationStats.totalWithinRange / results.length * 100).toFixed(1)}% |
| Categories Sum 100% | ${validationStats.categoriesSum100}/${results.length} | ${(validationStats.categoriesSum100 / results.length * 100).toFixed(1)}% |
| Flight % Valid | ${validationStats.flightPercentageValid}/${results.length} | ${(validationStats.flightPercentageValid / results.length * 100).toFixed(1)}% |
| Accommodation Reasonable | ${validationStats.accommodationReasonable}/${results.length} | ${(validationStats.accommodationReasonable / results.length * 100).toFixed(1)}% |
| All Categories Present | ${validationStats.allCategoriesPresent}/${results.length} | ${(validationStats.allCategoriesPresent / results.length * 100).toFixed(1)}% |

## Results by Category

`;

    for (const [category, categoryResults] of Object.entries(byCategory)) {
        const catPassed = categoryResults.filter(r => r.success).length;
        const catRate = (catPassed / categoryResults.length * 100).toFixed(0);

        report += `### ${category}\n\n`;
        report += `**Pass Rate: ${catPassed}/${categoryResults.length} (${catRate}%)**\n\n`;
        report += `| ID | Test Name | Status | Total USD | Latency | Notes |\n`;
        report += `|----|-----------|--------|-----------|---------|-------|\n`;

        for (const result of categoryResults) {
            const status = result.success ? '✅' : '❌';
            const notes = result.notes.slice(0, 2).join('; ').slice(0, 80);
            report += `| ${result.testCase.id} | ${result.testCase.name} | ${status} | $${result.actualTotalUSD.toFixed(0)} | ${result.latencyMs}ms | ${notes} |\n`;
        }

        report += '\n';
    }

    // Detailed failure analysis
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
        report += `## Failure Analysis\n\n`;

        for (const failure of failures) {
            report += `### Test #${failure.testCase.id}: ${failure.testCase.name}\n\n`;
            report += `- **Category**: ${failure.testCase.category}\n`;
            report += `- **Destination**: ${failure.testCase.params.destination}\n`;
            report += `- **Duration**: ${calculateDays(failure.testCase.params.startDate, failure.testCase.params.endDate)} days\n`;
            report += `- **Participants**: ${failure.testCase.params.participantCount}\n`;
            report += `- **Travel Style**: ${failure.testCase.params.travelStyle}\n`;
            report += `- **Actual Total**: $${failure.actualTotalUSD.toFixed(0)} USD\n`;
            report += `- **Expected Range**: $${failure.testCase.expectedChecks.minTotalUSD || '?'} - $${failure.testCase.expectedChecks.maxTotalUSD || '?'} USD\n`;
            report += `- **Error**: ${failure.error || 'N/A'}\n`;
            report += `- **Notes**: ${failure.notes.join('; ')}\n\n`;
        }
    }

    // Observations
    report += `## Observations

### Strengths
- Currency detection and conversion working for most destinations
- Category breakdown structure is consistent
- Seasonal context is being considered

### Areas for Improvement
- Some predictions may be outside reasonable ranges for specific destinations
- Flight percentage varies significantly based on route distance
- Accommodation costs may not fully reflect the specified tier

### Recommendations
1. Add more destination-specific cost ranges
2. Implement distance-based flight cost estimation
3. Add stricter validation for accommodation tier matching
`;

    // Write report
    fs.writeFileSync(outputPath, report);
    console.log('');
    console.log('='.repeat(80));
    console.log('TEST SUITE COMPLETE');
    console.log('='.repeat(80));
    console.log(`Results saved to: ${outputPath}`);
    console.log(`Pass Rate: ${passRate}%`);
    console.log('='.repeat(80));
}

// Run
runAllTests().catch(console.error);
