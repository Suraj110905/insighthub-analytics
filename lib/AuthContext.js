"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";
import { inMemoryStorage } from "./cognitoStorage";

const AuthContext = createContext(null);

const USER_POOL_ID = process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID || "";
const CLIENT_ID = process.env.NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID || "";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const isConfigured = Boolean(
    USER_POOL_ID &&
    CLIENT_ID &&
    USER_POOL_ID !== "ap-south-1_xxxxxxxxx" &&
    CLIENT_ID !== "xxxxxxxxxxxxxxxxxxxxxxxxxx"
  );

  // Initialize Cognito User Pool with in-memory storage
  const userPool = useMemo(() => {
    if (!isConfigured) return null;
    return new CognitoUserPool({
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
      Storage: inMemoryStorage,
    });
  }, [isConfigured]);

  // Attempt to restore session from in-memory storage on initial mount
  useEffect(() => {
    if (!userPool) return;

    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      currentUser.getSession((err, currentSession) => {
        if (!err && currentSession && currentSession.isValid()) {
          const idToken = currentSession.getIdToken();
          const email = idToken.payload.email || currentUser.getUsername();
          const sub = idToken.payload.sub;
          setUser({ email, sub });
          setSession(currentSession);
        } else {
          setUser(null);
          setSession(null);
        }
      });
    }
  }, [userPool]);

  /**
   * Register a new user with email and password
   */
  const signUp = useCallback(
    (email, password) => {
      return new Promise((resolve, reject) => {
        if (!isConfigured || !userPool) {
          const err = new Error(
            "Amazon Cognito is not configured. Please set NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID and NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID."
          );
          setError(err.message);
          return reject(err);
        }

        setError(null);
        setLoading(true);

        const attributeList = [
          new CognitoUserAttribute({
            Name: "email",
            Value: email.trim().toLowerCase(),
          }),
        ];

        userPool.signUp(
          email.trim().toLowerCase(),
          password,
          attributeList,
          null,
          (err, result) => {
            setLoading(false);
            if (err) {
              const msg = err.message || "Failed to register user.";
              setError(msg);
              return reject(new Error(msg));
            }
            resolve(result);
          }
        );
      });
    },
    [isConfigured, userPool]
  );

  /**
   * Confirm registration using the 6-digit verification code sent to email
   */
  const confirmSignUp = useCallback(
    (email, code) => {
      return new Promise((resolve, reject) => {
        if (!isConfigured || !userPool) {
          const err = new Error("Amazon Cognito is not configured.");
          setError(err.message);
          return reject(err);
        }

        setError(null);
        setLoading(true);

        const cognitoUser = new CognitoUser({
          Username: email.trim().toLowerCase(),
          Pool: userPool,
          Storage: inMemoryStorage,
        });

        cognitoUser.confirmRegistration(code.trim(), true, (err, result) => {
          setLoading(false);
          if (err) {
            const msg = err.message || "Verification code is invalid or has expired.";
            setError(msg);
            return reject(new Error(msg));
          }
          resolve(result);
        });
      });
    },
    [isConfigured, userPool]
  );

  /**
   * Resend confirmation code to email
   */
  const resendConfirmationCode = useCallback(
    (email) => {
      return new Promise((resolve, reject) => {
        if (!isConfigured || !userPool) {
          return reject(new Error("Amazon Cognito is not configured."));
        }

        const cognitoUser = new CognitoUser({
          Username: email.trim().toLowerCase(),
          Pool: userPool,
          Storage: inMemoryStorage,
        });

        cognitoUser.resendConfirmationCode((err, result) => {
          if (err) {
            const msg = err.message || "Failed to resend confirmation code.";
            setError(msg);
            return reject(new Error(msg));
          }
          resolve(result);
        });
      });
    },
    [isConfigured, userPool]
  );

  /**
   * Authenticate user with email and password via SRP protocol
   */
  const signIn = useCallback(
    (email, password) => {
      return new Promise((resolve, reject) => {
        if (!isConfigured || !userPool) {
          const err = new Error(
            "Amazon Cognito is not configured. Set NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID and NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID in .env.local to enable cloud login."
          );
          setError(err.message);
          return reject(err);
        }

        setError(null);
        setLoading(true);

        const authenticationDetails = new AuthenticationDetails({
          Username: email.trim().toLowerCase(),
          Password: password,
        });

        const cognitoUser = new CognitoUser({
          Username: email.trim().toLowerCase(),
          Pool: userPool,
          Storage: inMemoryStorage,
        });

        cognitoUser.authenticateUser(authenticationDetails, {
          onSuccess: (result) => {
            setLoading(false);
            const idToken = result.getIdToken();
            const userEmail = idToken.payload.email || email.trim();
            const sub = idToken.payload.sub;
            setUser({ email: userEmail, sub });
            setSession(result);
            setIsAuthModalOpen(false);
            resolve({ user: { email: userEmail, sub }, session: result });
          },
          onFailure: (err) => {
            setLoading(false);
            const msg = err.message || "Invalid username or password.";
            setError(msg);
            reject(new Error(msg));
          },
        });
      });
    },
    [isConfigured, userPool]
  );

  /**
   * Sign out current user and clear in-memory state
   */
  const signOut = useCallback(() => {
    if (userPool) {
      const currentUser = userPool.getCurrentUser();
      if (currentUser) {
        currentUser.signOut();
      }
    }
    inMemoryStorage.clear();
    setUser(null);
    setSession(null);
    setError(null);
  }, [userPool]);

  /**
   * Retrieves active ID Token string for API Gateway Authorization headers
   */
  const getIdToken = useCallback(() => {
    if (!session || !session.isValid()) {
      return null;
    }
    return session.getIdToken().getJwtToken();
  }, [session]);

  const value = useMemo(
    () => ({
      user,
      session,
      isAuthenticated: Boolean(user && session?.isValid()),
      isConfigured,
      loading,
      error,
      setError,
      signUp,
      confirmSignUp,
      resendConfirmationCode,
      signIn,
      signOut,
      getIdToken,
      isAuthModalOpen,
      openAuthModal: () => {
        setError(null);
        setIsAuthModalOpen(true);
      },
      closeAuthModal: () => {
        setError(null);
        setIsAuthModalOpen(false);
      },
    }),
    [
      user,
      session,
      isConfigured,
      loading,
      error,
      signUp,
      confirmSignUp,
      resendConfirmationCode,
      signIn,
      signOut,
      getIdToken,
      isAuthModalOpen,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
