import { normalizeText } from "./text";

export interface TopicDefinition {
  id: string;
  label: string;
  group: string;
  patterns: RegExp[];
  aliases?: string[];
}

export const TOPICS: TopicDefinition[] = [
  {
    id: "four-noble-truths",
    aliases: ["4 noble truths", "cattari ariya saccani"],
    label: "Four Noble Truths",
    group: "Foundations",
    patterns: [/\bfour noble truths?\b/, /\bcattari ariya saccani\b/],
  },
  {
    id: "eightfold-path",
    aliases: ["ariya atthangika magga"],
    label: "Noble Eightfold Path",
    group: "Foundations",
    patterns: [/\b(?:noble )?eightfold path\b/, /\bariya atthangika magga\b/],
  },
  {
    id: "right-view",
    label: "Wise view",
    group: "Eightfold path",
    patterns: [/\b(?:right|wise) view\b/, /\bsamma ditthi\b/],
  },
  {
    id: "right-intention",
    label: "Wise intention",
    group: "Eightfold path",
    patterns: [/\b(?:right|wise) (?:intention|resolve|thought)\b/, /\bsamma sankappa\b/],
  },
  {
    id: "right-speech",
    label: "Wise speech",
    group: "Eightfold path",
    patterns: [/\b(?:right|wise) speech\b/, /\bsamma vaca\b/],
  },
  {
    id: "right-action",
    label: "Wise action",
    group: "Eightfold path",
    patterns: [/\b(?:right|wise) action\b/, /\bsamma kammanta\b/],
  },
  {
    id: "right-livelihood",
    label: "Wise livelihood",
    group: "Eightfold path",
    patterns: [/\b(?:right|wise) livelihood\b/, /\bsamma ajiva\b/],
  },
  {
    id: "right-effort",
    label: "Wise effort",
    group: "Eightfold path",
    patterns: [/\b(?:right|wise) effort\b/, /\bsamma vayama\b/],
  },
  {
    id: "right-mindfulness",
    label: "Wise mindfulness",
    group: "Eightfold path",
    patterns: [/\b(?:right|wise) mindfulness\b/, /\bsamma sati\b/],
  },
  {
    id: "right-concentration",
    label: "Wise concentration",
    group: "Eightfold path",
    patterns: [/\b(?:right|wise) concentration\b/, /\bsamma samadhi\b/],
  },
  {
    id: "three-characteristics",
    aliases: [
      "three dharma seals",
      "three dhamma seals",
      "3 dharma seals",
      "three marks",
      "tilakkhana",
    ],
    label: "Three characteristics",
    group: "Insight",
    patterns: [/\bthree (?:marks|characteristics|dharma seals|dhamma seals)\b/, /\btilakkhana\b/],
  },
  {
    id: "impermanence",
    aliases: ["anicca"],
    label: "Impermanence",
    group: "Insight",
    patterns: [/\bimpermanen(?:ce|t)\b/, /\banicca\b/, /\bchange and changing\b/],
  },
  {
    id: "dukkha",
    aliases: ["suffering", "unsatisfactoriness"],
    label: "Dukkha",
    group: "Insight",
    patterns: [/\bdukkha\b/, /\bunsatisfactoriness\b/, /\bsuffering\b/],
  },
  {
    id: "not-self",
    aliases: ["anatman", "non self"],
    label: "Not-self (anatta)",
    group: "Insight",
    patterns: [/\bnot[ -]self\b/, /\bnon[ -]self\b/, /\banatta\b/, /\banatman\b/],
  },
  {
    id: "dependent-origination",
    aliases: [
      "dependent arising",
      "conditioned arising",
      "paticca samuppada",
      "pratitya samutpada",
    ],
    label: "Dependent origination",
    group: "Insight",
    patterns: [
      /\bdependent (?:origination|arising)\b/,
      /\bconditioned arising\b/,
      /\bpaticca samuppada\b/,
      /\bpratitya samutpada\b/,
    ],
  },
  {
    id: "five-aggregates",
    aliases: ["khandha", "skandha"],
    label: "Five aggregates",
    group: "Insight",
    patterns: [/\bfive aggregates?\b/, /\bkhandhas?\b/, /\bskandhas?\b/],
  },
  {
    id: "emptiness",
    aliases: ["sunnata", "shunyata"],
    label: "Emptiness",
    group: "Insight",
    patterns: [/\bemptiness\b/, /\bsunnata\b/, /\bshunyata\b/],
  },
  {
    id: "satipatthana",
    label: "Foundations of mindfulness",
    group: "Meditation",
    patterns: [
      /\bfour foundations? of mindfulness\b/,
      /\bfoundations? of mindfulness\b/,
      /\bsatipatthana\b/,
    ],
  },
  {
    id: "mindfulness",
    label: "Mindfulness",
    group: "Meditation",
    patterns: [/\bmindfulness\b/, /\bmindful awareness\b/, /\bsati\b/],
  },
  {
    id: "breath",
    aliases: ["anapanasati"],
    label: "Breath meditation",
    group: "Meditation",
    patterns: [/\bbreath(?:ing)?\b/, /\banapanasati\b/, /\bmindfulness of breathing\b/],
  },
  {
    id: "body",
    aliases: ["kayagatasati", "body scan"],
    label: "Body practice",
    group: "Meditation",
    patterns: [/\bmindfulness of (?:the )?body\b/, /\bbody scan\b/, /\bkayagatasati\b/],
  },
  {
    id: "walking",
    label: "Walking meditation",
    group: "Meditation",
    patterns: [/\bwalking meditation\b/, /\bmeditative walking\b/],
  },
  {
    id: "open-awareness",
    aliases: ["choiceless awareness", "open presence"],
    label: "Open awareness",
    group: "Meditation",
    patterns: [/\bopen awareness\b/, /\bchoiceless awareness\b/, /\bopen presence\b/],
  },
  {
    id: "concentration",
    aliases: ["samadhi"],
    label: "Concentration",
    group: "Meditation",
    patterns: [/\bconcentration\b/, /\bsamadhi\b/, /\bcollectedness\b/],
  },
  {
    id: "jhana",
    label: "Jhāna",
    group: "Meditation",
    patterns: [/\bjhanas?\b/, /\bdhyanas?\b/, /\babsorption\b/],
  },
  {
    id: "brahmaviharas",
    aliases: ["four immeasurables", "divine abidings"],
    label: "Brahmavihāras",
    group: "Heart qualities",
    patterns: [/\bbrahma[ -]?viharas?\b/, /\bdivine abidings?\b/, /\bfour immeasurables\b/],
  },
  {
    id: "loving-kindness",
    label: "Loving-kindness (mettā)",
    group: "Heart qualities",
    patterns: [/\bloving[ -]kindness\b/, /\bmetta\b/],
  },
  {
    id: "compassion",
    label: "Compassion (karuṇā)",
    group: "Heart qualities",
    patterns: [/\bcompassion\b/, /\bkaruna\b/, /\bself[ -]compassion\b/],
  },
  {
    id: "appreciative-joy",
    label: "Appreciative joy (muditā)",
    group: "Heart qualities",
    patterns: [/\bappreciative joy\b/, /\bsympathetic joy\b/, /\bmudita\b/],
  },
  {
    id: "equanimity",
    label: "Equanimity (upekkhā)",
    group: "Heart qualities",
    patterns: [/\bequanimity\b/, /\bupekkha\b/],
  },
  {
    id: "ethics",
    aliases: ["sila"],
    label: "Ethics and virtue",
    group: "Practice in life",
    patterns: [/\bethic(?:s|al)\b/, /\bvirtue\b/, /\bsila\b/],
  },
  {
    id: "precepts",
    label: "Precepts",
    group: "Practice in life",
    patterns: [/\bprecepts?\b/, /\bfive trainings?\b/],
  },
  {
    id: "karma",
    aliases: ["kamma", "volition"],
    label: "Karma and intention",
    group: "Practice in life",
    patterns: [/\bkarma\b/, /\bkamma\b/, /\bintention(?:ality)?\b/, /\bvolition\b/],
  },
  {
    id: "hindrances",
    aliases: ["nivarana"],
    label: "Five hindrances",
    group: "Obstacles and freedom",
    patterns: [/\bfive hindrances?\b/, /\bhindrances?\b/, /\bnivarana\b/],
  },
  {
    id: "craving",
    aliases: ["tanha", "upadana"],
    label: "Craving and clinging",
    group: "Obstacles and freedom",
    patterns: [/\bcraving\b/, /\bclinging\b/, /\btanha\b/, /\bupadana\b/],
  },
  {
    id: "letting-go",
    label: "Letting go",
    group: "Obstacles and freedom",
    patterns: [/\bletting go\b/, /\brelinquish(?:ing|ment)\b/, /\brelease\b/],
  },
  {
    id: "awakening",
    aliases: ["nirvana"],
    label: "Awakening and nibbāna",
    group: "Obstacles and freedom",
    patterns: [/\bawakening\b/, /\benlightenment\b/, /\bnibbana\b/, /\bnirvana\b/],
  },
  {
    id: "death",
    aliases: ["maranasati"],
    label: "Death and dying",
    group: "Practice in life",
    patterns: [/\bdeath\b/, /\bdying\b/, /\bmaranasati\b/, /\bmortality\b/],
  },
  {
    id: "daily-life",
    label: "Daily life",
    group: "Practice in life",
    patterns: [/\bdaily life\b/, /\beveryday life\b/, /\bpractice off the cushion\b/],
  },
  {
    id: "relationships",
    label: "Relationships",
    group: "Practice in life",
    patterns: [/\brelationships?\b/, /\bfamily life\b/, /\bparenting\b/],
  },
  {
    id: "social-engagement",
    label: "Social engagement",
    group: "Practice in life",
    patterns: [/\bsocial(?:ly)? engag(?:ed|ement)\b/, /\bactivism\b/, /\bjustice\b/],
  },
];

export function getTopic(id: string): TopicDefinition | undefined {
  return TOPICS.find((topic) => topic.id === id);
}

export function searchTopics(query: string): TopicDefinition[] {
  const normalized = normalizeText(query);
  return TOPICS.filter((topic) =>
    normalizeText(
      [topic.label, topic.group, topic.id.replaceAll("-", " "), ...(topic.aliases ?? [])].join(" "),
    ).includes(normalized),
  ).sort((a, b) => a.label.localeCompare(b.label, "en"));
}
