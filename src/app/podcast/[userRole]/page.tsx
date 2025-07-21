"use client";
import PodSpacePage from "@/components/pages/PodSpace/PodSpace";
// In a parent component
{
  /* <PodSpace userRole="caller" />
// or
<PodSpace userRole="calee" /> */
}
import { useParams } from "next/navigation";
export default function PodSpace() {
  const params = useParams<{ userRole: string }>();
  const userRole = params;
  if (!userRole) {
    return (
      <>
        <div>No userRole Found returning</div>
      </>
    );
  }
  console.log(userRole.userRole);
  if (userRole.userRole == "caller") {
    return PodSpacePage({ userRole: "caller" });
  } else {
    return PodSpacePage({ userRole: "calee" });
  }
}
