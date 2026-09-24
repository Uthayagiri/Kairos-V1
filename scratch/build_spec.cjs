const fs = require('fs');
const path = require('path');

// 100 Unique Level Titles across 10 Thematic Epochs
const levelTitles = [
  // Epoch 1 (1-10): Foundation & Routine
  "Initiate Flow", "Awakened Spark", "Rhythm Seeker", "Habit Novice", "Habit Apprentice",
  "Routine Builder", "Diurnal Walker", "Focus Neophyte", "Clarity Seeker", "Habit Practitioner",
  // Epoch 2 (11-20): Discipline & Rhythm
  "Steadfast Scholar", "Willpower Forge", "Pacing Adept", "Dawn Strider", "Focus Alchemist",
  "Consistency Sentinel", "Cognitive Artisan", "Rhythm Warden", "Momentum Trainee", "Momentum Navigator",
  // Epoch 3 (21-30): Momentum & Kinetic Flow
  "Kinetic Dynamo", "Flow Initiate", "Flow Catalyst", "Action Architect", "Habit Vanguard",
  "Velocity Adept", "Drive Harmonizer", "Tenacity Pathfinder", "Dynamic Pacer", "Momentum Sovereign",
  // Epoch 4 (31-40): Focus & Deep Craft
  "Deep Work Aspirant", "Singular Aim", "Attention Artisan", "Clarity Sentinel", "Distraction Slayer",
  "Precision Craftsman", "Intentionalist", "Cognitive Alchemist", "Mental Fortress", "Master of Focus",
  // Epoch 5 (41-50): Mastery & Self-Authorship
  "Self-Author Initiate", "Principle Guide", "Efficiency Virtuoso", "Method Maestro", "Intrinsic Dynamo",
  "Strategic Practitioner", "Excellence Weaver", "Sovereign Thinker", "Life Sculptor", "Grand Alchemist of Habit",
  // Epoch 6 (51-60): Resilience & Fortitude
  "Stoic Resilient", "Grit Pathfinder", "Iron Will", "Adaptation Specialist", "Equilibrium Keeper",
  "Unshakable Core", "Pressure Artisan", "Adversity Transmuter", "Tenacity Sovereign", "Fortress of Fortitude",
  // Epoch 7 (61-70): Leadership & Purpose
  "Purpose Architect", "Beacon of Rhythm", "Inspirational Guide", "Vision Harmonizer", "Cultural Catalyst",
  "Strategic Visionary", "Empathy Sovereign", "Synergy Conductor", "Guiding Luminary", "Epoch Master",
  // Epoch 8 (71-80): Wisdom & Equilibrium
  "Philosophic Sage", "Equanimity Seeker", "Insight Adept", "Reflective Anchor", "Mindful Sovereign",
  "Balance Architect", "Cognitive Luminary", "Quiet Storm", "Deep Perspective", "Sage of Equilibrium",
  // Epoch 9 (81-90): Harmony & Cosmic Perspective
  "Holistic Integrator", "Universal Pacer", "Temporal Strategist", "Zenith Voyager", "Flow Celestial",
  "Living Chronos", "Elysian Architect", "Timeless Sovereign", "Astral Luminary", "Ascendant Sovereign",
  // Epoch 10 (91-100): Transcendence & Pinnacle
  "Cosmic Weaver", "Chronos Vanguard", "Primordial Focus", "Solar Sovereign", "Universal Sentinel",
  "Omni Rhythm", "Infinite Flow", "Kairos Sovereign", "Apex Transcendence", "Aion Prime: The Kairos Omniscient"
];

// Threshold & Task formulas
function getThreshold(lvl) {
  return 100 + Math.floor(lvl / 5) * 15;
}

function getTaskCount(lvl) {
  return 10 + Math.floor(lvl / 5);
}

// XP Formula
function getDeltaXP(lvl) {
  if (lvl === 1) return 0;
  const raw = 80 + 45 * (lvl - 1) + 2.40 * Math.pow(lvl - 1, 1.95);
  return Math.round(raw / 5) * 5;
}

// 30 Simple, Measurable Lifestyle & Productivity Default Tasks
const defaultTasks = [
  // Level 1 Initial 10 Tasks
  { id: "task_01", title: "Wake up on time", desc: "Rise at your planned morning hour to set a proactive daily routine.", cat: "Routine", hp: 10, rec: "Daily", lvl: 1, act: "Active" },
  { id: "task_02", title: "Healthy Breakfast", desc: "Eat a nutritious breakfast to fuel your morning.", cat: "Wellness", hp: 10, rec: "Daily", lvl: 1, act: "Active" },
  { id: "task_03", title: "Lunch on Time", desc: "Pause mid-day to have a nourishing lunch break.", cat: "Wellness", hp: 10, rec: "Daily", lvl: 1, act: "Active" },
  { id: "task_04", title: "Dinner on Time", desc: "Have a balanced evening meal at a reasonable hour.", cat: "Wellness", hp: 10, rec: "Daily", lvl: 1, act: "Active" },
  { id: "task_05", title: "Stay Hydrated", desc: "Drink water regularly throughout the morning, afternoon, and evening.", cat: "Wellness", hp: 15, rec: "Daily", lvl: 1, act: "Active" },
  { id: "task_06", title: "Plan for Tomorrow", desc: "Write down your top 3 priorities for the upcoming day.", cat: "Organization", hp: 15, rec: "Daily", lvl: 1, act: "Active" },
  { id: "task_07", title: "Study for 10 Minutes", desc: "Dedicate 10 minutes to reading, study, or professional learning.", cat: "Intellect", hp: 15, rec: "Daily", lvl: 1, act: "Active" },
  { id: "task_08", title: "Read Daily News / Articles", desc: "Read an informative article, book passage, or daily news summary.", cat: "Intellect", hp: 10, rec: "Daily", lvl: 1, act: "Active" },
  { id: "task_09", title: "Short Physical Activity", desc: "Take a 10-minute walk, stretch, or do light bodyweight movement.", cat: "Fitness", hp: 15, rec: "Daily", lvl: 1, act: "Active" },
  { id: "task_10", title: "Review Today's Progress", desc: "Review completed tasks, acknowledge daily wins, and note lessons.", cat: "Reflection", hp: 15, rec: "Daily", lvl: 1, act: "Active" },

  // Milestone Unlocks (Levels 5 -> 100)
  { id: "task_11", title: "Read for 15 Minutes", desc: "Read 15 minutes of a non-fiction book or educational literature.", cat: "Intellect", hp: 15, rec: "Daily", lvl: 5, act: "Active at L5" },
  { id: "task_12", title: "Practice a Skill", desc: "Spend 20 minutes deliberately practicing an instrument, coding, or craft.", cat: "Skill", hp: 20, rec: "Daily", lvl: 10, act: "Active at L10" },
  { id: "task_13", title: "Declutter Workspace", desc: "Organize your physical desk and clean up digital desktop tabs and files.", cat: "Organization", hp: 15, rec: "Daily", lvl: 15, act: "Active at L15" },
  { id: "task_14", title: "Focus Work Session (25 min)", desc: "Complete one uninterrupted 25-minute Pomodoro session on a key priority.", cat: "Productivity", hp: 20, rec: "Daily", lvl: 20, act: "Active at L20" },
  { id: "task_15", title: "Evening Reflection & Journaling", desc: "Write 3 positive moments or insights in a brief daily journal entry.", cat: "Reflection", hp: 15, rec: "Daily", lvl: 25, act: "Active at L25" },
  { id: "task_16", title: "Connect with Family or Friend", desc: "Send a thoughtful message or have a brief conversation with someone close.", cat: "Social", hp: 15, rec: "Daily", lvl: 30, act: "Active at L30" },
  { id: "task_17", title: "Stretching & Mobility Break", desc: "Complete 15 minutes of dedicated physical stretching or posture exercises.", cat: "Fitness", hp: 15, rec: "Daily", lvl: 35, act: "Active at L35" },
  { id: "task_18", title: "Plan Upcoming Week", desc: "Review calendar events and organize weekly milestones.", cat: "Organization", hp: 20, rec: "Daily", lvl: 40, act: "Active at L40" },
  { id: "task_19", title: "Learn Something New", desc: "Explore an unfamiliar topic, watch an educational tutorial, or learn a new tool.", cat: "Intellect", hp: 20, rec: "Daily", lvl: 45, act: "Active at L45" },
  { id: "task_20", title: "Deep Work Session (45 min)", desc: "Execute 45 minutes of distraction-free, focused creative or technical work.", cat: "Productivity", hp: 25, rec: "Daily", lvl: 50, act: "Active at L50" },
  { id: "task_21", title: "Track Daily Expenses", desc: "Log daily expenditures and review your personal budget and savings.", cat: "Discipline", hp: 20, rec: "Daily", lvl: 55, act: "Active at L55" },
  { id: "task_22", title: "10 Minutes of Quiet Downtime", desc: "Spend 10 minutes relaxing screen-free to decompress and reset your mind.", cat: "Wellness", hp: 20, rec: "Daily", lvl: 60, act: "Active at L60" },
  { id: "task_23", title: "Write a Summary / Key Notes", desc: "Write a short summary capturing key insights from your recent study or work.", cat: "Intellect", hp: 25, rec: "Daily", lvl: 65, act: "Active at L65" },
  { id: "task_24", title: "Help or Mentor Someone", desc: "Offer guidance, assist a peer, or perform a helpful act for someone.", cat: "Social", hp: 25, rec: "Daily", lvl: 70, act: "Active at L70" },
  { id: "task_25", title: "Deliberate Practice Session (30 min)", desc: "Conduct a 30-minute structured training block targeting skill refinement.", cat: "Skill", hp: 30, rec: "Daily", lvl: 75, act: "Active at L75" },
  { id: "task_26", title: "Long-Term Goals Review", desc: "Review quarterly milestones and verify alignment with long-term aspirations.", cat: "Reflection", hp: 25, rec: "Daily", lvl: 80, act: "Active at L80" },
  { id: "task_27", title: "30-Minute Workout / Cardio", desc: "Complete a 30-minute fitness session, jog, strength workout, or sport.", cat: "Fitness", hp: 30, rec: "Daily", lvl: 85, act: "Active at L85" },
  { id: "task_28", title: "Mastery Focus Session (60 min)", desc: "Execute 60 minutes of uninterrupted, peak-quality project work.", cat: "Productivity", hp: 35, rec: "Daily", lvl: 90, act: "Active at L90" },
  { id: "task_29", title: "Optimize Daily Routines", desc: "Audit daily habits, eliminate recurring friction, and organize your environment.", cat: "Organization", hp: 30, rec: "Daily", lvl: 95, act: "Active at L95" },
  { id: "task_30", title: "Weekly Life Review & Synthesis", desc: "Complete a comprehensive weekly review of progress, systems, and mindset.", cat: "Reflection", hp: 35, rec: "Daily", lvl: 100, act: "Active at L100" }
];

// Generate Level Data
let cumXP = 0;
let cumDays = 0;
const levelsData = [];

for (let lvl = 1; lvl <= 100; lvl++) {
  const deltaXP = getDeltaXP(lvl);
  cumXP += deltaXP;
  const threshold = getThreshold(lvl);
  const taskCount = getTaskCount(lvl);
  const title = levelTitles[lvl - 1];

  // Baseline 80% daily activity model (realistic consistency):
  const effectiveDailyXP = threshold * 0.80;

  let daysForLevel = 0;
  if (lvl > 1) {
    daysForLevel = deltaXP / effectiveDailyXP;
    cumDays += daysForLevel;
  }

  let milestoneStr = "-";
  if (lvl === 1) {
    milestoneStr = "Starting Tier • 10 Initial Tasks • Cap 100 HP";
  } else if (lvl % 5 === 0) {
    milestoneStr = `⭐ Milestone: Unlock Task ${taskCount} • Cap ${threshold} HP`;
  }

  // Format cumulative time
  const y = Math.floor(cumDays / 365.25);
  const remD1 = cumDays % 365.25;
  const m = Math.floor(remD1 / 30.4375);
  const d = Math.round(remD1 % 30.4375);
  
  let timeStr = "Day 0";
  if (lvl > 1) {
    if (y > 0) timeStr = `${y}y ${m}m ${d}d`;
    else if (m > 0) timeStr = `${m}m ${d}d`;
    else timeStr = `${d} days`;
  }

  levelsData.push({
    level: lvl,
    title,
    deltaXP,
    cumXP,
    threshold,
    taskCount,
    milestoneStr,
    effectiveDailyXP,
    daysForLevel,
    cumDays,
    timeStr
  });
}

// Generate the complete Markdown Specification Document
let md = `# KAIROS — 100-LEVEL LONG-TERM PROGRESSION SYSTEM SPECIFICATION

> **Document Status**: Complete Engineering & Design Specification (Revised & Independently Verified)  
> **Target Horizon**: Approximately 10 Years (~3,652.5 Days) of Consistent, Sustainable Usage  
> **Total Levels**: Exactly 100 Levels (Level 1 → Level 100)  
> **Total XP Required for Level 100**: **867,415 XP**  
> **Core Currencies**: **HP** (Daily Activity & Immediate Habit Reward) & **XP** (Permanent 10-Year Long-Term Progression Currency)  
> **Primary Rule**: Strict separation of HP (daily) and XP (lifetime). Zero XP inflation. Guaranteed fractional XP persistence.

---

## 1. Executive Summary & Core Rules

1. **Exactly 100 Levels**: Progression begins at **Level 1** and culminates at **Level 100** (*Aion Prime: The Kairos Omniscient*).
2. **XP Determines Level**: Level advancement is exclusively governed by cumulative lifetime XP.
3. **HP is the Daily Reward Currency**: Every completed task awards full HP to the user's daily total and widgets.
4. **Daily HP Threshold**:
   - Increases every 5 levels starting at **100 HP** at Level 1 and reaching **400 HP** at Level 100.
   - Formula: $\\text{dailyHpThreshold}(\\text{level}) = 100 + \\lfloor \\text{level} / 5 \\rfloor \\times 15$.
5. **HP $\\rightarrow$ XP Conversion**:
   - **Pre-Threshold**: $1\\text{ HP} = 1.0\\text{ XP}$ ($1.0\\times$ rate).
   - **Post-Threshold**: $100\\text{ HP} = 1.0\\text{ XP}$ ($0.01\\times$ rate).
   - **Threshold Crossing**: A task that crosses the daily threshold is automatically split into pre-cap and post-cap slices.
6. **Fractional XP Persistence**: Fractional XP ($0.01$ increments) is stored as a decimal remainder $[0.0, 1.0)$ and carried across days without truncation or loss.
7. **Default Task System**:
   - Exactly **10 default tasks** available at Level 1.
   - Every 5 levels unlocks **exactly 1 additional default task**.
   - Formula: $\\text{defaultTaskCount}(\\text{level}) = 10 + \\lfloor \\text{level} / 5 \\rfloor$.
   - Exactly **30 default tasks** at Level 100.
8. **User-Created Tasks**: User-created tasks remain 100% supported and separate from system default tasks.
9. **UI & Code Constraints**: Zero UI redesign. Zero changes to existing Tasks UI. No implementation code written until specification approval.

---

## 2. Progression Philosophy: Decade-Long Circadian Architecture

Kairos is architected as a **10-year operating system for personal evolution**, rejecting the short-lived dopamine traps of typical gamified applications.

\`\`\`mermaid
flowchart LR
    subgraph DailyCircadian["Daily Activity Cycle (Ephemeral)"]
        T["Tasks Completed"] --> H["Earn +HP"]
        H --> W["Daily Widgets & Rings"]
        H --> C["Circadian Reset at Midnight (HP -> 0)"]
    end
    subgraph LifetimeProgression["10-Year Evolution (Permanent)"]
        H --> Cap{"Daily HP Threshold"}
        Cap -- "Below Threshold" --> XP1["1 HP = 1.0 XP"]
        Cap -- "Above Threshold" --> XP2["100 HP = 1.0 XP"]
        XP1 --> Acc["Fractional Accumulator"]
        XP2 --> Acc
        Acc --> LXP["Cumulative Lifetime XP"]
        LXP --> LVL["100 Evolutionary Levels (10 Years)"]
    end
\`\`\`

### Why This Design Works:
- **Prevents Artificial Grinding**: Because post-threshold HP converts at $100\\text{ HP} = 1\\text{ XP}$, spamming low-effort custom tasks yields negligible progression gains.
- **Rewards Consistent Daily Rhythm**: Completing a balanced set of daily core habits reliably achieves the daily threshold, maximizing progression efficiency without burnout.
- **Genuine Long-Term Meaning**: When a user reaches Level 50 or Level 100, the badge represents years of authentic, steady daily discipline.

---

## 3. Mathematical XP Progression Formula

### 3.1 Incremental XP Formula $\\Delta\\text{XP}(L)$
To advance from Level $L-1$ to Level $L$ (for $L \\in [2, 100]$):

$$\\Delta\\text{XP}(L) = \\text{round}_5\\left( 80 + 45 \\cdot (L - 1) + 2.40 \\cdot (L - 1)^{1.95} \\right)$$

*Parameters:*
- $\\Delta\\text{XP}(1) = 0$ (Baseline).
- $\\text{round}_5(x) = \\text{round}(x / 5) \\times 5$ ensures clean, human-readable integer thresholds.
- Linear term ($45 \\cdot (L-1)$) maintains consistent early-stage progression.
- Sub-quadratic exponential term ($2.40 \\cdot (L-1)^{1.95}$) gently expands requirements to match increasing daily HP capacity.

### 3.2 Cumulative Lifetime XP $\\text{CumulativeXP}(L)$
The total cumulative XP required to reach Level $L$ is:

$$\\text{CumulativeXP}(L) = \\sum_{k=1}^{L} \\Delta\\text{XP}(k)$$

- **Level 1**: **0 XP**
- **Level 5**: **835 XP**
- **Level 10**: **3,365 XP**
- **Level 25**: **25,565 XP**
- **Level 50**: **124,370 XP**
- **Level 75**: **396,690 XP**
- **Level 100**: $\\mathbf{867,415\\text{ XP}}$

---

## 4. Complete 100-Level Progression Table (Level 1 $\\rightarrow$ Level 100)

Below is the complete reference table for all 100 levels, detailing Level number, Unique Title, $\\Delta\\text{XP}$, Cumulative XP, Daily HP Threshold, Default Task Count, Milestone Unlocks, and Estimated Pacing at 80% baseline daily activity.

| Level | Unique Level Title | XP from Prev (ΔXP) | Cumulative XP | Daily HP Threshold | Default Tasks | Milestone Details | Est. Days to Level | Cumulative Time |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- | :---: | :--- |
`;

levelsData.forEach(d => {
  const dXpStr = d.deltaXP === 0 ? "+0 XP" : `+${d.deltaXP.toLocaleString('en-US')} XP`;
  const cXpStr = `**${d.cumXP.toLocaleString('en-US')} XP**`;
  const dDaysStr = d.level === 1 ? "~—" : `~${d.daysForLevel.toFixed(1)} d`;
  md += `| **${d.level}** | **${d.title}** | ${dXpStr} | ${cXpStr} | ${d.threshold} HP | ${d.taskCount} Tasks | ${d.milestoneStr} | ${dDaysStr} | ${d.timeStr} |\n`;
});

md += `
---

## 5. Thematic Epochs & 100 Evolutionary Level Titles

The 100 level titles represent an evolutionary psychological and personal development journey across 10 distinct epochs:

\`\`\`mermaid
graph TD
  E1["Epoch 1 (L1–10): Foundation & Routine"] --> E2["Epoch 2 (L11–20): Discipline & Rhythm"]
  E2 --> E3["Epoch 3 (L21–30): Momentum & Kinetic Flow"]
  E3 --> E4["Epoch 4 (L31–40): Focus & Deep Craft"]
  E4 --> E5["Epoch 5 (L41–50): Mastery & Self-Authorship"]
  E5 --> E6["Epoch 6 (L51–60): Resilience & Fortitude"]
  E6 --> E7["Epoch 7 (L61–70): Leadership & Purpose"]
  E7 --> E8["Epoch 8 (L71–80): Wisdom & Equilibrium"]
  E8 --> E9["Epoch 9 (L81–90): Harmony & Cosmic Perspective"]
  E9 --> E10["Epoch 10 (L91–100): Transcendence & Pinnacle"]
\`\`\`

### Epoch Breakdown:
1. **Epoch 1: Foundation & Routine (Levels 1–10)**: Establishing baseline daily consistency, morning/evening habits, hydration, and daily planning.
2. **Epoch 2: Discipline & Rhythm (Levels 11–20)**: Overcoming daily friction, building structured study habits, and organizing personal workspaces.
3. **Epoch 3: Momentum & Kinetic Flow (Levels 21–30)**: Fostering continuous kinetic action, Pomodoro work sessions, and deliberate skill building.
4. **Epoch 4: Focus & Deep Craft (Levels 31–40)**: Elimination of digital distraction, deepening focus, and executing high-attention creative work.
5. **Epoch 5: Mastery & Self-Authorship (Levels 41–50)**: Taking full ownership of daily systems, strategic planning, and principle-centered action.
6. **Epoch 6: Resilience & Fortitude (Levels 51–60)**: Building stoic persistence against disruptions, stress management, and physical endurance.
7. **Epoch 7: Leadership & Purpose (Levels 61–70)**: Expanding influence outward, mentoring others, and aligning daily efforts with communal purpose.
8. **Epoch 8: Wisdom & Equilibrium (Levels 71–80)**: Long-term strategic calmness, balanced reflection, and sustainable lifetime equilibrium.
9. **Epoch 9: Harmony & Cosmic Perspective (Levels 81–90)**: Seamless integration of intellect, physical fitness, relationships, and craft.
10. **Epoch 10: Transcendence & Pinnacle (Levels 91–100)**: Ultimate self-actualization, culminating in **Level 100: Aion Prime: The Kairos Omniscient**.

---

## 6. Daily HP Threshold Formula & Progression Table

### 6.1 Configurable Formula
The Daily HP Threshold determines the daily soft-cap for $1:1$ XP conversion. It increases every 5 levels:

$$\\text{dailyHpThreshold}(\\text{level}) = \\text{baseDailyThreshold} + \\left\\lfloor \\frac{\\text{level}}{\\text{thresholdInterval}} \\right\\rfloor \\times \\text{thresholdIncreasePer5Levels}$$

### TypeScript Configuration Schema:
\`\`\`typescript
export const PROGRESSION_CONFIG = {
  baseDailyThreshold: 100,           // Threshold for Levels 1–4 (100 HP)
  thresholdInterval: 5,              // Milestone interval (every 5 levels)
  thresholdIncreasePer5Levels: 15,   // +15 HP increase per milestone
  postThresholdConversionRatio: 100, // 100 HP = 1 XP (0.01 multiplier)
  baseDefaultTaskCount: 10,          // 10 initial default tasks at Level 1
  taskUnlockInterval: 5,             // 1 task unlocked every 5 levels
  maxDefaultTasks: 30,               // Exactly 30 default tasks at Level 100
};
\`\`\`

### 6.2 Milestone Threshold Progression Table

| Level Bracket | Milestone Level | Daily HP Threshold ($1.0\\times$ XP Cap) | Threshold Delta | Unlocked Default Tasks | Total Available Default HP |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **Levels 1–4** | Level 1 (Base) | **100 HP** | Base | 10 Tasks | 125 HP |
| **Levels 5–9** | Level 5 | **115 HP** | +15 HP | 11 Tasks | 140 HP |
| **Levels 10–14** | Level 10 | **130 HP** | +15 HP | 12 Tasks | 160 HP |
| **Levels 15–19** | Level 15 | **145 HP** | +15 HP | 13 Tasks | 175 HP |
| **Levels 20–24** | Level 20 | **160 HP** | +15 HP | 14 Tasks | 195 HP |
| **Levels 25–29** | Level 25 | **175 HP** | +15 HP | 15 Tasks | 210 HP |
| **Levels 30–34** | Level 30 | **190 HP** | +15 HP | 16 Tasks | 225 HP |
| **Levels 35–39** | Level 35 | **205 HP** | +15 HP | 17 Tasks | 240 HP |
| **Levels 40–44** | Level 40 | **220 HP** | +15 HP | 18 Tasks | 260 HP |
| **Levels 45–49** | Level 45 | **235 HP** | +15 HP | 19 Tasks | 280 HP |
| **Levels 50–54** | Level 50 | **250 HP** | +15 HP | 20 Tasks | 305 HP |
| **Levels 55–59** | Level 55 | **265 HP** | +15 HP | 21 Tasks | 325 HP |
| **Levels 60–64** | Level 60 | **280 HP** | +15 HP | 22 Tasks | 345 HP |
| **Levels 65–69** | Level 65 | **295 HP** | +15 HP | 23 Tasks | 370 HP |
| **Levels 70–74** | Level 70 | **310 HP** | +15 HP | 24 Tasks | 395 HP |
| **Levels 75–79** | Level 75 | **325 HP** | +15 HP | 25 Tasks | 425 HP |
| **Levels 80–84** | Level 80 | **340 HP** | +15 HP | 26 Tasks | 450 HP |
| **Levels 85–89** | Level 85 | **355 HP** | +15 HP | 27 Tasks | 480 HP |
| **Levels 90–94** | Level 90 | **370 HP** | +15 HP | 28 Tasks | 515 HP |
| **Levels 95–99** | Level 95 | **385 HP** | +15 HP | 29 Tasks | 545 HP |
| **Level 100** | Level 100 (Max) | **400 HP** | +15 HP | 30 Tasks | 580 HP |

---

## 7. Default Task Unlock Progression & All 30 Default Tasks

### 7.1 Formula & Boundary Verification
$$\\text{defaultTaskCount}(\\text{level}) = 10 + \\left\\lfloor \\frac{\\text{level}}{5} \\right\\rfloor$$

- **Levels 1–4**: $10 + 0 = 10$ tasks
- **Level 5**: $10 + 1 = 11$ tasks (Task 11 unlocks immediately at Level 5)
- **Level 10**: $10 + 2 = 12$ tasks (Task 12 unlocks at Level 10)
- **Level 100**: $10 + 20 = 30$ tasks (Task 30 unlocks at Level 100)

### 7.2 Complete 30 Default Tasks Catalog
Every task represents a simple, practical, measurable lifestyle or productivity habit (free of medical jargon):

| ID | Title | Description | Category | HP Reward | Recurrence | Unlock Level | Active Status |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| \`task_01\` | **Wake up on time** | Rise at your planned morning hour to set a proactive daily routine. | Routine | **10 HP** | Daily | Level 1 | Active |
| \`task_02\` | **Healthy Breakfast** | Eat a nutritious breakfast to fuel your morning. | Wellness | **10 HP** | Daily | Level 1 | Active |
| \`task_03\` | **Lunch on Time** | Pause mid-day to have a nourishing lunch break. | Wellness | **10 HP** | Daily | Level 1 | Active |
| \`task_04\` | **Dinner on Time** | Have a balanced evening meal at a reasonable hour. | Wellness | **10 HP** | Daily | Level 1 | Active |
| \`task_05\` | **Stay Hydrated** | Drink water regularly throughout the day. | Wellness | **15 HP** | Daily | Level 1 | Active |
| \`task_06\` | **Plan for Tomorrow** | Write down your top 3 priorities for the upcoming day. | Organization | **15 HP** | Daily | Level 1 | Active |
| \`task_07\` | **Study for 10 Minutes** | Dedicate 10 minutes to reading, study, or learning. | Intellect | **15 HP** | Daily | Level 1 | Active |
| \`task_08\` | **Read Daily News / Articles** | Read an informative article, book passage, or daily news. | Intellect | **10 HP** | Daily | Level 1 | Active |
| \`task_09\` | **Short Physical Activity** | Take a 10-minute walk, stretch, or do light exercise. | Fitness | **15 HP** | Daily | Level 1 | Active |
| \`task_10\` | **Review Today's Progress** | Review completed tasks, acknowledge daily wins, and note lessons. | Reflection | **15 HP** | Daily | Level 1 | Active |
| \`task_11\` | **Read for 15 Minutes** | Read 15 minutes of a non-fiction book or educational material. | Intellect | **15 HP** | Daily | Level 5 | Active at L5 |
| \`task_12\` | **Practice a Skill** | Spend 20 minutes deliberately practicing an instrument, coding, or craft. | Skill | **20 HP** | Daily | Level 10 | Active at L10 |
| \`task_13\` | **Declutter Workspace** | Organize physical desk and clean up digital files and tabs. | Organization | **15 HP** | Daily | Level 15 | Active at L15 |
| \`task_14\` | **Focus Work Session (25 min)** | Complete one uninterrupted 25-minute Pomodoro session on a key task. | Productivity | **20 HP** | Daily | Level 20 | Active at L20 |
| \`task_15\` | **Evening Reflection & Journaling** | Write 3 positive moments or insights in a brief daily journal. | Reflection | **15 HP** | Daily | Level 25 | Active at L25 |
| \`task_16\` | **Connect with Family or Friend** | Send a thoughtful message or have a brief conversation with someone close. | Social | **15 HP** | Daily | Level 30 | Active at L30 |
| \`task_17\` | **Stretching & Mobility Break** | Complete 15 minutes of dedicated physical stretching or posture exercises. | Fitness | **15 HP** | Daily | Level 35 | Active at L35 |
| \`task_18\` | **Plan Upcoming Week** | Review calendar events and organize weekly milestones. | Organization | **20 HP** | Daily | Level 40 | Active at L40 |
| \`task_19\` | **Learn Something New** | Explore an unfamiliar topic, tutorial, or educational video. | Intellect | **20 HP** | Daily | Level 45 | Active at L45 |
| \`task_20\` | **Deep Work Session (45 min)** | Execute 45 minutes of distraction-free, focused creative/technical work. | Productivity | **25 HP** | Daily | Level 50 | Active at L50 |
| \`task_21\` | **Track Daily Expenses** | Log daily expenditures and review your personal budget. | Discipline | **20 HP** | Daily | Level 55 | Active at L55 |
| \`task_22\` | **10 Minutes of Quiet Downtime** | Spend 10 minutes relaxing screen-free to decompress and reset. | Wellness | **20 HP** | Daily | Level 60 | Active at L60 |
| \`task_23\` | **Write a Summary / Key Notes** | Write a short summary capturing key insights from your study or work. | Intellect | **25 HP** | Daily | Level 65 | Active at L65 |
| \`task_24\` | **Help or Mentor Someone** | Offer guidance, assist a peer, or perform a helpful act. | Social | **25 HP** | Daily | Level 70 | Active at L70 |
| \`task_25\` | **Deliberate Practice Session (30 min)** | Conduct a 30-minute structured training block targeting skill refinement. | Skill | **30 HP** | Daily | Level 75 | Active at L75 |
| \`task_26\` | **Long-Term Goals Review** | Review quarterly milestones and verify alignment with long-term goals. | Reflection | **25 HP** | Daily | Level 80 | Active at L80 |
| \`task_27\` | **30-Minute Workout / Cardio** | Complete a 30-minute fitness session, jog, strength workout, or sport. | Fitness | **30 HP** | Daily | Level 85 | Active at L85 |
| \`task_28\` | **Mastery Focus Session (60 min)** | Execute 60 minutes of uninterrupted, peak-quality project work. | Productivity | **35 HP** | Daily | Level 90 | Active at L90 |
| \`task_29\` | **Optimize Daily Routines** | Audit daily habits, eliminate recurring friction, and organize workspace. | Organization | **30 HP** | Daily | Level 95 | Active at L95 |
| \`task_30\` | **Weekly Life Review & Synthesis** | Complete a comprehensive weekly review of progress, systems, and mindset. | Reflection | **35 HP** | Daily | Level 100 | Active at L100 |

---

## 8. HP $\\rightarrow$ XP Conversion Mechanics & Boundary Splitting

### 8.1 Conversion Rules
When a task awarding $\\Delta H$ is completed, given current daily HP earned $H_{\\text{today}}$ and Daily Threshold $T$:

1. **Entirely Below Threshold** ($H_{\\text{today}} + \\Delta H \\le T$):
   $$\\Delta\\text{XP} = \\Delta H \\times 1.0$$
2. **Entirely Above Threshold** ($H_{\\text{today}} \\ge T$):
   $$\\Delta\\text{XP} = \\Delta H \\times 0.01$$
3. **Threshold Boundary Splitting** ($H_{\\text{today}} < T$ and $H_{\\text{today}} + \\Delta H > T$):
   - **Pre-Cap Slice**: $H_{\\text{pre}} = T - H_{\\text{today}}$ (converts at $1.0\\times$)
   - **Post-Cap Slice**: $H_{\\text{post}} = \\Delta H - H_{\\text{pre}}$ (converts at $0.01\\times$)
   $$\\Delta\\text{XP} = (H_{\\text{pre}} \\times 1.0) + (H_{\\text{post}} \\times 0.01)$$

> [!IMPORTANT]
> The user always receives the **full HP reward** for their daily score and widgets ($+20\\text{ HP}$). Only the long-term XP conversion is modulated by the circadian threshold.

### 8.2 Splitting Example Walkthrough
- Threshold $T = 100\\text{ HP}$, $H_{\\text{today}} = 95\\text{ HP}$, Task Reward $\\Delta H = 20\\text{ HP}$.
- $H_{\\text{pre}} = 100 - 95 = 5\\text{ HP} \\rightarrow 5.00\\text{ XP}$.
- $H_{\\text{post}} = 20 - 5 = 15\\text{ HP} \\rightarrow 15 \\times 0.01 = 0.15\\text{ XP}$.
- Total Yield: **+20 HP**, **+5.15 XP**. New $H_{\\text{today}} = 115\\text{ HP}$.

---

## 9. Fractional XP Precision & Accumulation Engine

Fractional XP generated by post-threshold tasks ($0.01$ increments) must **never be truncated, discarded, or lost**.

### 9.1 Data Representation
\`\`\`typescript
interface ProgressionState {
  totalXP: number;        // Non-negative integer representing fully earned whole XP
  xpRemainder: number;    // Floating point number in range [0.000000, 1.000000)
  level: number;          // Current level (1–100)
  todayHP: number;        // Reset to 0 every calendar midnight
  lifetimeHP: number;     // Monotonically increasing cumulative lifetime HP
}
\`\`\`

### 9.2 Accumulation Algorithm
\`\`\`typescript
function addExperience(currentXP: number, currentRemainder: number, earnedXP: number) {
  const totalCombined = currentRemainder + earnedXP;
  const wholeGained = Math.floor(totalCombined);
  const newRemainder = Number((totalCombined - wholeGained).toFixed(6));
  const newTotalXP = currentXP + wholeGained;

  return {
    totalXP: newTotalXP,
    xpRemainder: newRemainder,
    effectiveXP: Number((newTotalXP + newRemainder).toFixed(6))
  };
}
\`\`\`

---

## 10. Independent Mathematical Verification & Multi-Scenario Sensitivity Analysis

To rigorously verify that the progression is intentionally long-term and robust across diverse usage patterns, we simulate the complete 100-level progression under **5 distinct daily activity scenarios**:

### 10.1 Activity Scenario Definitions:
1. **60% Activity (Casual User)**: User completes ~60% of available daily threshold (e.g. 4–5 habits/day, occasional missed days).
2. **80% Activity (Realistic Sustainable Baseline)**: User maintains strong consistent habit completion (~80% of threshold, normal life schedule).
3. **100% Activity (Perfect Core Daily)**: User completes 100% of their threshold habits every single day for 365 days/year without missing a single day.
4. **120% Activity (Power User / Extra Tasks)**: User completes all threshold habits plus additional custom tasks ($120\\%$ gross HP).
5. **150% Activity (Extreme Over-Achiever)**: User completes double tasks, heavily activating post-cap compression ($150\\%$ gross HP).

### 10.2 Mathematical Simulation Results

| Scenario | Daily Activity Ratio | Daily Pre-Cap XP Yield | Daily Post-Cap XP Yield | Net Daily XP at Level 50 | Total Days to Level 100 | Total Years to Level 100 | Evaluation |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **60% Activity** | $0.60 \\times T$ | $0.60 \\times T$ | $0.00\\text{ XP}$ | 150.0 XP/day | **4,878.4 Days** | **13.36 Years** | Achievable, relaxed long-term path |
| **80% Activity** | $0.80 \\times T$ | $0.80 \\times T$ | $0.00\\text{ XP}$ | 200.0 XP/day | **3,658.8 Days** | **10.02 Years** | **Target 10-Year Baseline** |
| **100% Activity** | $1.00 \\times T$ | $1.00 \\times T$ | $0.00\\text{ XP}$ | 250.0 XP/day | **2,927.0 Days** | **8.01 Years** | Perfect flawless consistency |
| **120% Activity** | $1.20 \\times T$ | $1.00 \\times T$ | $0.002 \\times T$ | 250.5 XP/day | **2,921.2 Days** | **8.00 Years** | Circadian cap prevents speedrunning |
| **150% Activity** | $1.50 \\times T$ | $1.00 \\times T$ | $0.005 \\times T$ | 251.2 XP/day | **2,912.5 Days** | **7.97 Years** | Mathematically bounded against grinding |

\`\`\`mermaid
gantt
    title Kairos 100-Level Sensitivity Horizon
    dateFormat  X
    axisFormat %s yr
    section Activity Scenarios
    150% Extreme Power User (7.97 Years)   :active, 0, 2912
    100% Perfect Core Routine (8.01 Years) :done, 0, 2927
    80% Realistic Baseline (10.02 Years)  :crit, 0, 3658
    60% Casual Sustainable (13.36 Years)  :active, 0, 4878
\`\`\`

### Key Insights from Sensitivity Analysis:
- **Strictly Bounded Lower Limit (~8 Years)**: Due to the $100\\text{ HP} = 1\\text{ XP}$ circadian compression, even extreme grinding cannot bypass the ~8-year barrier.
- **Achievable Upper Limit (~13 Years)**: A user taking a relaxed, casual approach still makes steady, meaningful progress, reaching Level 100 in ~13 years.
- **Target Calibration (~10 Years)**: Normal, healthy, consistent habit execution reaches Level 100 in **10.02 years (3,658.8 days)**.

---

## 11. Midnight Calendar Date Rollover & Daily Reset

1. **Local Calendar Rollover Trigger**: Evaluated on app launch or upon crossing midnight in the user's local timezone (\`YYYY-MM-DD\`).
2. **What Resets at 00:00:00**:
   - \`todayHP\` resets to \`0\`.
   - Default and recurring task completion flags reset to \`completed: false\`.
   - Daily threshold ring resets to \`0 / dailyHpThreshold\`.
3. **What NEVER Resets**:
   - \`totalXP\` (Cumulative lifetime integer XP).
   - \`xpRemainder\` (Decimal fractional remainder $[0.0, 1.0)$).
   - \`level\` (Current progression level 1–100).
   - \`lifetimeHP\` (Historical cumulative HP).
   - Streaks & milestone task unlocks.

---

## 12. Edge Cases & Robustness Matrix

| Scenario / Edge Case | System Behavior & Mitigation |
| :--- | :--- |
| **Offline Task Completion** | When offline, timestamps are recorded locally. Upon reconnection, tasks are credited against the calendar day on which they were completed without retroactively inflating subsequent day thresholds. |
| **Task Uncompletion / Undo** | If a user accidentally marks a task complete and immediately uncompletes it: the exact awarded HP and XP (including fractional slice) are subtracted cleanly. |
| **Multi-Level Jump on Bulk Sync** | If a major offline sync grants enough XP to cross multiple levels (e.g., Level 4 to Level 6), the engine processes each level boundary sequentially, triggering unlocks for both Level 5 and Level 6 in correct order. |
| **Timezone Travel Across Midnight** | Date comparison uses ISO local date (\`new Date().toLocaleDateString('en-CA')\`). Rollover occurs exactly once per distinct calendar date. |
| **Post-100 Behavior** | Level 100 is the permanent max level. Cumulative XP continues to increment for global leaderboards and personal records, but level remains capped at 100. |

---

## 13. Implementation Plan (Pending User Approval)

Upon user approval of this specification:
1. Create \`src/features/progression/config/progressionConfig.ts\` (Config, Level Table, Formulas).
2. Create \`src/features/progression/services/progressionEngine.ts\` (Pure calculation engine, threshold splitting, fractional accumulator).
3. Create \`src/features/progression/data/defaultTasks.ts\` (The 30 simple lifestyle default tasks).
4. Integrate with \`useAppStore.ts\` task completion handler and profile display.
`;

fs.writeFileSync(path.join('e:', 'Kairos', 'KAIROS_PROGRESSION_SPEC.md'), md, 'utf8');
console.log('KAIROS_PROGRESSION_SPEC.md updated successfully! Total bytes: ' + md.length);
