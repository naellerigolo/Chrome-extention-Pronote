// Static data: software directory and learning-technique catalogue.
const SOFTWARE_CATEGORIES = [
  {
    titleKey: 'swCatNotes',
    items: [
      { nameKey: 'swNotionName', descKey: 'swNotionDesc', url: 'https://www.notion.so' },
      { nameKey: 'swOneNoteName', descKey: 'swOneNoteDesc', url: 'https://www.onenote.com' },
      { nameKey: 'swObsidianName', descKey: 'swObsidianDesc', url: 'https://obsidian.md' },
      { nameKey: 'swKeepName', descKey: 'swKeepDesc', url: 'https://keep.google.com' }
    ]
  },
  {
    titleKey: 'swCatTasks',
    items: [
      { nameKey: 'swTodoistName', descKey: 'swTodoistDesc', url: 'https://todoist.com' },
      { nameKey: 'swGcalName', descKey: 'swGcalDesc', url: 'https://calendar.google.com' },
      { nameKey: 'swTrelloName', descKey: 'swTrelloDesc', url: 'https://trello.com' },
      { nameKey: 'swTickTickName', descKey: 'swTickTickDesc', url: 'https://ticktick.com' }
    ]
  },
  {
    titleKey: 'swCatFocus',
    items: [
      { nameKey: 'swPomodoroName', descKey: 'swPomodoroDesc', url: 'https://pomofocus.io' },
      { nameKey: 'swForestName', descKey: 'swForestDesc', url: 'https://www.forestapp.cc' },
      { nameKey: 'swStayFocusdName', descKey: 'swStayFocusdDesc', url: 'https://chrome.google.com/webstore/detail/stayfocusd/laankejkbhbdhmipfmgcngdelahlfoji' }
    ]
  },
  {
    titleKey: 'swCatReading',
    items: [
      { nameKey: 'swAcrobatName', descKey: 'swAcrobatDesc', url: 'https://get.adobe.com/reader/' },
      { nameKey: 'swXodoName', descKey: 'swXodoDesc', url: 'https://xodo.com' },
      { nameKey: 'swHypothesisName', descKey: 'swHypothesisDesc', url: 'https://hypothes.is' }
    ]
  },
  {
    titleKey: 'swCatFlashcards',
    items: [
      { nameKey: 'swAnkiName', descKey: 'swAnkiDesc', url: 'https://apps.ankiweb.net' },
      { nameKey: 'swQuizletName', descKey: 'swQuizletDesc', url: 'https://quizlet.com' },
      { nameKey: 'swMemriseName', descKey: 'swMemriseDesc', url: 'https://www.memrise.com' }
    ]
  },
  {
    titleKey: 'swCatWriting',
    items: [
      { nameKey: 'swDocsName', descKey: 'swDocsDesc', url: 'https://docs.google.com' },
      { nameKey: 'swLibreOfficeName', descKey: 'swLibreOfficeDesc', url: 'https://www.libreoffice.org' },
      { nameKey: 'swGrammarlyName', descKey: 'swGrammarlyDesc', url: 'https://www.grammarly.com' }
    ]
  },
  {
    titleKey: 'swCatMath',
    items: [
      { nameKey: 'swDesmosName', descKey: 'swDesmosDesc', url: 'https://www.desmos.com/calculator' },
      { nameKey: 'swGeoName', descKey: 'swGeoDesc', url: 'https://www.geogebra.org' },
      { nameKey: 'swWolframName', descKey: 'swWolframDesc', url: 'https://www.wolframalpha.com' },
      { nameKey: 'swSymbolabName', descKey: 'swSymbolabDesc', url: 'https://www.symbolab.com' }
    ]
  },
  {
    titleKey: 'swCatCoding',
    items: [
      { nameKey: 'swVSCodeName', descKey: 'swVSCodeDesc', url: 'https://code.visualstudio.com' },
      { nameKey: 'swGitHubName', descKey: 'swGitHubDesc', url: 'https://github.com' },
      { nameKey: 'swReplitName', descKey: 'swReplitDesc', url: 'https://replit.com' },
      { nameKey: 'swJupyterName', descKey: 'swJupyterDesc', url: 'https://jupyter.org/try' }
    ]
  },
  {
    titleKey: 'swCatLearning',
    items: [
      { nameKey: 'swKhanName', descKey: 'swKhanDesc', url: 'https://www.khanacademy.org' },
      { nameKey: 'swYouTubeEduName', descKey: 'swYouTubeEduDesc', url: 'https://www.youtube.com/education' },
      { nameKey: 'swEdxName', descKey: 'swEdxDesc', url: 'https://www.edx.org' },
      { nameKey: 'swCourseraName', descKey: 'swCourseraDesc', url: 'https://www.coursera.org' }
    ]
  },
  {
    titleKey: 'swCatCloud',
    items: [
      { nameKey: 'swDriveName', descKey: 'swDriveDesc', url: 'https://drive.google.com' },
      { nameKey: 'swDropboxName', descKey: 'swDropboxDesc', url: 'https://www.dropbox.com' }
    ]
  },
  {
    titleKey: 'swCatGroup',
    items: [
      { nameKey: 'swDiscordName', descKey: 'swDiscordDesc', url: 'https://discord.com' },
      { nameKey: 'swSlackName', descKey: 'swSlackDesc', url: 'https://slack.com' }
    ]
  },
  {
    titleKey: 'swCatAi',
    items: [
      { nameKey: 'swChatgptName', descKey: 'swChatgptDesc', useKey: 'swAiUseHomework', url: 'https://chatgpt.com' },
      { nameKey: 'swPerplexityName', descKey: 'swPerplexityDesc', useKey: 'swAiUseResearch', url: 'https://www.perplexity.ai' },
      { nameKey: 'swSocraticName', descKey: 'swSocraticDesc', useKey: 'swAiUseExplained', url: 'https://socratic.org' },
      { nameKey: 'swGrammarlyName', descKey: 'swGrammarlyDesc', useKey: 'swAiUseWriting', url: 'https://www.grammarly.com' },
      { nameKey: 'swPenseumName', descKey: 'swPenseumDesc', useKey: 'swAiUseNotes', url: 'https://penseum.ai' },
      { nameKey: 'swStudyFetchName', descKey: 'swStudyFetchDesc', useKey: 'swAiUseNotes', url: 'https://studyfetch.com' },
      { nameKey: 'swMindgraspName', descKey: 'swMindgraspDesc', useKey: 'swAiUseNotes', url: 'https://www.mindgrasp.ai' },
      { nameKey: 'swOtterName', descKey: 'swOtterDesc', useKey: 'swAiUseTranscription', url: 'https://otter.ai' },
      { nameKey: 'swQuizletName', descKey: 'swQuizletDesc', useKey: 'swAiUseFlashcards', url: 'https://quizlet.com' }
    ]
  }
];

const LEARNING_TECHNIQUES = [
  {
    title: 'Active Recall',
    what: 'Actively trying to remember information without looking at your notes.',
    how: 'Forces your brain to retrieve info, which strengthens memory pathways.',
    use: 'Close notes and write what you remember; answer practice questions; use flashcards.',
    best: 'Tests, definitions, formulas, dates, long‑term memory.',
    why: 'Struggling to remember makes learning stick.',
    examples: 'Define 10 terms from memory; answer past‑paper questions.',
    steps: 'Pick a topic → quiz yourself → check answers → retry weak items.',
    mistakes: 'Only rereading notes; checking answers too quickly.',
    videoTitle: 'How to Study Effectively – Active Recall (Ali Abdaal)',
    videoUrl: 'https://www.youtube.com/watch?v=ukLnPbIffxE'
  },
  {
    title: 'Spaced Repetition',
    what: 'Reviewing material multiple times over increasing time intervals.',
    how: 'You review right before you forget, reinforcing memory efficiently.',
    use: 'Review today → in 2 days → 1 week → 1 month; use Anki or a calendar plan.',
    best: 'Vocabulary, languages, biology, history, formulas.',
    why: 'Prevents cramming and builds durable memory.',
    examples: 'Daily Anki deck; weekly formula review.',
    steps: 'Learn → schedule reviews → keep intervals growing.',
    mistakes: 'Skipping scheduled reviews; adding too many cards at once.',
    videoTitle: 'Spaced Repetition: The Most Powerful Way to Remember What You Study',
    videoUrl: 'https://www.youtube.com/watch?v=eVajQPuRmk8'
  },
  {
    title: 'Blurting',
    what: 'Writing everything you know from memory, then checking gaps.',
    how: 'Reveals exactly what you don’t know so studying is targeted.',
    use: 'Read once, close notes, write from memory, then compare and fix gaps.',
    best: 'Science, history, essay‑based subjects.',
    why: 'Combines active recall with gap analysis.',
    examples: 'Brain‑dump a chapter on photosynthesis.',
    steps: 'Skim → close notes → dump from memory → fix gaps.',
    mistakes: 'Copying notes while blurting; skipping the gap‑fix step.',
    videoTitle: 'The Blurting Method – How Top Students Study',
    videoUrl: 'https://www.youtube.com/watch?v=C5JpX2aV4b8'
  },
  {
    title: 'Feynman Technique',
    what: 'Explaining a topic in simple words, like teaching a beginner.',
    how: 'If you can’t explain it simply, you don’t fully understand it.',
    use: 'Write a simple explanation, find confusing parts, clarify, simplify again.',
    best: 'Math concepts, physics, philosophy, economics.',
    why: 'Turns passive knowledge into real understanding.',
    examples: 'Explain “derivative” to a 10‑year‑old.',
    steps: 'Explain simply → spot gaps → review → re‑explain.',
    mistakes: 'Using jargon; not checking for real understanding.',
    videoTitle: 'The Feynman Technique Explained',
    videoUrl: 'https://www.youtube.com/watch?v=_f-qkGJBPts'
  },
  {
    title: 'Practice Testing',
    what: 'Studying by doing exam‑style questions.',
    how: 'Simulates test conditions and strengthens recall under pressure.',
    use: 'Past exams, timed quizzes, self‑made questions.',
    best: 'Standardized tests, math, science, reading comprehension.',
    why: 'Improves memory and confidence.',
    examples: 'Timed SAT section; end‑of‑chapter quiz.',
    steps: 'Take a test → review errors → redo weak areas.',
    mistakes: 'Only doing easy questions; not reviewing mistakes.',
    videoTitle: 'Practice Testing: Studying That Actually Works (Learning Scientists)',
    videoUrl: 'https://www.youtube.com/watch?v=YLkOZhROvA4'
  },
  {
    title: 'Interleaving',
    what: 'Mixing different topics or problem types in one session.',
    how: 'Forces your brain to choose the right method vs. memorizing patterns.',
    use: 'Mix algebra + geometry; alternate history themes; rotate subjects.',
    best: 'Math, physics, problem‑solving subjects.',
    why: 'Improves adaptability and exam performance.',
    examples: 'Alternate trig and algebra problems.',
    steps: 'Pick 2–3 topics → rotate every few problems.',
    mistakes: 'Switching too often; mixing without reviewing basics.',
    videoTitle: 'Interleaving: Why Mixing Topics Improves Learning',
    videoUrl: 'https://www.youtube.com/watch?v=kV64Bu6sec0'
  },
  {
    title: 'Elaborative Interrogation',
    what: 'Asking “why?” and “how?” constantly.',
    how: 'Connects new information to logic and prior knowledge.',
    use: 'Ask: “Why does this happen?” “How does this connect to what I learned?”',
    best: 'Biology, history, social sciences.',
    why: 'Builds deep conceptual understanding.',
    examples: 'Why did WWI start? How does it link to alliances?',
    steps: 'Read → ask why/how → answer in your words.',
    mistakes: 'Asking questions but not answering them.',
    videoTitle: 'Asking “Why?” to Learn Better – Elaborative Interrogation',
    videoUrl: 'https://www.youtube.com/watch?v=Q0n3n0k7ZkY'
  },
  {
    title: 'Mind Mapping',
    what: 'Visual organization of ideas around a central concept.',
    how: 'Shows relationships between ideas instead of linear notes.',
    use: 'Central topic → branches → sub‑branches; use keywords.',
    best: 'Big chapters, essay planning, brainstorming.',
    why: 'Great for seeing the big picture.',
    examples: 'Map causes/effects of the French Revolution.',
    steps: 'Center topic → add main branches → add details.',
    mistakes: 'Writing full sentences; making it too cluttered.',
    videoTitle: 'How to Mind Map Like a Pro',
    videoUrl: 'https://www.youtube.com/watch?v=ZrQhZt8N2Z4'
  },
  {
    title: 'Cornell Note‑Taking',
    what: 'A structured way to take notes that promotes review.',
    how: 'Divides a page into notes, questions, and summary.',
    use: 'Write questions after class; answer them during review.',
    best: 'Lectures, humanities, science classes.',
    why: 'Turns notes into an active study tool.',
    examples: 'Left column: questions; right: lecture notes.',
    steps: 'Take notes → add questions → write summary → review.',
    mistakes: 'Skipping the question/summary parts.',
    videoTitle: 'Cornell Notes Explained',
    videoUrl: 'https://www.youtube.com/watch?v=WtW9IyE04OQ'
  },
  {
    title: 'Pomodoro Technique',
    what: 'Studying in focused time blocks with breaks.',
    how: 'Prevents burnout and maintains attention.',
    use: '25 min study, 5 min break; repeat 4 times then a long break.',
    best: 'Long study sessions, homework, essay writing.',
    why: 'Boosts focus and consistency.',
    examples: '4×25/5 then a 20‑minute break.',
    steps: 'Set timer → focus → short break → repeat.',
    mistakes: 'Skipping breaks; multitasking during focus time.',
    videoTitle: 'Pomodoro Technique – How to Use It Properly',
    videoUrl: 'https://www.youtube.com/watch?v=mNBmG24djoY'
  },
  {
    title: 'Dual Coding',
    what: 'Combining words with visuals.',
    how: 'Your brain processes images and text differently, improving recall.',
    use: 'Diagrams, charts, labeled drawings.',
    best: 'Biology, geography, physics.',
    why: 'Creates multiple memory pathways.',
    examples: 'Label a cell diagram; sketch a physics setup.',
    steps: 'Read → create a visual → label it in your words.',
    mistakes: 'Copying images without understanding them.',
    videoTitle: 'Dual Coding Theory Explained',
    videoUrl: 'https://www.youtube.com/watch?v=K3-0NnFzv50'
  },
  {
    title: 'Teaching Someone Else',
    what: 'Explaining material to another person.',
    how: 'Forces clarity, structure, and confidence.',
    use: 'Study groups, pretend audience, record yourself explaining.',
    best: 'Oral exams, concept‑heavy subjects.',
    why: 'Reveals weak points instantly.',
    examples: 'Teach a friend the steps of factoring.',
    steps: 'Outline → teach → note gaps → review → re‑teach.',
    mistakes: 'Reading notes aloud; not checking if they follow.',
    videoTitle: 'Why Teaching Others Helps You Learn',
    videoUrl: 'https://www.youtube.com/watch?v=Zq9-6n0xPzI'
  },
  {
    title: 'Retrieval + Error Correction',
    what: 'Actively recalling, then fixing mistakes immediately.',
    how: 'Correcting errors prevents false memory.',
    use: 'Practice → check → rewrite the correct version.',
    best: 'Math, grammar, science.',
    why: 'Mistakes become learning anchors.',
    examples: 'Do 10 problems, fix every wrong step.',
    steps: 'Attempt → check → correct → retry later.',
    mistakes: 'Ignoring errors; not retrying the same problem.',
    videoTitle: 'Why Making Mistakes Helps You Learn',
    videoUrl: 'https://www.youtube.com/watch?v=Y6X7q6R3qGQ'
  },
  {
    title: 'Distributed Practice',
    what: 'Studying multiple subjects across the week instead of one at a time.',
    how: 'Reduces mental fatigue and improves retention.',
    use: 'Short sessions per subject daily.',
    best: 'Heavy workloads, multiple exams.',
    why: 'Keeps your brain fresh.',
    examples: 'Mon: math+bio, Tue: history+French.',
    steps: 'Plan weekly blocks → rotate subjects.',
    mistakes: 'Cramming one subject in a single day.',
    videoTitle: 'Distributed Practice vs Cramming',
    videoUrl: 'https://www.youtube.com/watch?v=E8Y4Rkz9XnQ'
  },
  {
    title: 'Reflection & Self‑Assessment',
    what: 'Evaluating what worked and what didn’t.',
    how: 'Improves future study efficiency.',
    use: 'After each session ask: What did I learn? What’s still unclear?',
    best: 'Long‑term improvement, exam prep cycles.',
    why: 'Turns studying into a skill you refine.',
    examples: 'Weekly review note: wins + weak spots.',
    steps: 'After study → write 2 wins + 2 gaps → adjust plan.',
    mistakes: 'Skipping reflection; being too vague.',
    videoTitle: 'How to Reflect After Studying (Metacognition)',
    videoUrl: 'https://www.youtube.com/watch?v=ZcW3t8l7F94'
  }
];

let softwareFilterKey = 'all';
