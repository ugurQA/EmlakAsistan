# Firebase Cloud Functions for EmlakAsistan

This directory contains Cloud Functions for the EmlakAsistan application.

## Functions

### deleteUserAuth

This function is triggered when a document in the 'users' collection is deleted from Firestore. It automatically deletes the corresponding user from Firebase Authentication to ensure consistency between the database and authentication system.

## Deployment

To deploy the functions, run:

```bash
firebase deploy --only functions
```

Make sure you have the Firebase CLI installed and are logged in with the appropriate credentials.

## Local Testing

To test the functions locally before deployment, run:

```bash
firebase emulators:start --only functions
``` 