import { createContext } from 'react';

const AuthContext = createContext({
  isAuthenticated: false,
  hasSeenOnboarding: false,
  completeOnboarding: () => {},
  signIn: () => {},
  signOut: () => {}
});

export default AuthContext;
