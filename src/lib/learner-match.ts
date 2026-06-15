// Pure matching helpers for the learner onboarding quiz.

import {
  MENTORS,
  PATHS,
  getMentorBySlug,
  type MentorFixture,
  type PathFixture,
  type LearnerGoal,
  type LearnerDevice,
  type LearnerPace,
} from "@/data/lesson-paths";
import type { LearnerPrefs } from "@/stores/useLearnerPrefsStore";

export const GOAL_LABELS: Record<LearnerGoal, string> = {
  work: "Work & Productivity",
  creative: "Creative & Hobbies",
  life: "Life & Organization",
  curiosity: "Curiosity",
};

export const DEVICE_LABELS: Record<LearnerDevice, string> = {
  computer: "Computer",
  tablet: "Tablet",
  smartphone: "Smartphone",
};

export const PACE_LABELS: Record<LearnerPace, string> = {
  slow: "Slow & Steady",
  fast: "Fast & Focused",
  playful: "Playful & Experimental",
};

const DEVICE_BADGE: Record<LearnerDevice, string> = {
  computer: "Great on computer",
  tablet: "Expert in iPad / tablet AI",
  smartphone: "Phone-friendly Aide",
};

export function scoreMentor(mentor: MentorFixture, prefs: LearnerPrefs): number {
  let score = 0;
  if (prefs.goal && mentor.goals.includes(prefs.goal)) score += 3;
  if (prefs.device && mentor.devices.includes(prefs.device)) score += 2;
  if (prefs.pace && mentor.pace.includes(prefs.pace)) score += 1;
  return score;
}

export function getMatches(prefs: LearnerPrefs, limit = 3): MentorFixture[] {
  const ranked = MENTORS.map((m) => ({ m, s: scoreMentor(m, prefs) }))
    .sort((a, b) => b.s - a.s)
    .map((r) => r.m);
  return ranked.slice(0, limit);
}

export function filterMentors(prefs: LearnerPrefs): MentorFixture[] {
  if (!prefs.goal && !prefs.device && !prefs.pace) return MENTORS;
  const ranked = MENTORS.map((m) => ({ m, s: scoreMentor(m, prefs) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((r) => r.m);
  return ranked.length ? ranked : MENTORS;
}

export function filterPaths(prefs: LearnerPrefs): PathFixture[] {
  if (!prefs.goal && !prefs.device && !prefs.pace) return PATHS;
  const ranked = PATHS
    .map((p) => {
      const mentor = getMentorBySlug(p.mentorSlug);
      const s = mentor ? scoreMentor(mentor, prefs) : 0;
      return { p, s };
    })
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((r) => r.p);
  return ranked.length ? ranked : PATHS;
}

export function safetyBadges(
  mentor: MentorFixture,
  prefs: LearnerPrefs,
): string[] {
  const badges: string[] = [];
  if (prefs.device && mentor.devices.includes(prefs.device)) {
    badges.push(DEVICE_BADGE[prefs.device]);
  }
  if (prefs.pace && mentor.pace.includes(prefs.pace)) {
    badges.push(`Matches your '${PACE_LABELS[prefs.pace]}' style`);
  }
  if (prefs.goal && mentor.goals.includes(prefs.goal)) {
    badges.push(`Strong in ${GOAL_LABELS[prefs.goal]}`);
  }
  return badges.slice(0, 2);
}
