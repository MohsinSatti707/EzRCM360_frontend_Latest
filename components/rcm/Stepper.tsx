"use client";

export interface StepperStep {
  id: number;
  label: string;
  completed?: boolean;
  active?: boolean;
}

export function Stepper({ steps }: { steps: StepperStep[] }) {
  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex items-center justify-between gap-1">
        {steps.map((step, i) => (
          <div key={step.id} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300 ease-out ${
                  step.completed
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : step.active
                      ? "border-primary bg-accent text-primary ring-4 ring-accent"
                      : "border-border bg-card text-muted-foreground"
                } ${step.active ? "scale-105" : ""}`}
              >
                {step.completed ? (
                  <svg
                    className="h-5 w-5 animate-scale-in"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <span
                className={`mt-2 text-center text-xs font-medium sm:text-sm ${
                  step.active
                    ? "text-foreground"
                    : step.completed
                      ? "text-muted-foreground"
                      : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-1 h-1 flex-1 rounded-full transition-all duration-500 sm:mx-3 ${
                  step.completed
                    ? "bg-primary"
                    : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
