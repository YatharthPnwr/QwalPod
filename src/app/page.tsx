"use client";
import { useRouter } from "next/navigation";
import { useRef, useEffect } from "react";
import { WebSocketConnHandle } from "@/utils/functions/waitForConnection";
import { useApplicationContext } from "@/lib/context/ApplicationContext";
import { useTheme } from "next-themes";
import { useUser } from "@clerk/nextjs";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
export default function DashBoard() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, isLoaded } = useUser();
  return (
    <div className="w-screen flex items-center justify-center flex-col">
      <header className="mb-10 sticky top-0 z-50 w-full backdrop-blur-lg bg-transparent border-b border-border">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div>QwalPod</div>
          <nav className="hidden items-center gap-4 md:flex lg:gap-8">
            <a className="text-muted-foreground hover:text-foreground group relative text-xs font-medium transition-colors lg:text-sm hover:cursor-pointer">
              hello
              <span className="bg-primary absolute -bottom-1 left-0 h-0.5 w-0 transition-all duration-300 group-hover:w-full"></span>
            </a>

            <a className="text-muted-foreground hover:text-foreground group relative text-xs font-medium transition-colors lg:text-sm hover:cursor-pointer">
              hello
              <span className="bg-primary absolute -bottom-1 left-0 h-0.5 w-0 transition-all duration-300 group-hover:w-full"></span>
            </a>

            <a className="text-muted-foreground hover:text-foreground group relative text-xs font-medium transition-colors lg:text-sm hover:cursor-pointer">
              Pricing
              <span className="bg-primary absolute -bottom-1 left-0 h-0.5 w-0 transition-all duration-300 group-hover:w-full"></span>
            </a>
          </nav>
          <div className="hidden cursor-pointer items-center gap-4 md:flex">
            <div className="flex items-center gap-4">
              <SignedOut>
                <SignInButton />
                <SignUpButton>
                  <Button>Sign up</Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </div>
        </div>
      </header>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[250px] h-[200px] rounded-full bg-gradient-to-tr from-[#ff7b00] via-[#ffb800] to-[#ff7b00] opacity-50 blur-[120px]" />
      </div>

      <h1 className="w-1/2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
        Record <span className="text-primary">Studio Quality Podcasts. </span>{" "}
        <br></br>
        <span className="italic font-light flex justify-center">
          Anytime, Anywhere.
        </span>{" "}
      </h1>
      <p className="w-1/2 text-muted-foreground mb-8 text-center leading-relaxed md:text-xl pt-3">
        Capture the highest-quality local recordings from every guest,
        automatically synced to the cloud, ready for your next big episode.
      </p>
      <Button
        size={"lg"}
        onClick={() => {
          router.push("/dashboard");
        }}
      >
        Create a Pod
      </Button>
    </div>
  );
}
