import { useEffect, useRef } from "react";
import DailyIframe, { type DailyCall } from "@daily-co/daily-js";

interface DailyEmbedProps {
  roomUrl: string;
  userName: string;
  onLeave?: () => void;
}

// Daily throws if more than one call frame exists at once. Track the active
// instance AND any pending teardown at module scope so React 19 StrictMode's
// setup → cleanup → setup double-invocation (and HMR) can't race
// createFrame() against a still-resolving destroy().
let activeFrame: DailyCall | null = null;
let pendingTeardown: Promise<unknown> | null = null;

async function teardownActive(): Promise<void> {
  if (pendingTeardown) {
    try {
      await pendingTeardown;
    } catch {
      /* ignore */
    }
  }
  if (activeFrame) {
    const f = activeFrame;
    activeFrame = null;
    try {
      const p = Promise.resolve(f.destroy());
      pendingTeardown = p;
      await p;
    } catch {
      /* ignore */
    } finally {
      pendingTeardown = null;
    }
  }
}

export function DailyEmbed({ roomUrl, userName, onLeave }: DailyEmbedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let frame: DailyCall | null = null;
    const handleLeft = () => onLeave?.();

    (async () => {
      // Wait for any in-flight teardown (from the previous StrictMode pass
      // or HMR remount) to finish before creating a new frame.
      await teardownActive();
      if (cancelled || !containerRef.current) return;

      frame = DailyIframe.createFrame(
        containerRef.current,
        {
          iframeStyle: {
            width: "100%",
            height: "100%",
            border: "0",
          },
          showLeaveButton: true,
          showUserNameChangeUI: false,
          enable_prejoin_ui: true,
          start_video_off: false,
          start_audio_off: false,
          enable_noise_cancellation_ui: true,
          enable_screenshare: true,
          enable_chat: true,
          enable_emoji_reactions: true,
          enable_hand_raising: true,
          enable_people_ui: true,
          enable_pip_ui: true,
          enable_network_ui: true,
          enable_cpu_warning_notifications: true,
        } as any,
      );
      activeFrame = frame;

      frame.on("left-meeting", handleLeft);

      try {
        await frame.join({ url: roomUrl, userName });
      } catch (err) {
        console.error("[DailyEmbed] join failed:", err);
      }
    })().catch((err) => {
      console.error("[DailyEmbed] setup failed:", err);
    });

    return () => {
      cancelled = true;
      const f = frame;
      if (!f) return;
      try {
        f.off("left-meeting", handleLeft);
      } catch {
        /* ignore */
      }
      // Stash the destroy promise so the next mount can await it before
      // calling createFrame() again.
      if (activeFrame === f) activeFrame = null;
      try {
        const p = Promise.resolve(f.destroy());
        pendingTeardown = p;
        p.finally(() => {
          if (pendingTeardown === p) pendingTeardown = null;
        });
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomUrl]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-2xl overflow-hidden shadow-lg"
    />
  );
}
