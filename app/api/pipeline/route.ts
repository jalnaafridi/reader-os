import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

const DELAY = (ms: number) => new Promise(r => setTimeout(r, ms));

async function callClaude(system: string, user: string, maxTokens = 1500) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  const d = await res.json();
  const text = d.content?.[0]?.text || "";
  return text.replace(/```json\n?|\n?```/g, "").trim();
}

async function fetchBooksFromOL(genre: string, limit = 3) {
  const subjects: Record<string, string> = {
    MYSTERY: "mystery_and_detective_stories", THRILLER: "suspense",
    FANTASY: "fantasy", ROMANCE: "love_stories", LITERARY: "psychological_fiction",
  };
  const subject = subjects[genre] || "mystery_and_detective_stories";
  const res = await fetch(`https://openlibrary.org/search.json?subject=${subject}&sort=rating&limit=20&fields=key,title,author_name,cover_i,first_publish_year`, {
    headers: { "User-Agent": "ReaderOS/1.0" },
  });
  if (!res.ok) throw new Error("Open Library fetch failed");
  const data = await res.json();
  const docs = (data.docs || []).filter((d: any) => d.cover_i && d.author_name?.length).slice(0, limit);

  const books = [];
  for (const doc of docs) {
    await DELAY(300);
    try {
      const workId = doc.key.replace("/works/", "");
      const detail = await fetch(`https://openlibrary.org/works/${workId}.json`, { headers: { "User-Agent": "ReaderOS/1.0" } }).then(r => r.json());
      const desc = typeof detail.description === "string" ? detail.description : detail.description?.value || "A compelling story.";
      books.push({
        openLibraryId: doc.key, title: doc.title,
        author: doc.author_name[0], description: desc.slice(0, 1000),
        coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
        genre, subjects: [],
      });
    } catch {}
  }
  return books;
}

async function processBook(rawBook: any, supabase: any, maxChapters: number) {
  // Agent 2: Truby Analysis
  const analysis = await callClaude(
    `You are a story architect using Truby's 22-step framework. Analyze books and return ONLY valid JSON.`,
    `Analyze this book for Reader OS:
Title: ${rawBook.title}
Author: ${rawBook.author}
Genre: ${rawBook.genre}
Description: ${rawBook.description.slice(0, 800)}

Return JSON:
{
  "designingQuestion": "the core moral question (not a plot question)",
  "identityTheme": "what this book reveals about the reader",
  "difficulty": "BEGINNER"|"INTERMEDIATE"|"ADVANCED",
  "chapterTitles": ["8 evocative titles mapping to Truby arc"],
  "trubySteps": ["WEAKNESS_AND_NEED","DESIRE","OPPONENT_APPEARS","PLAN","BATTLE","SELF_REVELATION","NEW_EQUILIBRIUM","NEW_EQUILIBRIUM"]
}`
  );

  let meta: any = {};
  try { meta = JSON.parse(analysis); } catch { meta = { designingQuestion: "What do you owe the truth?", identityTheme: "how you handle moral complexity", difficulty: "INTERMEDIATE", chapterTitles: Array.from({length:8}, (_,i) => `Chapter ${i+1}`), trubySteps: ["WEAKNESS_AND_NEED","DESIRE","OPPONENT_APPEARS","PLAN","BATTLE","SELF_REVELATION","NEW_EQUILIBRIUM","NEW_EQUILIBRIUM"] }; }

  // Insert book
  const [bookRow] = await supabase.from("books").upsert({
    open_library_id: rawBook.openLibraryId, title: rawBook.title, author: rawBook.author,
    description: rawBook.description, cover_url: rawBook.coverUrl,
    cover_color: getCoverColor(rawBook.genre), genre: rawBook.genre,
    difficulty: meta.difficulty || "INTERMEDIATE",
    designing_question: meta.designingQuestion || "What do you owe the truth?",
    identity_theme: meta.identityTheme || "", archetype_affinity: [],
    total_chapters: maxChapters, is_published: false,
  }, { onConflict: "open_library_id" }).select().single();

  if (!bookRow?.data) return;
  const bookId = bookRow.data.id;

  // Generate chapters
  const titles = meta.chapterTitles || [];
  const steps = meta.trubySteps || [];

  for (let i = 0; i < Math.min(maxChapters, titles.length); i++) {
    await DELAY(600);
    const chapterData = await supabase.from("chapters").insert({
      book_id: bookId, order: i + 1, title: titles[i] || `Chapter ${i+1}`,
      truby_step: steps[i] || "PLAN", description: `Chapter ${i+1} of ${rawBook.title}`,
      dominant_emotion: "tension",
    }).select().single();

    if (!chapterData?.data) continue;
    const chapterId = chapterData.data.id;

    // Generate 2 scenes per chapter
    await DELAY(500);
    const scenesJson = await callClaude(
      `You are a literary author for Reader OS. Write immersive scenes that end at moral tension peaks. Return ONLY valid JSON array.`,
      `Generate 2 scenes for Chapter "${titles[i]}" of "${rawBook.title}".
Designing question: "${meta.designingQuestion}"
Genre: ${rawBook.genre}

Return JSON array:
[{"order":1,"title":"scene title","content":"250-300 words of literary prose ending at tension peak","choiceContext":"one sentence describing the exact moment of tension","choiceQuestion":"What does [protagonist] do?","identityMirror":"what choosing reveals about the reader"},{"order":2,...}]`,
      2500
    );

    let scenes = [];
    try { scenes = JSON.parse(scenesJson); } catch { scenes = [{ order:1, title:"Scene 1", content:"The story continues with mounting tension.", choiceContext:"A decision must be made.", choiceQuestion:"What happens next?", identityMirror:"Your choice reveals your values." }]; }

    for (const scene of scenes.slice(0, 2)) {
      await DELAY(400);
      const sceneRow = await supabase.from("scenes").insert({
        chapter_id: chapterId, order: scene.order || 1, title: scene.title,
        content: scene.content, choice_context: scene.choiceContext,
        choice_question: scene.choiceQuestion, identity_mirror: scene.identityMirror || "",
      }).select().single();

      if (!sceneRow?.data) continue;
      const sceneId = sceneRow.data.id;

      // Generate 3 choices
      await DELAY(400);
      const choicesJson = await callClaude(
        `You are the Choice Architect for Reader OS. Generate choices that reveal WHO the reader is, not just what they prefer. Each choice must activate a DIFFERENT archetype. Return ONLY valid JSON array.`,
        `Generate 3 choices for this scene from "${rawBook.title}".
Designing question: "${meta.designingQuestion}"
Scene: "${scene.title}"
Context: ${scene.choiceContext}
Question: ${scene.choiceQuestion}

Rules: No "correct" answer. Each choice must have a different archetypeSignal. Include negative trait deltas (choices have costs).

Return JSON array of 3:
[{"text":"specific action (1-2 sentences)","consequence":"80-100 words of what happens next","traitDeltas":{"curiosity":3,"logic":-1},"traitLabel":"Trait ↑ · Trait2 ↓ — brief explanation","archetypeSignal":"INVESTIGATOR","identityInsight":"You chose X because you..."}]`,
        2000
      );

      let choices = [];
      try { choices = JSON.parse(choicesJson); } catch { choices = getFallbackChoices(); }

      const validArchetypes = ["INVESTIGATOR","STRATEGIST","EXPLORER","DIPLOMAT","GUARDIAN","REBEL"];
      await supabase.from("choices").insert(
        choices.slice(0, 3).map((c: any) => ({
          scene_id: sceneId, text: c.text || "Continue",
          consequence: c.consequence || "The story continues.",
          trait_deltas: c.traitDeltas || { curiosity: 2 },
          trait_label: c.traitLabel || "Trait revealed",
          archetype_signal: validArchetypes.includes(c.archetypeSignal) ? c.archetypeSignal : "INVESTIGATOR",
          identity_insight: c.identityInsight || "Your choice reveals something true.",
        }))
      );
    }
  }

  return bookId;
}

function getCoverColor(genre: string) {
  return { MYSTERY:"#1a1714",THRILLER:"#0f1f0f",FANTASY:"#1a0f2e",ROMANCE:"#2e0f1a",LITERARY:"#0f1a1a" }[genre] || "#1a1714";
}

function getFallbackChoices() {
  return [
    { text:"Act immediately and confront the situation", consequence:"Your directness creates immediate results.", traitDeltas:{risk:4,curiosity:2,trust:-1}, traitLabel:"Risk ↑ · Trust ↓ — you act before you're ready", archetypeSignal:"EXPLORER", identityInsight:"You move before you're certain. Waiting feels like losing." },
    { text:"Gather more information first before deciding", consequence:"The pattern becomes clearer as you observe.", traitDeltas:{logic:4,curiosity:3,risk:-1}, traitLabel:"Logic ↑ · Risk ↓ — you verify before committing", archetypeSignal:"INVESTIGATOR", identityInsight:"You trust evidence over instinct. Patience is your weapon." },
    { text:"Talk to someone you trust about this", consequence:"The conversation reveals something unexpected.", traitDeltas:{empathy:5,trust:2,risk:-2}, traitLabel:"Empathy ↑ · Trust ↑ — you read people before you judge situations", archetypeSignal:"DIPLOMAT", identityInsight:"You believe people reveal more than evidence. Listening is intelligence." },
  ];
}

export async function POST(req: Request) {
  try {
    const { genre, mode } = await req.json();
    const maxChapters = mode === "fast" ? 3 : 8;
    const supabase = await createServiceClient();

    const books = await fetchBooksFromOL(genre, 2);
    const jobs = [];

    for (const book of books) {
      const jobId = crypto.randomUUID();
      await supabase.from("pipeline_jobs").insert({
        id: jobId, book_title: book.title, genre, status: "GENERATING", progress: 10,
      });
      jobs.push({ id: jobId, book_title: book.title, status: "GENERATING", progress: 10 });
      processBook(book, supabase, maxChapters).then(async bookId => {
        await supabase.from("pipeline_jobs").update({ status: "COMPLETE", progress: 100, book_id: bookId, completed_at: new Date().toISOString() }).eq("id", jobId);
      }).catch(async err => {
        await supabase.from("pipeline_jobs").update({ status: "FAILED", error: err.message }).eq("id", jobId);
      });
    }

    return NextResponse.json({ jobs, message: `Processing ${books.length} books` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
