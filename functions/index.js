const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
admin.initializeApp();

// Helper function to get UID from email if needed
async function getUserIdFromEmail(userIdentifier) {
  // If it looks like an email, try to get the UID
  if (userIdentifier.includes('@')) {
    try {
      const userRecord = await admin.auth().getUserByEmail(userIdentifier);
      console.log(`Found user with email ${userIdentifier}, UID: ${userRecord.uid}`);
      return userRecord.uid;
    } catch (error) {
      console.error(`Error finding user with email ${userIdentifier}:`, error);
      // If not found by email, return the original ID
      return userIdentifier;
    }
  }
  return userIdentifier;
}

// This function triggers when a document in the 'users' collection is deleted
exports.deleteUserAuth = functions.firestore
  .document('users/{userId}')
  .onDelete(async (snapshot, context) => {
    const userId = context.params.userId;
    console.log(`Firestore trigger for deleted user with ID: ${userId}`);
    
    try {
      // Check if user data has an email that might be the Auth ID
      const userData = snapshot.data();
      console.log('Deleted user data:', userData);
      
      // Determine the correct ID to use for Auth deletion
      let authId = userId;
      if (userData && userData.email) {
        // Try to get user by email first
        try {
          const userRecord = await admin.auth().getUserByEmail(userData.email);
          authId = userRecord.uid;
          console.log(`Found user by email ${userData.email}, using UID: ${authId}`);
        } catch (emailError) {
          console.log(`Could not find user by email ${userData.email}, using original ID: ${userId}`);
        }
      } else {
        // If ID looks like an email, get UID
        authId = await getUserIdFromEmail(userId);
      }
      
      // Delete the user from Firebase Authentication
      await admin.auth().deleteUser(authId);
      console.log(`Successfully deleted user ${authId} from Authentication`);
      return { success: true, message: `User ${authId} deleted from Authentication` };
    } catch (error) {
      console.error(`Error deleting user ${userId} from Authentication:`, error);
      
      // Check if the error is because the user doesn't exist in Auth
      if (error.code === 'auth/user-not-found') {
        console.log(`User ${userId} not found in Authentication, might already be deleted`);
        return { success: true, message: `User ${userId} not found in Authentication` };
      }
      
      return { success: false, error: error.message };
    }
  });

// This is an HTTP endpoint for deleting a user from Auth directly
// This can be used as a fallback or for manual deletions
exports.deleteUserComplete = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // Check if the request method is POST
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Please use POST.' });
      }

      console.log('Request body:', req.body);
      
      // Get the user ID from the request body
      const userId = req.body.userId;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required in the request body.' });
      }

      console.log(`HTTP request to delete user with ID: ${userId}`);
      
      try {
        // Determine the correct ID to use for Auth deletion
        const authId = await getUserIdFromEmail(userId);
        
        // Delete the user from Firebase Authentication
        await admin.auth().deleteUser(authId);
        console.log(`Successfully deleted user ${authId} from Authentication via HTTP request`);
        return res.status(200).json({ success: true, message: `User ${authId} deleted from Authentication` });
      } catch (error) {
        console.error(`Error deleting user ${userId} from Authentication via HTTP request:`, error);
        
        // Check if the error is because the user doesn't exist in Auth
        if (error.code === 'auth/user-not-found') {
          console.log(`User ${userId} not found in Authentication, might already be deleted`);
          return res.status(200).json({ success: true, message: `User ${userId} not found in Authentication` });
        }
        
        return res.status(500).json({ success: false, error: error.message });
      }
    } catch (error) {
      console.error('Unexpected error in deleteUserComplete:', error);
      return res.status(500).json({ success: false, error: 'An unexpected error occurred.' });
    }
  });
}); 