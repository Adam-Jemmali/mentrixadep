import * as React from "react";
import { cn } from "@/lib/utils";

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  hoverColor?: string;
  children?: React.ReactNode;
}

export function TiltCard({ title, className, hoverColor = "hover:bg-primary", children, ...props }: TiltCardProps) {
  return (
    <div
      className={cn(
        "max-h-fit transform rounded-full border-2 border-muted bg-muted p-2 px-6 transition-all duration-500 ease-out hover:-rotate-2 hover:scale-110 hover:text-white hover:shadow-xl",
        hoverColor,
        className
      )}
      {...props}
    >
      {children ? children : <a className="text-xl">{title}</a>}
    </div>
  );
}
