# Personal Planner

An all-in-one personal planner mobile app built with React Native (Expo) for iOS and Android.

## Features

- **Dashboard** — Daily summary: today's tasks, schedule, and habits at a glance
- **Schedule** — Day / Week / Month / Agenda calendar views with Google Calendar two-way sync
- **Tasks** — Task management with priority, due dates, categories, sub-tasks, and recurring support
- **Habits** — Habit tracker with streaks, monthly heatmap, and completion analytics
- **Finance** — Income & expense tracking with automatic recording from bank SMS (Android) or Gmail (iOS), budgets, and spending analytics

## Tech Stack

| | |
|---|---|
| Framework | React Native + Expo |
| Navigation | React Navigation v6 |
| Backend | Firebase (Firestore + Auth) |
| Auth | Google Sign-In + Email/Password |
| State | Zustand |
| Notifications | Expo Notifications |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Authentication** (Google + Email/Password providers)
3. Enable **Firestore Database**
4. Copy `.env.example` → `.env.local` and fill in your Firebase config values

```bash
cp .env.example .env.local
```

### 3. Configure Google OAuth (for Calendar + Gmail sync)

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth 2.0 Client IDs for iOS and Android
3. Enable the **Google Calendar API** and **Gmail API**
4. Add the client IDs to `.env.local`

### 4. Run the app

```bash
# Start Expo dev server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android
```

## Environment Variables

See `.env.example` for all required variables.

## Auto-recording Finance Transactions

### Android — SMS
The app reads bank SMS alerts and parses them automatically. Go to **Finance → Settings → SMS Patterns** to configure regex patterns for your bank.

> **Note:** Google Play Store restricts the `READ_SMS` permission to apps where it is the core function. For personal/sideloaded use this works freely. For Play Store distribution, use the manual entry flow instead.

### iOS — Gmail
Connect your Gmail account in **Finance → Settings → Gmail Integration**. The app polls for new bank alert emails matching your configured search queries.

## Project Structure

```
src/
├── components/       Reusable UI components
├── navigation/       React Navigation setup
├── screens/          All app screens
│   ├── auth/
│   ├── dashboard/
│   ├── schedule/
│   ├── tasks/
│   ├── habits/
│   ├── finance/
│   └── settings/
├── services/         Firebase + API service layer
├── store/            Zustand state stores
├── theme/            Colors, typography, spacing
├── types/            TypeScript types
└── utils/            Date, currency, recurrence helpers
```
