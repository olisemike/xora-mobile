# Xora Mobile

Expo/React Native mobile client for the Xora social platform.

## Overview

Xora Mobile delivers the social feed, reels, messaging, profile, and account flows in a native mobile-first experience backed by the same broader platform APIs.

## Highlights

- auth, feed, reels, profile, messaging, and settings flows
- Expo-based React Native app with Android project files included
- shared media components for image/video handling
- mobile-first navigation and screen structure
- push, verification, and moderation-aware client workflows

## Stack

- React Native
- Expo
- Android native project
- Context/state-driven client architecture

## Local Development

```bash
npm install
npm run start:offline
```

Main entry points:
- `App.js`
- `src/App.js`
- `src/navigation/MainNavigator.js`

## Screenshots

### Feed And Auth Flows
![Mobile Screenshot 1](assets/screenshots/Screenshot_2026-03-30-17-20-50-826_host.exp.exponent.jpg)
![Mobile Screenshot 2](assets/screenshots/Screenshot_2026-03-30-17-45-13-444_host.exp.exponent.jpg)
![Mobile Screenshot 3](assets/screenshots/Screenshot_2026-03-30-17-45-16-752_host.exp.exponent.jpg)
![Mobile Screenshot 4](assets/screenshots/Screenshot_2026-03-30-17-45-28-610_host.exp.exponent.jpg)
![Mobile Screenshot 5](assets/screenshots/Screenshot_2026-03-30-17-45-37-410_host.exp.exponent.jpg)
![Mobile Screenshot 6](assets/screenshots/Screenshot_2026-03-30-17-45-49-782_host.exp.exponent.jpg)
![Mobile Screenshot 7](assets/screenshots/Screenshot_2026-03-30-17-46-01-997_host.exp.exponent.jpg)
![Mobile Screenshot 8](assets/screenshots/Screenshot_2026-03-30-17-46-20-349_host.exp.exponent.jpg)
![Mobile Screenshot 9](assets/screenshots/Screenshot_2026-03-30-17-46-38-759_host.exp.exponent.jpg)
![Mobile Screenshot 10](assets/screenshots/Screenshot_2026-03-30-17-46-42-236_host.exp.exponent.jpg)
![Mobile Screenshot 11](assets/screenshots/Screenshot_2026-03-30-17-46-47-672_host.exp.exponent.jpg)
![Mobile Screenshot 12](assets/screenshots/Screenshot_2026-03-30-17-47-02-303_host.exp.exponent.jpg)
![Mobile Screenshot 13](assets/screenshots/Screenshot_2026-03-30-17-47-07-262_host.exp.exponent.jpg)

## Structure

- `src/components/` - reusable mobile UI pieces
- `src/screens/` - screen-level app flows
- `src/navigation/` - navigation setup
- `src/contexts/` - auth, moderation, and session state
- `assets/` - app icons, splash assets, and static media

## Environment

Use `.env.example` for local app configuration.

## Repo Scope

This repository is the standalone mobile client for Xora.
