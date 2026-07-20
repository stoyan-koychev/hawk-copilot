import { PromptCard } from "@/components/base/PromptCard/PromptCard";

type ExamplePromptsProps = {
  onSelect: (text: string) => void;
  disabled?: boolean;
};

// A spread that shows off the agent: grounding + citations, a docs-to-FX tool
// chain, and a full-doc read.
const EXAMPLE_PROMPTS = [
  "Why was my card declined if our account has money?",
  "What's the per diem for Germany, and in BGN for 5 days?",
  "How do I reimburse an employee?",
];

/** The three tappable starter prompts under the empty-state composer. */
export function ExamplePrompts({ onSelect, disabled }: ExamplePromptsProps) {
  return (
    <div className="grid w-full px-5 grid-cols-1 gap-2 sm:grid-cols-3">
      {EXAMPLE_PROMPTS.map((prompt) => (
        <PromptCard
          key={prompt}
          text={prompt}
          disabled={disabled}
          onClick={() => onSelect(prompt)}
        />
      ))}
    </div>
  );
}
