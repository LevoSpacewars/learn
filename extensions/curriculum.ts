/**
 * curriculum — goals, milestones, fundamentals, and the scheduler's tools.
 *
 * The learner's goals (MD, HDX, MS analysis, …) each have a spine of
 * milestones: real tasks, not chapters. Fundamentals (mostly math/physics)
 * are shared nodes that milestones need. The scheduler (store.nextOnPath)
 * decides what comes next: attempt a ready milestone, or learn the one
 * fundamental that unlocks the nearest one. Code decides; the teacher
 * executes and explains why.
 *
 * Tools: goal_set, goal_progress, fundamental_set, curriculum_next,
 *        curriculum_place, curriculum_map
 * Not loaded into subagents.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import {
	curriculumMap,
	learnerSlice,
	loadLearner,
	nextOnPath,
	recordInterest,
	setMilestone,
	upsertFundamental,
	upsertGoal,
} from "./review/store.ts";

const MilestoneKind = Type.Union([Type.Literal("do"), Type.Literal("derive"), Type.Literal("read"), Type.Literal("build"), Type.Literal("critique")]);

const GoalSetParams = Type.Object({
	id: Type.String({ description: "Short slug, e.g. 'hdx', 'md', 'ms-analysis', 'linux', 'ai', 'wafer-optics'." }),
	title: Type.String(),
	why: Type.Optional(Type.String({ description: "One line: what being able to do this means for the learner." })),
	weight: Type.Optional(Type.Number({ description: "1 background · 2 normal · 3 leading. Default 2." })),
	status: Type.Optional(Type.Union([Type.Literal("active"), Type.Literal("paused"), Type.Literal("done")])),
	milestones: Type.Optional(
		Type.Array(
			Type.Object({
				id: Type.String({ description: "Short id unique within the goal, e.g. 'uptake-curve'." }),
				title: Type.String({ description: "A real task, phrased as something you DO: analyze, derive, build, critique, reproduce." }),
				kind: MilestoneKind,
				description: Type.Optional(Type.String({ description: "What counts as done, in one or two lines." })),
				needs: Type.Optional(Type.Array(Type.String(), { description: "Fundamental slugs it depends on, or 'm:<milestoneId>' for an earlier milestone of this goal. Keep to the few that are genuinely required." })),
			}),
			{ description: "The spine, in order of difficulty. Replaces the existing spine; statuses of milestones with the same id are kept." },
		),
	),
});

const GoalProgressParams = Type.Object({
	goal: Type.String(),
	milestone: Type.String(),
	status: Type.Union([Type.Literal("in_progress"), Type.Literal("done"), Type.Literal("ready"), Type.Literal("locked")]),
	evidence: Type.Optional(Type.String({ description: "What the learner did that counts (one line). Required for 'done'." })),
	lesson: Type.Optional(Type.String({ description: "Lesson slug where it happened." })),
});

const FundamentalParams = Type.Object({
	slug: Type.String({ description: "Slug; the lesson that teaches it uses the same slug." }),
	title: Type.Optional(Type.String()),
	domain: Type.Optional(Type.String({ description: "math | physics | chemistry | cs | stats | optics | …" })),
	status: Type.Optional(Type.Union([Type.Literal("unknown"), Type.Literal("shaky"), Type.Literal("solid")], { description: "Explicit status, e.g. after a placement probe. Omit to derive it from lessons." })),
	note: Type.Optional(Type.String()),
	serves: Type.Optional(Type.Array(Type.String(), { description: "Milestones this is needed for, as 'goal/milestone'. Adds the slug to their needs." })),
});

const PlaceParams = Type.Object({
	text: Type.String({ description: "What the learner brought, in their words (paper title/path, idea, question, chapter)." }),
	goal: Type.Optional(Type.String({ description: "Goal it mainly serves." })),
	milestone: Type.Optional(Type.String({ description: "Existing milestone it advances, if any." })),
	fundamentals: Type.Optional(Type.Array(Type.String(), { description: "Fundamental slugs it needs or exercises." })),
	newMilestone: Type.Optional(
		Type.Object({
			id: Type.String(),
			title: Type.String(),
			kind: MilestoneKind,
			description: Type.Optional(Type.String()),
			needs: Type.Optional(Type.Array(Type.String())),
			after: Type.Optional(Type.String({ description: "Insert after this milestone id (default: before the first unfinished one)." })),
		}, { description: "If the brought material deserves to be a milestone of its own, add it to the goal's spine." }),
	),
});

function textResult(text: string, details?: unknown) {
	return { content: [{ type: "text" as const, text }], details };
}

function quietCall(label: string) {
	return (_args: any, theme: any) => new Text(theme.fg("dim", label), 0, 0);
}
function quietResult(res: any, _opts: any, theme: any) {
	const first = res.content?.[0];
	const text = first?.type === "text" ? first.text : "";
	return new Text(theme.fg("dim", text.split("\n")[0].slice(0, 120)), 0, 0);
}

export default function curriculum(pi: ExtensionAPI) {
	if (process.env.PI_SUBAGENT_AGENT) return;

	pi.registerTool({
		name: "goal_set",
		label: "goal",
		description: "Create or update a goal and its spine of milestones (real tasks in difficulty order, each with the fundamentals it needs). Used by the curriculum setup; also when a goal's spine changes.",
		renderCall: quietCall("goal"),
		renderResult: quietResult,
		parameters: GoalSetParams,
		async execute(_id, params, _s, _u, ctx) {
			const g = upsertGoal(ctx.cwd, params);
			return textResult(`Goal "${g.title}" saved: ${g.milestones.length} milestones.\n` + g.milestones.map((m) => `- [${m.status}] ${m.id} · ${m.title}${m.needs.length ? ` (needs ${m.needs.join(", ")})` : ""}`).join("\n"));
		},
	});

	pi.registerTool({
		name: "goal_progress",
		label: "milestone",
		description: "Mark a milestone in_progress when a session starts attempting it, or done when the learner has actually done it (with evidence). Done milestones mark their fundamentals solid.",
		renderCall: quietCall("milestone"),
		renderResult: quietResult,
		parameters: GoalProgressParams,
		async execute(_id, params, _s, _u, ctx) {
			if (params.status === "done" && !params.evidence?.trim()) throw new Error("Evidence is required to mark a milestone done.");
			const m = setMilestone(ctx.cwd, params.goal, params.milestone, params);
			const next = nextOnPath(loadLearner(ctx.cwd))[0];
			return textResult(`${params.goal}/${m.id}: ${m.status}.${next ? ` Scheduler's next pick: ${next.reason}` : ""}`);
		},
	});

	pi.registerTool({
		name: "fundamental_set",
		label: "fundamental",
		description: "Register or update a fundamental (a shared prerequisite such as 'eigendecomposition' or 'boltzmann-distribution'): its domain, which milestones it serves, and optionally an explicit status after a placement probe.",
		renderCall: quietCall("fundamental"),
		renderResult: quietResult,
		parameters: FundamentalParams,
		async execute(_id, params, _s, _u, ctx) {
			const f = upsertFundamental(ctx.cwd, params);
			return textResult(`Fundamental "${f.title}" (${f.slug}) saved${f.status ? `, status ${f.status}` : ""}.`);
		},
	});

	pi.registerTool({
		name: "curriculum_next",
		label: "next on path",
		description: "Ask the scheduler what comes next across all goals: attempt a ready milestone, or learn the fundamental that unlocks the nearest one. Returns the top picks with reasons. The pick is the default; the learner's interest can override it.",
		renderCall: quietCall("next on path"),
		renderResult: quietResult,
		parameters: Type.Object({}),
		async execute(_id, _params, _s, _u, ctx) {
			const picks = nextOnPath(loadLearner(ctx.cwd));
			if (picks.length === 0) return textResult("No goals or no unfinished milestones. Run the curriculum setup.");
			return textResult(
				picks
					.slice(0, 3)
					.map((p, i) => `${i + 1}. ${p.reason}${p.action === "learn" ? ` → lesson slug "${p.fundamental!.slug}"` : ` → lesson slug "m-${p.goal.id}-${p.milestone.id}"`}`)
					.join("\n"),
				{ picks: picks.slice(0, 3).map((p) => ({ goal: p.goal.id, milestone: p.milestone.id, action: p.action, fundamental: p.fundamental?.slug })) },
			);
		},
	});

	pi.registerTool({
		name: "curriculum_place",
		label: "place",
		description:
			"Place something the learner brought (a paper, idea, question, chapter) into the graph: which goal and milestone it serves, which fundamentals it needs, and optionally a new milestone for it. Records the interest (which boosts that goal in the scheduler for a week) and returns the goal's current state.",
		renderCall: quietCall("place"),
		renderResult: quietResult,
		parameters: PlaceParams,
		async execute(_id, params, _s, _u, ctx) {
			if (params.newMilestone && params.goal) {
				const store = loadLearner(ctx.cwd);
				const g = store.goals.find((x) => x.id === params.goal);
				if (g) {
					const nm = params.newMilestone;
					const list = g.milestones.map((m) => ({ id: m.id, title: m.title, kind: m.kind, description: m.description, needs: m.needs }));
					const entry = { id: nm.id, title: nm.title, kind: nm.kind, description: nm.description, needs: nm.needs ?? [] };
					let idx = nm.after ? list.findIndex((m) => m.id === nm.after) + 1 : g.milestones.findIndex((m) => m.status !== "done");
					if (idx < 0) idx = list.length;
					if (!list.some((m) => m.id === nm.id)) list.splice(idx, 0, entry);
					upsertGoal(ctx.cwd, { id: g.id, title: g.title, milestones: list });
				}
			}
			recordInterest(ctx.cwd, { text: params.text, goal: params.goal, milestone: params.newMilestone?.id ?? params.milestone, fundamentals: params.fundamentals });
			const slice = learnerSlice(ctx.cwd, { topics: [...(params.fundamentals ?? []), ...(params.goal ? [params.goal] : [])] });
			return textResult(`Placed under ${params.goal ?? "(no goal)"}${params.milestone || params.newMilestone ? ` / ${params.newMilestone?.id ?? params.milestone}` : ""}.\n\n${slice}`);
		},
	});

	pi.registerTool({
		name: "curriculum_map",
		label: "curriculum map",
		description: "The whole curriculum: every goal, its milestones with status and unmet needs, and all fundamentals with their status.",
		renderCall: quietCall("curriculum map"),
		renderResult: quietResult,
		parameters: Type.Object({}),
		async execute(_id, _params, _s, _u, ctx) {
			return textResult(curriculumMap(loadLearner(ctx.cwd)));
		},
	});

	pi.registerCommand("goals", {
		description: "Show the curriculum map (goals, milestones, fundamentals)",
		handler: async (_args, ctx: any) => {
			ctx.ui.notify(curriculumMap(loadLearner(ctx.cwd)), "info");
		},
	});
}
