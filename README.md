# MediCare+ V2 - Optimized Architecture

This is the restructured version of the MediCare+ app with an optimized architecture.

## Architecture

- **Feature-based modules**: Organized by features (auth, patient, doctor, prescriptions)
- **Shared components**: Reusable UI components and utilities
- **Component size limit**: All components are under 250 lines (preferably 200)
- **Separation of concerns**: Business logic in hooks, UI in components, API calls in services

## Folder Structure

```
MedicareAppV2/
├── app/                    # Expo Router screens (thin wrappers)
├── features/              # Feature modules with components, hooks, services
├── shared/                # Shared components, hooks, services, types, utils
├── config/               # App configuration
├── i18n/                 # Internationalization
└── assets/               # Static assets
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

## Key Improvements

- Smaller, focused components (max 250 lines)
- Better code organization
- Reusable hooks for business logic
- Type-safe throughout
- Clear separation of concerns





