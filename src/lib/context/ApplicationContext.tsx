"use client";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
  RefObject,
  useRef,
} from "react";

interface applicationContextType {
  userRole: string;
  setUserRole: Dispatch<SetStateAction<string>>;
  ws: RefObject<WebSocket | null>;
}

const applicationContext = createContext<applicationContextType | undefined>(
  undefined
);

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState("");
  const ws = useRef<WebSocket | null>(null);

  return (
    <applicationContext.Provider value={{ userRole, setUserRole, ws }}>
      {children}
    </applicationContext.Provider>
  );
}

//Custom hook to use the context provider
export function useApplicationContext() {
  const context = useContext(applicationContext);
  if (!context) {
    throw new Error("useUserRole must be used within UserRoleProvider");
  }
  return context;
}
