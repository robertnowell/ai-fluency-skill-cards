# Design Process — How the Idea Formed

## Honest framing on time

The assignment constraint was one day of work. I exceeded this because the project was fun.

The most interesting thing I did this week wasn't the build. It was watching an idea form. What follows is the arc of those five days, anchored in verbatim moments from Claude Code session transcripts. The build phase itself — Sun morning through Mon evening — lives in a separate transcripts repo at [robertnowell/ai-fluency-skill-cards-transcripts](https://github.com/robertnowell/ai-fluency-skill-cards-transcripts). What's documented here is the pre-build exploration: the research, the wrong turns, and the moment of clarity.

> *A note on what this document is for:* the [main design rationale](./design-rationale.md) explains *why* the product is the way it is. This document explains *how I got there.* Read the rationale document to understand the take home project. Read this if you want to see how I worked.

---

## Day 1 — Thursday evening Apr 2: orientation

I started the take-home in the evening, opening the JD as my first prompt and asking Claude to ground me in the role and the team. Within twenty minutes I'd made my first strategic call:

> **Thu Apr 2, 18:53 PT** *(session `98a09409`)*
>
> *"first we need to decide what the focus on improvement is, and what the product surface area is — like what are we trying to do here.... what is the concept of how we would try to improve users — we need to think about what skill development means here, like are we in claude.ai, claude cowork, or claude code? i would actually target claude cowork... it is new, powerful, and least understood"*

This decision held. **Choose the surface before choosing the product.** Cowork was the most underserved learning surface in Anthropic's lineup — newest, most powerful, least mapped. Whatever I built, I wanted it to live there.

What I didn't know yet was *what* I'd build. The rest of Thursday night was reading: published research from the team, the Learning Mode/Output Style work, the AI Fluency Index, Drew Bent's interviews.

---

## Day 2 — Friday night Apr 3: the language-learning detour

Friday was the day I seriously explored using **Konid** — a language coach side project I'd been building — as the take-home submission. Konid was already a working MCP server and cowork plugin with text to speech, coaching classification, and audio playback. It seemed like the obvious thing to extend.

Most of Friday night went into trying to ground Konid in a defensible learning framework:

> **Fri Apr 3, 16:52 PT** *(session `b4f78b6d`)*
>
> *"okay so when we think about konid which is two things: socially intelligent translation and learn audio pronunciation — both of these could be attempted independently, they are related but in some ways distinct opportunities for both translation and learning. what would be the right path for konid through this"*

I spent some time on deep research: how text adventure games approach skill development, whether LLMs can evaluate spoken pronunciation, what evaluation criteria would actually scale. Then I asked the question that — in retrospect — turned out to be important:

> **Fri Apr 3, 17:49 PT** *(session `b4f78b6d`)*
>
> *"konid classify all inquiries as one type of help, like discover, reconstruct, generate, or navigate. perhaps better names. over time, users will advance from the first to the second, third etc. how would we rigorously and defensibly (but extremely simply) measure this, what would be the framework used, and how would measurements be taken and how would we display it i like a tamogotchi character card, like a baseball card that shows your progress"*

when i read that quote and then go look at what Skill Tree actually does, the architecture is similar. Classify behaviors into types. Track progression over time. Display the result as a character. The only difference is the substrate: instead of Konid's language-coaching inquiries, Skill Tree analyzes AI collaboration behaviors. Instead of "discover/reconstruct/generate/navigate," it's the eleven behaviors from Anthropic's published AI Fluency Index. Instead of a tamagotchi, it's a museum-art archetype card.

I didn't realize this until later. I thought I was inventing something new on Sunday morning. I was actually porting a structure I'd already worked out on Friday — for a different domain — to a domain that fit the take-home better.

---

## Day 3 — Saturday Apr 4: the framework, the de-risk, and the pivot

Saturday morning I was still trying to make Konid work as the submission. By afternoon I wasn't.

> **Sat Apr 4, 16:24 PT** *(session `a8414f54`)*
>
> *"wait, don't worry about the surface yet — let's think about the framework underneath this — how is this interesting for a user to understand, what value do they get? let's anchor from the user perspective — like why are they using this? otherwise we are just naval gazing"*

About thirty minutes later, the de-risks list:

> **Sat Apr 4, 16:59 PT** *(session `a8414f54`)*
>
> *"we need to derisk a few things — (1) is the classifier guaranteed? this being accurate is absolutely critical and mostly out of our hands ... (2) honestly people love horoscopes and i want a character based on my current skill tree — i don't care if it's pedagogically meaningless, it's psychologically fun"*

The horoscope line is why the archetypes exist. The [design rationale](./design-rationale.md) calls this identity-based motivation.

The pivot itself happened later that afternoon, in a different session:

> **Sat Apr 4, 15:54 PT** *(session `b0723af6`)*
>
> *"so previously we've been exploring language learning for our takehome, but i am now thinking that other ideas may be fun"*

Konid was set aside as a take-home candidate within that hour. The Friday structure — classify, track progression, display as a character — would get applied to AI fluency on Cowork instead.

---

## Day 4 — Sunday Apr 5: validation and the build

I slept on it. Saturday night I'd opened a new session at 22:55 PT and asked Claude to write up the plugin architecture — what mechanisms exist for accessing conversation data, what the SessionEnd hook can do, what a plugin-plus-web-companion split looks like in practice. I read the writeup and went to bed.

Sunday morning I woke up, opened the same session, and validated:

> **Sun Apr 5, 10:41 PT** *(session `a5c97e99` — first session in the build bundle)*
>
> *"can you preview for me all of the archetypes, and what the trigger points are to distinguish between them? i am curious to see our designs"*

> **Sun Apr 5, 10:52 PT** *(session `a5c97e99`)*
>
> *"this is quite cool actually -- the flowchart of the archetypes based in the theory of how people progress in their ai learning -- what can we do with this insight, can we visualize?"*

That second prompt — *"can we visualize?"* — is where the build phase started. The rest is in the [build transcripts repo](https://github.com/robertnowell/ai-fluency-skill-cards-transcripts); see [`MANIFEST.md`](https://github.com/robertnowell/ai-fluency-skill-cards-transcripts/blob/main/MANIFEST.md) for the phase-by-phase index.

---

## Two notes from packaging

**Observer effect.** While packaging this submission, I asked Claude to scan the transcripts for unprofessional language. The first scan reported 71 hits across 42 sessions. Most of them were from the planning conversation itself — by *talking* about words like "fuck" and "shit" while planning the scan, we'd injected them into the planning session's own log, which the scanner then counted as evidence. The real count was 4 instances across 290MB of transcripts. Measuring a thing changes the thing. Same artifact-effect dynamic the [design rationale](./design-rationale.md) is concerned with.

**Push protection.** GitHub rejected the first push of the curated transcripts. During development I'd been running classifier scripts with `export ANTHROPIC_API_KEY="..." && python3 ...`, and the tool calls had captured the literal keys in the JSONL logs. My own pre-push scan had checked for the words "API key" and "token" — not the actual `sk-ant-` format. GitHub caught what my scan missed. A follow-up scan found 42 secret occurrences across 5 files; all redacted in place before re-push. Keys to be rotated separately.

---

The receipts are in the [transcripts repo](https://github.com/robertnowell/ai-fluency-skill-cards-transcripts). The product is in this repo.
