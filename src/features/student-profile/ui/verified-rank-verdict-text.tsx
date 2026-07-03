import { mentrixHubAccent } from "@/features/student-profile/student-hub-accent";

/** Color key stats in the verified rank verdict with logo palette accents. */
export function VerifiedRankVerdictText({ text }: { text: string }) {
  const parts = text.split(/(\d+(?:st|nd|rd|th)?%?|\d+)/g).filter(Boolean);

  return (
    <>
      {parts.map((part, index) => {
        const isHighlight = /^\d/.test(part);
        return (
          <span
            key={`${part}-${index}`}
            className={isHighlight ? mentrixHubAccent.verdictHighlight : mentrixHubAccent.verdictLead}
          >
            {part}
          </span>
        );
      })}
    </>
  );
}
