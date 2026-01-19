/**
 * Local Authentication Service
 * Stores user data in AsyncStorage (no database required)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const USERS_STORAGE_KEY = "@olfu_users";
const CURRENT_USER_KEY = "@olfu_current_user";

/**
 * Get all users from storage
 */
const getUsers = async () => {
  try {
    const usersJson = await AsyncStorage.getItem(USERS_STORAGE_KEY);
    return usersJson ? JSON.parse(usersJson) : {};
  } catch (error) {
    console.error("Error getting users:", error);
    return {};
  }
};

/**
 * Save users to storage
 */
const saveUsers = async (users) => {
  try {
    await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error("Error saving users:", error);
  }
};

/**
 * Sign up with email, password, first name, and last name
 */
export const signUpWithEmail = async (email, password, firstName, lastName) => {
  try {
    // Validate inputs
    if (!email.trim() || !password.trim() || !firstName.trim() || !lastName.trim()) {
      return { success: false, error: "All fields are required" };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return { success: false, error: "Invalid email format" };
    }

    // Validate password length
    if (password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" };
    }

    const users = await getUsers();
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    if (users[normalizedEmail]) {
      return { success: false, error: "Email already registered" };
    }

    // Create new user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newUser = {
      id: userId,
      email: normalizedEmail,
      password: password, // In production, hash this!
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      displayName: `${firstName.trim()} ${lastName.trim()}`,
      createdAt: new Date().toISOString(),
    };

    // Save user
    users[normalizedEmail] = newUser;
    await saveUsers(users);

    // Auto-login after signup
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));

    return {
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        displayName: newUser.displayName,
      },
    };
  } catch (error) {
    console.error("Sign up error:", error);
    return { success: false, error: error.message || "Sign up failed" };
  }
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (email, password) => {
  try {
    if (!email.trim() || !password.trim()) {
      return { success: false, error: "Email and password are required" };
    }

    const users = await getUsers();
    const normalizedEmail = email.trim().toLowerCase();
    const user = users[normalizedEmail];

    if (!user) {
      return { success: false, error: "Invalid email or password" };
    }

    // Check password (in production, compare hashed passwords)
    if (user.password !== password) {
      return { success: false, error: "Invalid email or password" };
    }

    // Save current user session
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
    };
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));

    return {
      success: true,
      user: userData,
    };
  } catch (error) {
    console.error("Sign in error:", error);
    return { success: false, error: error.message || "Sign in failed" };
  }
};

/**
 * Get current user session
 */
export const getCurrentUser = async () => {
  try {
    const userJson = await AsyncStorage.getItem(CURRENT_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

/**
 * Sign out current user
 */
export const signOutUser = async () => {
  try {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    return { success: true };
  } catch (error) {
    console.error("Sign out error:", error);
    return { success: false, error: error.message || "Sign out failed" };
  }
};

/**
 * Listen to auth state changes
 * Returns unsubscribe function
 */
export const onAuthChange = (callback) => {
  let isSubscribed = true;

  // Check initial state
  getCurrentUser().then((user) => {
    if (isSubscribed) {
      callback(user);
    }
  });

  // Poll for changes (simple implementation)
  const intervalId = setInterval(async () => {
    if (isSubscribed) {
      const user = await getCurrentUser();
      callback(user);
    }
  }, 1000);

  // Return unsubscribe function
  return () => {
    isSubscribed = false;
    clearInterval(intervalId);
  };
};

/**
 * Update user profile
 */
export const updateUserProfile = async (updates) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "No user logged in" };
    }

    const users = await getUsers();
    const normalizedEmail = currentUser.email.toLowerCase();
    const user = users[normalizedEmail];

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Update user data
    if (updates.firstName) user.firstName = updates.firstName.trim();
    if (updates.lastName) user.lastName = updates.lastName.trim();
    if (updates.firstName || updates.lastName) {
      user.displayName = `${user.firstName} ${user.lastName}`;
    }

    // Save updated users
    users[normalizedEmail] = user;
    await saveUsers(users);

    // Update current session
    const updatedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
    };
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));

    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Update profile error:", error);
    return { success: false, error: error.message || "Update failed" };
  }
};
