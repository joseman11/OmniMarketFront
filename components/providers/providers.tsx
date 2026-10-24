"use client";

import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import { SWRConfig } from "swr";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <SWRConfig
        value={{
          revalidateOnFocus: false,
          // keepPreviousData no es global: sólo la paginación deliberada lo activa (useAnalytics).
          shouldRetryOnError: false,
        }}
      >
        <TooltipProvider delayDuration={150}>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{
              classNames: {
                toast:
                  "!rounded-xl !border !border-white/10 !bg-[#0e0e15]/95 !backdrop-blur-xl !font-sans",
              },
            }}
          />
        </TooltipProvider>
      </SWRConfig>
    </MotionConfig>
  );
}
