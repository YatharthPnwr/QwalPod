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
  //params not coming
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

// export default function MediaSelection() {
//   const videoRef = useRef<HTMLVideoElement | null>(null);
//   const audioRef = useRef<HTMLAudioElement | null>(null);

//   return (
//     <div>
//       <div className="flex flex-col gap-10 items-center justify-center">
//         <button
//           className="bg-amber-400 h-10 w-3xl"
//           onClick={async () => {
//             const userStream = await getUserDevices();
//             if (videoRef.current && userStream) {
//               videoRef.current.srcObject = userStream;
//             }
//             if (audioRef.current && userStream) {
//               audioRef.current.srcObject = userStream;
//             }
//           }}
//         >
//           Click To Get Audio & Video info
//         </button>
//         <div className="flex justify-center items-center">
//           <div className="rounded-4xl bg-white w-1/2 h-96 overflow-hidden">
//             <video
//               className="w-full h-full object-cover"
//               ref={videoRef}
//               autoPlay
//               playsInline
//             ></video>
//             <audio className="w-full" ref={audioRef} controls></audio>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
