import MorphOrb from "@/components/ui/ai-thiking-orb-and-input";
import GatewayFlow from "@/components/ui/gateway-flow";

export function DemoOne() {
  return (
    <div className="flex min-h-[450px] w-full items-center justify-center p-4">
      <MorphOrb />
    </div>
  );
}

export function GatewayFlowDemo() {
  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded-xl border border-border bg-black">
      <GatewayFlow className="h-full w-full" />
    </div>
  );
}

export default GatewayFlowDemo;
