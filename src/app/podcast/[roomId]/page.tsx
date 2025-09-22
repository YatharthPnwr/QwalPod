"use client";
import PodSpacePage from "@/components/pages/PodSpace/PodSpace";

import { useParams } from "next/navigation";
import { useApplicationContext } from "@/lib/context/ApplicationContext";

export default function PodSpace(userId: string) {
  const params = useParams<{ userRole: string }>();
  const roomId = params;
  const userRole = useApplicationContext();
  if (!roomId) {
    return (
      <>
        <div>No roomId Found, returning</div>
      </>
    );
  }
  if (userRole.userRole == "caller") {
    return PodSpacePage({ userRole: "caller" });
  } else {
    return PodSpacePage({ userRole: "calee" });
  }
}
