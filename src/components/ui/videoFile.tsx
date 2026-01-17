import { Button } from "./button";
export default function VideoFile({
  link,
  thumbnail,
}: {
  link: string;
  thumbnail: string;
}) {
  return (
    <>
      <div className="w-11/12 h-32 border-2 rounded-2xl shadow-2xl">
        <div className="flex h-full w-full items-center justify-center">
          <div className="w-full h-full basis-3/6 flex items-center justify-center border-r-2">
            <img
              src={thumbnail}
              className="w-full h-full object-cover block rounded-l-2xl"
            ></img>
          </div>
          <div className="basis-3/6 w-full flex items-center justify-center">
            <a href={link}>
              <Button size={"xl"} className="rounded-lg text-gray-200">
                Download Video{" "}
              </Button>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
