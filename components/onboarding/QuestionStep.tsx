"use client";

interface Option {
  value: string;
  label: string;
  sub: string;
}

interface Props {
  question: string;
  subtitle: string;
  options: Option[];
  selected?: string;
  onSelect: (value: string) => void;
  stepIndex: number;
  totalSteps: number;
}

export function QuestionStep({ question, subtitle, options, selected, onSelect, stepIndex, totalSteps }: Props) {
  return (
    <div className="animate-fade-in">
      {/* Progress dots */}
      <div className="flex gap-1.5 mb-8 justify-center">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i < stepIndex
                ? "bg-violet w-6"
                : i === stepIndex
                ? "bg-violet w-10"
                : "bg-page-darker w-6"
            }`}
          />
        ))}
      </div>

      <h2 className="font-serif text-xl font-semibold text-ink text-center mb-2 leading-tight">
        {question}
      </h2>
      <p className="text-xs text-ink-muted text-center mb-8 leading-relaxed">{subtitle}</p>

      <div className="space-y-3">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`w-full text-left p-4 border-2 rounded-xl transition-all duration-150 bg-white ${
              selected === opt.value
                ? "border-violet bg-violet-light scale-[0.99]"
                : "border-page-darker hover:border-violet/50 hover:bg-violet-light/50"
            }`}
          >
            <span className="block text-sm font-medium text-ink">{opt.label}</span>
            <span className="block text-xs text-ink-muted mt-0.5">{opt.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
