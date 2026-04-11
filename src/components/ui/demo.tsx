import { TiltCard } from "@/components/ui/tilt-card";

function DefaultDemo() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <TiltCard title="Hover Me!" hoverColor="hover:bg-blue-500" className="m-4" />
      <TiltCard title="I'm Tilted!" hoverColor="hover:bg-green-500" className="m-4" />
    </div>
  );
}

export { DefaultDemo };
