export function detectPlatform() {
  const url = window.location.hostname;
  if (url.includes("leetcode")) return "LeetCode";
  if (url.includes("geeksforgeeks")) return "GFG";
  if (url.includes("codeforces")) return "Codeforces";
  if (url.includes("hackerrank")) return "HackerRank";
  if (url.includes("codechef")) return "CodeChef";
  if (url.includes("interviewbit")) return "InterviewBit";
  return "Unknown";
}
