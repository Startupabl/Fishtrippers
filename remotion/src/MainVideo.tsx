import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from "remotion";
import { loadFont as loadLora } from "@remotion/google-fonts/Lora";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const lora = loadLora("normal", { weights: ["500", "600"], subsets: ["latin"] });
const inter = loadInter("normal", { weights: ["400", "600"], subsets: ["latin"] });

const CREAM = "#FDF8F3";
const CHARCOAL = "#333333";
const INK = "#1a1a1a";
const ACCENT = "#0EA5E9";

// Subtle drifting accent shapes — persistent across all scenes.
function DriftingAccents() {
  const frame = useCurrentFrame();
  const drift = (offset: number, amp: number) =>
    Math.sin((frame + offset) / 60) * amp;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 120 + drift(0, 30),
          top: 140 + drift(40, 20),
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: `${ACCENT}10`,
          filter: "blur(4px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 180 + drift(80, 24),
          bottom: 180 + drift(120, 18),
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: `${CHARCOAL}08`,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 360,
          top: 220 + drift(20, 40),
          width: 90,
          height: 90,
          borderRadius: "50%",
          border: `2px solid ${CHARCOAL}30`,
        }}
      />
    </AbsoluteFill>
  );
}

// Scene 1 — Wordmark + tagline
function SceneOne() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const wordmarkIn = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const wordmarkY = interpolate(wordmarkIn, [0, 1], [40, 0]);
  const wordmarkOpacity = interpolate(wordmarkIn, [0, 1], [0, 1]);

  const taglineIn = spring({
    frame: frame - 18,
    fps,
    config: { damping: 20, stiffness: 80 },
  });
  const taglineOpacity = interpolate(taglineIn, [0, 1], [0, 1]);
  const taglineY = interpolate(taglineIn, [0, 1], [16, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: CREAM,
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "0 180px",
      }}
    >
      <div
        style={{
          fontFamily: inter.fontFamily,
          fontWeight: 600,
          fontSize: 28,
          letterSpacing: 6,
          color: ACCENT,
          opacity: taglineOpacity,
        }}
      >
        AIMENTOR.ING
      </div>
      <div
        style={{
          fontFamily: lora.fontFamily,
          fontWeight: 500,
          fontSize: 132,
          lineHeight: 1.05,
          color: INK,
          marginTop: 24,
          transform: `translateY(${wordmarkY}px)`,
          opacity: wordmarkOpacity,
        }}
      >
        Live-Guided
        <br />
        AI Mentorship.
      </div>
      <div
        style={{
          fontFamily: inter.fontFamily,
          fontWeight: 400,
          fontSize: 32,
          color: CHARCOAL,
          marginTop: 32,
          transform: `translateY(${taglineY}px)`,
          opacity: taglineOpacity,
        }}
      >
        A real human mentor, by your side.
      </div>
    </AbsoluteFill>
  );
}

// Scene 2 — kinetic type
function SceneTwo() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = ["Your", "Journey,", "mentored."];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: CREAM,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {words.map((word, i) => {
        const start = i * 8;
        const s = spring({
          frame: frame - start,
          fps,
          config: { damping: 14, stiffness: 110 },
        });
        const y = interpolate(s, [0, 1], [60, 0]);
        const opacity = interpolate(s, [0, 1], [0, 1]);
        const scale = interpolate(s, [0, 1], [0.92, 1]);
        return (
          <div
            key={word}
            style={{
              fontFamily: lora.fontFamily,
              fontWeight: 500,
              fontSize: 180,
              lineHeight: 1,
              color: i === 2 ? ACCENT : INK,
              transform: `translateY(${y}px) scale(${scale})`,
              opacity,
            }}
          >
            {word}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

// Scene 3 — mentor circle + "Begin"
function SceneThree() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const circleIn = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const circleScale = interpolate(circleIn, [0, 1], [0.4, 1]);

  const labelIn = spring({
    frame: frame - 16,
    fps,
    config: { damping: 18, stiffness: 90 },
  });
  const labelOpacity = interpolate(labelIn, [0, 1], [0, 1]);
  const labelY = interpolate(labelIn, [0, 1], [20, 0]);

  const beginIn = spring({
    frame: frame - 30,
    fps,
    config: { damping: 16, stiffness: 90 },
  });
  const beginOpacity = interpolate(beginIn, [0, 1], [0, 1]);
  const beginY = interpolate(beginIn, [0, 1], [24, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: CREAM,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 32,
      }}
    >
      <div
        style={{
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}80)`,
          boxShadow: `0 30px 60px -20px ${ACCENT}60`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: CREAM,
          fontFamily: lora.fontFamily,
          fontWeight: 600,
          fontSize: 120,
          transform: `scale(${circleScale})`,
        }}
      >
        M
      </div>
      <div
        style={{
          fontFamily: inter.fontFamily,
          fontWeight: 600,
          fontSize: 28,
          letterSpacing: 4,
          color: CHARCOAL,
          textTransform: "uppercase",
          opacity: labelOpacity,
          transform: `translateY(${labelY}px)`,
        }}
      >
        Meet your mentor
      </div>
      <div
        style={{
          fontFamily: lora.fontFamily,
          fontWeight: 500,
          fontSize: 96,
          color: INK,
          opacity: beginOpacity,
          transform: `translateY(${beginY}px)`,
        }}
      >
        Begin.
      </div>
    </AbsoluteFill>
  );
}

export const MainVideo = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: CREAM }}>
      <DriftingAccents />
      <Sequence from={0} durationInFrames={110}>
        <SceneOne />
      </Sequence>
      <Sequence from={110} durationInFrames={90}>
        <SceneTwo />
      </Sequence>
      <Sequence from={200} durationInFrames={100}>
        <SceneThree />
      </Sequence>
    </AbsoluteFill>
  );
};
