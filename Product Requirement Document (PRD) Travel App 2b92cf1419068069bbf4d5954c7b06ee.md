# Product Requirement Document (PRD): Travel App

## 1. Executive Summary

Travel App **NomadOS** is a comprehensive web application designed to assist travelers in planning, organizing, and managing every aspect of their trips. The app consolidates itinerary planning, document management, budget tracking, and real-time environment data (weather, location) into a single unified platform. It leverages web technologies and AI integration (Gemini) to provide intelligent assistance.

## 2. Target Audience

- **Primary Users:** Leisure and business travelers who need to organize trip details, manage expenses, and access travel documents on the go.
- **Secondary Users:** Group travelers requiring shared itinerary reference (implied via trip management).

## 3. Core Functional Requirements & Use Cases

### 3.1 User Authentication & Account Management

**Goal:** Securely manage user identity and personal data.

- **Use Case 1: Sign Up**
    - User can create a new account using email, password, and name.
    - System validates email format and password strength.
- **Use Case 2: Sign In**
    - User can log in with registered credentials.
    - System maintains session state for seamless access.
- **Use Case 3: Profile Management**
    - User can view their profile details.
    - **Data Stored:** Name, Email, Phone Number, Preferences.

### 3.2 Trip Management

**Goal:** Act as the central hub for all travel instances.

- **Use Case 4: Create Trip**
    - User can start a new trip by defining the Destination, Start Date, and End Date.
- **Use Case 5: View Trip Gallery**
    - User can browse a visual gallery of all upcoming and past trips.
- **Use Case 6: Edit Trip Details**
    - User can modify dates or destination names for existing trips.
- **Use Case 7: Delete Trip**
    - User can permanently remove a trip and all associated data (itineraries, budgets, docs).

### 3.3 Itinerary Planning & Optimization

**Goal:** Organize daily activities and optimize travel routes.

- **Use Case 8: Daily Schedule Management**
    - User can view a day-by-day breakdown of their trip.
    - User can add specific activities or "Points of Interest" (POIs) to specific days.
- **Use Case 9: POI Management**
    - User can search for places (using Google Places API) and add them to the itinerary.
    - User can reorder POIs within a day using drag-and-drop functionality.
- **Use Case 10: Route Optimization**
    - System provides suggestions for the most optimal route between selected POIs to save time.

### 3.4 Smart Document Management

**Goal:** Store and analyze essential travel documents securely.

- **Use Case 11: Document Scanning**
    - User can use the device camera to scan physical documents (passports, tickets, visas).
- **Use Case 12: AI Document Analysis**
    - System (via Gemini API) automatically extracts key information from scanned docs (e.g., extracting flight numbers or dates from a ticket).
- **Use Case 13: Document Categorization**
    - User can tag documents by category (e.g., "Identity," "Tickets," "Reservations").

### 3.5 Budgeting & Expense Tracking

**Goal:** Prevent overspending and visualize financial data.

- **Use Case 14: Set Budget**
    - User can define a total budget cap for the trip.
- **Use Case 15: Log Expenses**
    - User can record individual expenditures, assigning them to categories (e.g., Food, Transport, Accommodation).
- **Use Case 16: Visual Analytics**
    - User can view charts/graphs showing spending distribution vs. total budget.

### 3.6 Weather Services

**Goal:** Prepare users for environmental conditions.

- **Use Case 17: Live Weather Check**
    - User can view current weather conditions for their trip destination.
- **Use Case 18: Forecasts**
    - User can view daily weather forecasts for the duration of their trip.
- **Use Case 19: Weather Alerts**
    - System sends notifications for adverse weather conditions.
    - System provides weather-based packing or travel suggestions.

### 3.7 Location & Discovery Services

**Goal:** Help users explore their surroundings.

- **Use Case 20: Nearby Places Discovery**
    - User can find nearby attractions and points of interest based on current location.
- **Use Case 21: Restaurant Recommendations**
    - User can receive AI-powered restaurant suggestions based on preferences and location.
- **Use Case 22: Place Details**
    - User can view details (photos, ratings) for specific locations via Google Places integration.

### 3.8 Calendar Integration

**Goal:** Synchronize travel plans with the user's personal life.

- **Use Case 23: Calendar Sync**
    - User can sync trip dates and specific itinerary events to their device's Google Calendar.
- **Use Case 24: Event Reminders**
    - System creates reminders for critical trip events automatically.

### 3.9 Travel Essentials

**Goal:** Ensure users don't forget important items.

- **Use Case 25: Checklist Management**
    - User can create and manage packing checklists.
    - System provides predefined checklists based on travel type.

## 4. Technical Use Cases & Background Services

### 4.1 Notifications & Services

- **Weather Notification Service:** Background service that actively monitors weather changes and pushes alerts to the user.
- **Restaurant Notification Worker:** Background worker that processes location data to fetch and notify users of dining options.
- **Crash Reporting:** Custom crash handler captures and logs application errors for stability improvement (Screen: `CrashReports`).

### 4.2 Integration Points

- **Google Gemini API:** Backend for "Smart" features (Restaurant suggestions, Document OCR).
- **Google Maps & Places API:** Backend for all map views, place searches, and location data.
- **OpenWeather/Weather API:** Source for real-time weather data.

## 5. User Flow Architecture

Based on the navigation graph, the high-level user flow is:

1. **Onboarding:** Landing Page -> Sign In / Sign Up.
2. **Dashboard:** Trip Gallery (Main Hub).
3. **Trip Context:** Selecting a trip leads to the `TripDetails` screen.
4. **Feature Tabs:** Within Trip Details, the user navigates between:
    - *Itinerary* (Planning)
    - *Budget* (Finances)
    - *Docs* (Storage)
    - *Weather* (Forecasts)
    - *Essentials* (Checklists)

## 6. Non-Functional Requirements

- **Architecture:** MVVM with Clean Architecture principles.
- **Offline Capability:** Room Database integration implies local caching for access without internet (though live API features like Weather/Maps require connection).
- **Security:** Secure storage for sensitive travel documents; authenticated API calls.
- **Scalability:** Modular design using Hilt Dependency Injection to allow easy addition of new features.

## 7. Data Domain Model

The application relies on a robust local database structure (implied Room Database) synchronized with remote data where necessary.

### 7.1 Core Entities

- **User**
    - **Description:** Represents the account holder.
    - **Attributes:** Personal information, list of `Trips`, `Preferences` (e.g., currency, notification settings), and authentication credentials.
- **Trip**
    - **Description:** The central entity linking all other travel data.
    - **Attributes:**
        - `id`: Unique identifier.
        - `name`: Display name of the trip.
        - `startDate` / `endDate`: Duration of the trip.
        - `destination`: Target location.
        - **Relationships:** Contains lists of `Itinerary`, `Document`, `Budget`, and `Essentials`.
- **Itinerary**
    - **Description:** Represents the schedule for a specific day or the entire trip.
    - **Attributes:** Daily schedules, ordered list of "Points of Interest" (POIs), and specific activities.
- **Document**
    - **Description:** Digital records of physical travel papers.
    - **Attributes:** `metadata` (name, date), `type` (Passport, Visa, Ticket), and `extractedInformation` (text parsed via AI).
- **Budget**
    - **Description:** Financial tracking container.
    - **Attributes:** `totalBudget` (cap), `summary` (calculated remaining), `expenseCategories` (food, travel), and a list of individual `Expenditures`.
- **WeatherInfo**
    - **Description:** Snapshot of environmental data.
    - **Attributes:** Current conditions, daily forecasts, weather alerts, and location-specific metrics.

## 8. Detailed UI/UX Requirements

The application utilizes Jetpack Compose for a modern, reactive user interface. The navigation structure is flat for the main gallery but hierarchical for specific trip details.

### 8.1 Onboarding & Authentication

- **Screens:** `Landing`, `Signin`, `Signup`.
- **Requirements:**
    - **Landing:** High-impact visual introduction with a "Get Started" call to action.
    - **Auth:** Clean input forms for email/password with error handling (e.g., "User not found") displayed via Snackbars or text fields.

### 8.2 Main Dashboard

- **Screen:** `TripsGallery`.
- **Requirements:**
    - **Trip Cards:** Display summary of each trip (Name, Dates, Image of destination).
    - **Add Button:** Floating Action Button (FAB) or prominent button to navigate to `CreateTrip`.
    - **Navigation:** Tapping a card opens the `TripDetails` screen for that specific ID.

### 8.3 Trip Details Hub

- **Screen:** `TripDetails`.
- **Requirements:**
    - **Tab Navigation:** A top or bottom bar allowing quick switching between functional modules:
        1. **Itinerary Tab:** Timeline view of daily activities.
        2. **Budget Tab:** Pie charts/graphs and list of expenses.
        3. **Docs Tab:** Grid/List view of scanned documents.
        4. **Essentials Tab:** Checklist view with check/uncheck states.
    - **Context:** The screen must persist the `tripId` to ensure data added (e.g., a new expense) is linked to the correct trip.

### 8.4 Functional Screens & Dialogs

- **Create Trip:** Form to input Name, Destination, and Dates.
- **Nearby Restaurants:** (`NearbyRestaurants` screen) A location-aware list fetching data from the Places API and Gemini AI to suggest dining options.
- **Map View:** Integration of Google Maps to show pins for itinerary POIs.
- **Camera Interface:** Custom UI for the Document Scanner to capture and crop document images.
- **Calendar Settings:** (`CalendarSettings` screen) Toggles to control which events sync to the device calendar (e.g., "Sync Flights", "Sync Hotels").

### 8.5 Testing & Debugging Screens

- **Crash Reports:** (`CrashReports` screen) A dedicated view to read error logs, useful for internal testing or user feedback submission.
- **Test Notifications:** (`TestNotifications`, `TestWeatherNotifications`) Screens to manually trigger push notifications to verify the notification channel configuration.

## 9. Assumptions & Constraints

- **Platform:** Android devices only (Kotlin/Jetpack Compose codebase).
- **Connectivity:**
    - **Online:** Required for Google Places, Weather API, Gemini AI, and Maps.
    - **Offline:** Core data (Trips, Documents, Budgets) is assumed to be accessible offline via local Room database storage.
- **API Dependencies:** The app requires valid API keys for:
    - Google Maps SDK / Places API
    - Google Gemini API
    - Weather Provider API
    - Google Calendar API

## 10. Future Roadmap

The architecture is designed to be modular to support these future enhancements:

- **Enhanced AI Features:** Expansion of Gemini integration for personalized itinerary generation based on user interests.
- **Social Sharing:** Ability to share Trip itineraries or Budgets with other users (Splitwise-style integration).
- **Cross-Platform Support:** Potential migration to Kotlin Multiplatform (KMP) given the clean separation of Data and Domain layers.
- **Modularization:** Further decoupling of features (e.g., extracting "Weather" into a standalone library) as suggested by the modular design principles.

# Technical Solution Document: Antigravity Web App (Next.js)

## 1. System Overview

The Antigravity Web App is a **Progressive Web Application (PWA)** built using **Next.js 14+ (App Router)** and **TypeScript**. It replicates the functionality of the native Android app—including offline capabilities, itinerary management, and AI-driven insights—while leveraging web technologies to offer cross-platform accessibility (Mobile, Tablet, Desktop).

The application uses a **Serverless Architecture** where the Next.js backend (API Routes/Server Actions) acts as a secure gateway to external services (AI, Weather) and a cloud-native database.

## 2. High-Level Architecture

The system follows a **Client-Server-Database** model optimized for the web.

### 2.1 Architectural Layers

- **Client Layer (Frontend):**
    - Built with **React Server Components (RSC)** and Client Components.
    - **State Management:** URL-based state (search params) combined with **Zustand** for complex global state (e.g., active trip session).
    - **UI Library:** **Tailwind CSS** and **Shadcn/UI** for responsive, accessible design.
- **Edge/Server Layer (Backend for Frontend):**
    - **Next.js API Routes / Server Actions:** Securely handle API key injection, data validation, and proxying requests to external services (Weather, Gemini) to prevent key exposure.
    - **Middleware:** Handles protected route redirection and session verification.
- **Data & Infrastructure Layer:**
    - **Database:** **Firebase Firestore** (NoSQL) allows for flexible data structures similar to the Android app's JSON model and provides out-of-the-box offline synchronization.
    - **Storage:** **Firebase Storage** for user-uploaded travel documents.
    - **Auth:** **Firebase Authentication** handles identity management.

### 2.2 System Diagram

1. **User Browser** interacts with UI Components.
2. **Auth Layer** verifies identity via Firebase SDK.
3. **Server Actions** securely fetch data from Gemini/Weather APIs.
4. **Firestore** syncs data in real-time and persists locally (Offline support).

## 3. Technology Stack

| Component | Technology | Rationale |
| --- | --- | --- |
| **Framework** | Next.js 14+ (App Router) | SEO, Server Components, and robust API capabilities. |
| **Language** | TypeScript | Type safety for complex data models (Trips, Itineraries). |
| **Styling** | Tailwind CSS + Shadcn/UI | Rapid UI development with responsive design system. |
| **Database** | Firebase Firestore | NoSQL structure matches the app's data model; built-in offline mode. |
| **Auth** | Firebase Auth | Secure, easy integration with Firestore rules. |
| **Maps** | @vis.gl/react-google-maps | Modern React wrapper for Google Maps JS API. |
| **AI** | Google Generative AI SDK | Node.js SDK for Gemini interaction. |
| **PWA Support** | next-pwa | Service worker generation for offline asset caching. |
| **Notifications** | Firebase Cloud Messaging (FCM) | Web Push API integration for alerts. |

## 4. Data Design & Cloud Storage

### 4.1 Database Schema (Firestore)

Moving from local JSON blobs to a structured Cloud NoSQL database requires a hierarchical design.

- **Collection: `users`**
    - `uid`: String (Auth ID)
    - `email`: String
    - `preferences`: Map (currency, notificationSettings)
    - **Sub-collection: `trips`**
        - `tripId`: UUID
        - `destination`: String
        - `startDate`: Timestamp
        - `endDate`: Timestamp
        - `budget`: Map (total, spent, currency)
        - **Sub-collection: `itineraries`** (One doc per day)
            - `date`: Timestamp
            - `pois`: Array of Objects (placeId, time, order)
        - **Sub-collection: `expenses`**
            - `amount`: Number
            - `category`: String
            - `date`: Timestamp
        - **Sub-collection: `documents`**
            - `url`: String (Firebase Storage URL)
            - `extractedText`: String (AI OCR result)

### 4.2 Offline Strategy (DataStore Replacement)

- **Data:** The Firestore Web SDK has built-in `enableIndexedDbPersistence()`. This caches active queries and document writes locally. If the user loses internet, the app reads/writes to this local cache and syncs automatically when connection is restored.
- **Assets:** `next-pwa` configures a Service Worker to cache the App Shell (HTML/CSS/JS), fonts, and icons, ensuring the app loads instantly even without a network.

## 5. Key Component Implementation

### 5.1 Weather Service (Server-Side)

To protect the OpenWeatherMap API key:

- **Route:** `GET /api/weather?lat=x&lon=y`
- **Logic:**
    1. Next.js API route receives lat/lon.
    2. Checks server-side cache (Redis or Vercel KV) to prevent API rate limiting.
    3. If no cache, calls OpenWeatherMap API 3.0 (with fallback to 2.5).
    4. Transforms data to the frontend `WeatherInfo` interface.
    5. Returns JSON to client.

### 5.2 Google Places & Maps

- **Maps (Client-side):** Uses Google Maps JavaScript API with restricted API keys (restricted to the web domain/referrer).
- **Place Details (Server-side):** For detailed metadata (prices, detailed reviews) not available effectively via client SDKs, a Server Action `fetchPlaceDetails(placeId)` calls the Places API backend using a private server-side key.

### 5.3 AI Service (Gemini Integration)

- **Feature:** Document Analysis (OCR) & Itinerary Suggestions.
- **Implementation:**
    1. User uploads image to Firebase Storage.
    2. Frontend sends the image URL to a Server Action `analyzeDocument(url)`.
    3. Server Action downloads the image buffer and sends it to Gemini Pro Vision (via `google-generative-ai` SDK).
    4. Returns structured JSON (Ticket Date, Flight Number, etc.) to the client.

### 5.4 Smart Notifications (Web Push)

- **Challenge:** Web apps cannot run background workers like Android's `WorkManager` when closed.
- **Solution:** **Cron Jobs + Push API**.
    1. **Vercel Cron** triggers an API route `api/cron/schedule-notifications` every hour.
    2. This route queries Firestore for users with active trips today.
    3. It checks meal times (9 AM, 1 PM, etc.) against the user's timezone.
    4. Sends a push notification payload via **Firebase Cloud Messaging (FCM)** to the user's subscribed browser service worker.

## 6. Security & Privacy

### 6.1 Authentication & Authorization

- **Middleware:** Next.js Middleware (`middleware.ts`) protects routes like `/dashboard` and `/trip/*`, redirecting unauthenticated users to `/login`.
- **RLS (Row Level Security):** Firestore Security Rules enforce data isolation:JavaScript
    
    `match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }`
    

### 6.2 API Security

- **Environment Variables:** All API keys (Weather, Gemini, Google Service Account) are stored in `.env.local` and accessed only on the server (`process.env.API_KEY`).
- **Rate Limiting:** Implement `upstash/ratelimit` on API routes to prevent abuse of the AI and Weather endpoints.

## 7. Migration from Android to Web

- **Navigation:** Android's `NavGraph` becomes Next.js File-system Routing:
    - `Screen.Landing` -> `app/page.tsx`
    - `Screen.TripsGallery` -> `app/dashboard/page.tsx`
    - `Screen.TripDetails` -> `app/trip/[tripId]/page.tsx`
- **ViewModels:** Replaced by **Custom Hooks** (e.g., `useWeather`, `useTrips`). Logic previously in `AuthViewModel` moves to a `AuthContext` provider.

## 8. Build & Deployment

- **Platform:** Vercel (Optimized for Next.js).
- **CI/CD:** GitHub Actions to run ESLint and Type Check on PRs.
- **Environment:** Production build generates static assets where possible (SSG) and serverless functions for dynamic API routes.