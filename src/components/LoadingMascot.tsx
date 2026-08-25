import Image from "next/image";

export function LoadingMascot() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16">
      <Image
        src="/mascot/mascot-ai-thinking.png"
        alt=""
        width={96}
        height={96}
        className="animate-pulse"
        priority
      />
      <p className="text-sm text-[#8A8A8A]">กำลังโหลด...</p>
    </div>
  );
}
