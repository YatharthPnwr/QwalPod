"use client";
import { useRouter } from "next/navigation";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
export default function DashBoard() {
  const router = useRouter();
  // const { theme, setTheme } = useTheme();
  // const { user, isLoaded } = useUser();
  return (
    <div>
      <div className=" flex items-center justify-center flex-col mb-10">
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

        <h1 className="w-1/2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl m-10">
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
          size={"xl"}
          onClick={() => {
            router.push("/dashboard");
          }}
        >
          Create a new Pod
        </Button>
      </div>
      <div className="flex items-center justify-center ">
        <Card className="w-3/4">
          <CardContent className="text-center flex flex-col p-2">
            <h1 className="text-4xl font-bold">
              <div className="">
                <span className=" text-primary"> Zero stress </span> recording
                guaranteed.
              </div>
            </h1>
            <div>
              <p className="text-lg m-2 text-neutral-400">
                You bring the conversation, we guarantee the quality.
              </p>
            </div>
            <div className="flex flex-row px-2 gap-4 mt-8">
              <div className="p-3 text-wrap  flex items-center flex-col gap-2 flex-1">
                <div className="w-20 h-20 rounded-full border shadow-2xl flex items-center justify-center mb-2">
                  <p className="text-primary font-bold text-4xl">1</p>
                </div>
                <div className="font-bold text-xl ">Instant Setup.</div>
                <div className="p-3 text-wrap  flex items-center flex-col gap-2 flex-1 text-neutral-400 font-sans">
                  Just send a link. No apps, downloads, or accounts needed for
                  your guests.
                </div>
              </div>
              <div className="p-3 text-wrap  flex items-center flex-col gap-2 flex-1">
                <div className="w-20 h-20 rounded-full border shadow-2xl flex items-center justify-center mb-2">
                  <p className="text-primary font-bold text-4xl">2</p>
                </div>
                <div className="font-bold text-xl">Studio Quality.</div>
                <div className="p-3 text-wrap  flex items-center flex-col gap-2 flex-1 text-neutral-400 font-sans">
                  We record pristine quality files locally on the device first,
                  so bad WiFi never ruins the shot.
                </div>
              </div>
              <div className="p-3 text-wrap  flex items-center flex-col gap-2 flex-1">
                <div className="w-20 h-20 rounded-full border shadow-2xl flex items-center justify-center mb-2">
                  <p className="text-primary font-bold text-4xl">3</p>
                </div>
                <div className="font-bold text-xl">Hassle free.</div>
                <div className="p-3 text-wrap  flex items-center flex-col gap-2 flex-1 text-neutral-400 font-sans">
                  Footage uploads silently after the meeting. No interrupts
                  during your pod.
                </div>
              </div>
              <div className="p-3 text-wrap  flex items-center flex-col gap-2 flex-1">
                <div className="w-20 h-20 rounded-full border shadow-2xl flex items-center justify-center mb-2">
                  <p className="text-primary font-bold text-4xl">4</p>
                </div>
                <div className="font-bold text-xl">Ready to Edit.</div>
                <div className="p-3 text-wrap  flex items-center flex-col gap-2 flex-1 text-neutral-400 font-sans">
                  Get separate, high quality tracks for every guest easily.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
