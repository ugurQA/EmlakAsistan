# Emlak Asistan (Real Estate Assistant)

## Project Overview

I am a QA engineer aspiring to become a developer. This is my first non-QA development project, created with the assistance of AI. The project was completed in just 5 days as a proof of concept, demonstrating my ability to build a functional application. Due to the accelerated timeline, the overall project structure does not follow all industry best practices.

Emlak Asistan is developed as an internal listing creation and tracking application for real estate agencies in Turkey. The application streamlines the process of managing property listings while providing role-based access controls to maintain data integrity.

### Core Functionality

The application serves two primary user types:

**Agents:**
- Create new property listings
- View all listings in the system
- Edit and delete only their own listings
- Upload and manage photos for their listings
- View and update their profile information
- Track their listing activities

**Administrators:**
- Perform all agent functions (create/edit/delete listings)
- Access and modify any listing in the system regardless of creator
- Manage agent accounts (create, edit, delete)
- Oversee all system activities

The platform supports both residential and land property types with customized fields for each category, providing a comprehensive solution for real estate management.

## Live Demo

You can access and test the application at: [https://emlakasistan-a76f1.web.app/index.html](https://emlakasistan-a76f1.web.app/index.html)

**Admin credentials:**
- Username: admin@emlakasistan.com
- Password: EmlakAsAdmin35

**Agent credentials:**
- Username: john@emlakasistan.com
- Password: emlakasistan

## Technical Implementation

### Project Structure

All files are maintained in the root directory to accelerate development. While this approach doesn't align with traditional project organization patterns, it enabled rapid iteration and deployment during the 5-day development window.

### Technology Stack

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **UI Framework:** Bootstrap 5 for responsive layouts and components
- **Backend:** Firebase ecosystem for serverless architecture
  - Firebase Authentication for user management
  - Cloud Firestore (NoSQL) for data storage
  - Firebase Storage for image management
  - Firebase Hosting for deployment
  - Firebase Functions for backend processes

### Key Technical Decisions

- **Firebase Adoption:** Selected for its comprehensive suite of tools that enable rapid development without requiring server management or complex API development. This allowed for a working application with user authentication, database operations, and file management in minimal time.

- **NoSQL Database Design:** Leveraged Firestore's document-based structure to create flexible data models that could evolve during development without migration headaches.

- **User Segmentation:** Role-based access is implemented through custom claims in Firebase Authentication, with UI elements and database rules conditioned on user roles to enforce proper access control.

- **Responsive Design Considerations:** While the application includes some responsive elements through Bootstrap, full responsive optimization wasn't prioritized as the application is intended for desktop use in an agency environment.

- **Modular JavaScript:** Despite the flat file structure, the code is organized into logical components to maintain some degree of separation of concerns.

## Installation and Setup

### Prerequisites

- Node.js (v14 or higher)
- Firebase CLI: `npm install -g firebase-tools`
- Git

### Local Development Setup

1. Clone the repository:
   ```bash
   git clone <https://github.com/ugurQA/EmlakAsistan>
   cd emlak-asistan
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase:
   - Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication, Firestore, and Storage
   - Update `firebaseConfig.js` with your own project credentials:
     ```javascript
     const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT_ID.appspot.com",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID"
     };
     ```

4. Initialize Firebase:
   ```bash
   firebase login
   firebase init
   ```
   - Select Firestore, Functions, Hosting, and Storage
   - Use existing project and select your Firebase project
   - Accept defaults for other options

5. Deploy the application:
   ```bash
   firebase deploy
   ```

## Database Structure

The application uses Firestore with the following main collections:

- `users`: Stores user information including role (agent/admin) and contact details
- `listings`: Contains all property listings with references to the agent who created them
- `locations`: Reference data for regions and districts

## Future Improvements

As this project was developed in a compressed timeframe, several areas could be enhanced:

- Implement a proper component-based framework (React, Vue, etc.)
- Reorganize project into a proper directory structure following MVC or similar pattern
- Add comprehensive test coverage
- Enhance mobile responsiveness for field agents
- Add reporting and analytics features
- Implement CI/CD pipelines

## License

This project is proprietary and not licensed for public use or distribution.

## Acknowledgments

Special thanks to AI assistants that helped accelerate the development process and provided guidance on implementation details. 
