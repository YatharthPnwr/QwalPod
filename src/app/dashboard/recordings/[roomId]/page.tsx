"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { AudioLines, FileVideo, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { AvatarFallback } from "@radix-ui/react-avatar";
import SkeletonCard from "@/components/ui/SkeletonCard";
interface userLinks {
  userId: string;
  userName: string;
  pic: string;
  videoURL?: string;
  audioURL?: string;
  thumbnailURL?: string;
}
export default function PodAssets() {
  const params = useParams<{ roomId: string }>();
  const { roomId } = params;
  const [loaded, setLoaded] = useState<boolean>(false);
  console.log("The room id is", roomId);
  const [meetingURLS, setMeetingURLS] = useState<{
    urls: userLinks[];
  } | null>(null);
  useEffect(() => {
    const getMeetingURLS = async () => {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_JS_BACKEND_URL}/api/getAllFilesAccessURL`,
        {
          meetingId: roomId,
        }
      );
      console.log(res);
      setMeetingURLS(res.data);
      setLoaded(true);
    };
    getMeetingURLS();
  }, []);
  if (!loaded) {
    return (
      <>
        <div className="grid grid-cols-3 w-full p-11 place-items-center gap-5">
          <SkeletonCard></SkeletonCard>
          <SkeletonCard></SkeletonCard>
          <SkeletonCard></SkeletonCard>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="grid grid-cols-3 w-full p-11 place-items-center gap-5">
        <div className="h-full grid w-full p-11 place-items-center gap-5">
          {meetingURLS &&
            meetingURLS.urls.map((usr, index) => (
              <div key={index} className=" w-full ">
                <Card className="w-full h-full pb-10">
                  {/* <div>
                  <p>userName is {usr.userName}</p>
                </div> */}
                  <div className="flex flex-col items-center gap-5 justify-center">
                    {/*Thumbnail section*/}
                    <div className="w-[90%] h-64 border rounded-2xl overflow-hidden">
                      <img
                        src={usr.thumbnailURL}
                        className="object-cover w-full h-full"
                      ></img>
                    </div>
                    <div className="w-full flex flex-row align-center justify-start px-5 gap-7">
                      {/*Image section*/}
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={usr.pic} />
                        <AvatarFallback>
                          {usr.userName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {/*Download buttons*/}
                      <div className="cursor-pointer group w-full">
                        <a
                          href={usr.videoURL}
                          download={`${usr.userName}_VIDEO`}
                        >
                          <Button className="w-full h-12 rounded-xl">
                            <FileVideo
                              className="group-hover:hidden"
                              style={{
                                width: 30,
                                height: 30,
                                color: "white",
                              }}
                            />
                            <Download
                              className="hidden group-hover:block"
                              style={{
                                width: 30,
                                height: 30,
                                color: "white",
                              }}
                            />
                          </Button>
                        </a>
                      </div>
                      <div className="w-full cursor-pointer group">
                        <a
                          href={usr.audioURL}
                          download={`${usr.userName}_AUDIO`}
                        >
                          <Button className="w-full h-12 rounded-xl">
                            <AudioLines
                              size={40}
                              className="group-hover:hidden"
                              style={{
                                width: 30,
                                height: 30,
                                color: "white",
                              }}
                            />
                            <Download
                              size={40}
                              style={{
                                width: 30,
                                height: 30,
                                color: "white",
                              }}
                              className="hidden group-hover:block"
                            />
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
