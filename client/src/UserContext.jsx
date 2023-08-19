import { createContext, useEffect, useState } from "react";
import axios from 'axios';

export const UserContext = createContext({});

// children = prop.children so we use object destructuring to recieve it
export function UserContextProvider({ children }) {
  const [user, setUser] = useState(null);
  // state to check whether user info has been retrieved or not
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!user) {
      axios.get('/profile').then((response) => {
        setUser(response.data);
        setReady(true);
      });
    }
  }, []);

  return (
    // provides user context to the children elements
    <UserContext.Provider value={{ user, setUser, ready }}>
      {children}
    </UserContext.Provider>

  );
}