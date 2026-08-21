type TrieNode = {
  children: Map<string, TrieNode>;
  fail: TrieNode | null;
  output: string[];
};

function createNode(): TrieNode {
  return { children: new Map(), fail: null, output: [] };
}

function isWordChar(ch: string | undefined): boolean {
  return !!ch && /[\p{L}\p{N}]/u.test(ch);
}

/**
 * Multi-pattern string matcher built once per dictionary, so scanning resume
 * text stays O(text length) instead of running ~8800 separate substring/regex
 * scans (which is what makes a single giant regex alternation freeze the tab).
 */
class AhoCorasick {
  private root: TrieNode = createNode();

  constructor(patterns: string[]) {
    for (const pattern of patterns) this.insert(pattern);
    this.buildFailureLinks();
  }

  private insert(pattern: string) {
    const lower = pattern.toLowerCase();
    if (!lower) return;
    let node = this.root;
    for (const ch of lower) {
      let next = node.children.get(ch);
      if (!next) {
        next = createNode();
        node.children.set(ch, next);
      }
      node = next;
    }
    node.output.push(pattern);
  }

  private buildFailureLinks() {
    const queue: TrieNode[] = [];
    for (const child of this.root.children.values()) {
      child.fail = this.root;
      queue.push(child);
    }
    while (queue.length) {
      const current = queue.shift()!;
      for (const [ch, child] of current.children) {
        queue.push(child);
        let fail = current.fail;
        while (fail && !fail.children.has(ch)) {
          fail = fail.fail;
        }
        child.fail = fail ? (fail.children.get(ch) ?? this.root) : this.root;
        child.output.push(...child.fail.output);
      }
    }
  }

  /** Case-insensitive scan; positions are indices into the lowercased text. */
  search(text: string): { pattern: string; start: number; end: number }[] {
    const lower = text.toLowerCase();
    const matches: { pattern: string; start: number; end: number }[] = [];
    let node = this.root;
    for (let i = 0; i < lower.length; i++) {
      const ch = lower[i];
      while (node !== this.root && !node.children.has(ch)) {
        node = node.fail ?? this.root;
      }
      node = node.children.get(ch) ?? this.root;
      if (node.output.length) {
        for (const pattern of node.output) {
          const end = i + 1;
          matches.push({ pattern, start: end - pattern.length, end });
        }
      }
    }
    return matches;
  }
}

// Dictionaries (e.g. the ~8800-word O*NET hard-skill list) don't change at
// runtime, so cache the built automaton per dictionary array instead of
// rebuilding the trie on every resume upload.
const automatonCache = new WeakMap<string[], AhoCorasick>();

function getAutomaton(dictionary: string[]): AhoCorasick {
  let automaton = automatonCache.get(dictionary);
  if (!automaton) {
    automaton = new AhoCorasick(dictionary);
    automatonCache.set(dictionary, automaton);
  }
  return automaton;
}

/**
 * Finds dictionary terms present in `text`. Case-insensitive, requires word
 * boundaries around a match (so "R" doesn't match inside "for"), and resolves
 * overlapping hits by preferring the longest match (e.g. "JavaScript" wins
 * over the "Java" substring inside it) rather than reporting both.
 */
export function matchSkills(text: string, dictionary: string[]): string[] {
  if (!text || dictionary.length === 0) return [];

  const automaton = getAutomaton(dictionary);
  const rawMatches = automaton.search(text);

  const boundaryMatches = rawMatches.filter(
    (m) => !isWordChar(text[m.start - 1]) && !isWordChar(text[m.end])
  );

  boundaryMatches.sort((a, b) => {
    const lengthDiff = b.end - b.start - (a.end - a.start);
    if (lengthDiff !== 0) return lengthDiff;
    return a.start - b.start;
  });

  const taken: { start: number; end: number }[] = [];
  const seen = new Set<string>();
  const results: string[] = [];

  for (const m of boundaryMatches) {
    const overlaps = taken.some((t) => m.start < t.end && t.start < m.end);
    if (overlaps) continue;
    taken.push({ start: m.start, end: m.end });

    const key = m.pattern.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      results.push(m.pattern);
    }
  }

  return results;
}
