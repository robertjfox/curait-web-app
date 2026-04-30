"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { apiClient } from "@/lib/api";

interface OnboardingFlowProps {
  userId: string | null;
  onComplete: () => void;
}

type Gender = "" | "male" | "female";
type BodyShape = "" | "slim" | "average" | "broad";

const TOTAL_STEPS = 6;

const OCCASION_OPTIONS = [
  "Work / office",
  "Remote work",
  "Dates",
  "Dinner / drinks",
  "Weekend errands",
  "Travel",
  "Events",
  "Nightlife",
  "Outdoors",
  "Gym / athleisure",
];

const DAILY_DRESS_CODE_OPTIONS = [
  "Very casual",
  "Smart casual",
  "Business casual",
  "Formal",
  "Depends",
];

const FIT_PREFERENCE_OPTIONS = ["Slim / tailored", "Regular", "Relaxed"];

const COLOR_COMFORT_OPTIONS = [
  "Neutrals",
  "Earth tones",
  "Black / grey",
  "Navy / blue",
  "Pastels",
  "Bright colors",
  "Monochrome",
  "Open",
];

const STYLE_AVOID_OPTIONS = [
  "Skinny jeans",
  "Baggy pants",
  "Loud logos",
  "Bright colors",
  "All black",
  "Shorts",
  "Sandals",
  "Hats",
  "Oversized fits",
  "Tight fits",
  "Formal shoes",
  "Distressed denim",
];

const BUDGET_OPTIONS = [
  "Budget-friendly",
  "Mid-range",
  "Premium",
  "Mix high / low",
  "No preference",
];

export default function OnboardingFlow({
  userId,
  onComplete,
}: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [gender, setGender] = useState<Gender>("");
  const [location, setLocation] = useState("");
  const [job, setJob] = useState("");
  const [brandChips, setBrandChips] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [weightPounds, setWeightPounds] = useState("");
  const [bodyShape, setBodyShape] = useState<BodyShape>("");
  const [fitPreference, setFitPreference] = useState("");
  const [occasions, setOccasions] = useState<string[]>([]);
  const [dailyDressCode, setDailyDressCode] = useState("");
  const [colorComfort, setColorComfort] = useState<string[]>([]);
  const [styleAvoids, setStyleAvoids] = useState<string[]>([]);
  const [budgetPreference, setBudgetPreference] = useState("");
  const [selfie, setSelfie] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selfiePreview = useMemo(
    () => (selfie ? URL.createObjectURL(selfie) : null),
    [selfie]
  );

  const heightCm = useMemo(() => {
    const feet = Number(heightFeet || 0);
    const inches = Number(heightInches || 0);
    const totalInches = feet * 12 + inches;
    return totalInches > 0 ? Math.round(totalInches * 2.54) : undefined;
  }, [heightFeet, heightInches]);

  const weightKg = useMemo(() => {
    const pounds = Number(weightPounds || 0);
    return pounds > 0 ? Math.round(pounds * 0.453592) : undefined;
  }, [weightPounds]);

  useEffect(() => {
    if (step !== 4 || brandChips.length > 0) return;
    if (!gender || !location.trim()) return;

    let cancelled = false;
    setLoadingBrands(true);
    apiClient
      .generateStyleBrandChips({
        gender,
        location: location.trim(),
        job: job.trim() || undefined,
        body_shape: bodyShape || undefined,
        fit_preference: fitPreference || undefined,
        lifestyle_occasions: occasions,
        daily_dress_code: dailyDressCode || undefined,
        color_comfort: colorComfort,
        style_avoids: styleAvoids,
        budget_preference: budgetPreference || undefined,
      })
      .then((brands) => {
        if (!cancelled) setBrandChips(brands);
      })
      .catch((err) => {
        console.error("Failed to generate brand chips:", err);
        if (!cancelled) {
          setBrandChips([
            "Uniqlo",
            "COS",
            "J.Crew",
            "Todd Snyder",
            "Aritzia",
            "Nike",
            "Adidas",
            "Ralph Lauren",
            "Everlane",
            "Levi's",
            "Zara",
            "The Row",
          ]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBrands(false);
      });

    return () => {
      cancelled = true;
    };
  }, [brandChips.length, gender, job, location, step]);

  function toggleChip(value: string, setValues: Dispatch<SetStateAction<string[]>>) {
    setValues((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  function canContinue() {
    if (step === 0) return Boolean(firstName.trim() && location.trim() && gender);
    if (step === 1) return Boolean(heightFeet && weightPounds && bodyShape && fitPreference);
    if (step === 2) return occasions.length > 0 && Boolean(dailyDressCode);
    if (step === 4) return selectedBrands.length > 0;
    return true;
  }

  function handleNext() {
    if (step < TOTAL_STEPS - 1) {
      setStep((current) => current + 1);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!userId || submitting) return;

    if (step < TOTAL_STEPS - 1) {
      handleNext();
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiClient.updateUserProfile(userId, {
        first_name: firstName.trim() || undefined,
        gender: gender || undefined,
        location: location.trim() || undefined,
        context: {
          job: job.trim() || undefined,
          selected_brands: selectedBrands,
          lifestyle_occasions: occasions,
          daily_dress_code: dailyDressCode || undefined,
          fit_preference: fitPreference || undefined,
          color_comfort: colorComfort,
          style_avoids: styleAvoids,
          budget_preference: budgetPreference || undefined,
          style_notes:
            [
              selectedBrands.length > 0
                ? `Brand/style references: ${selectedBrands.join(", ")}`
                : null,
              occasions.length > 0
                ? `Lifestyle occasions: ${occasions.join(", ")}`
                : null,
              dailyDressCode ? `Daily dress code: ${dailyDressCode}` : null,
              fitPreference ? `Preferred fit: ${fitPreference}` : null,
              colorComfort.length > 0
                ? `Comfortable colors: ${colorComfort.join(", ")}`
                : null,
              styleAvoids.length > 0
                ? `Avoid: ${styleAvoids.join(", ")}`
                : null,
              budgetPreference ? `Shopping budget: ${budgetPreference}` : null,
            ]
              .filter(Boolean)
              .join(". "),
          height_feet: heightFeet ? Number(heightFeet) : undefined,
          height_inches: heightInches ? Number(heightInches) : undefined,
          height_cm: heightCm,
          weight_lb: weightPounds ? Number(weightPounds) : undefined,
          weight_kg: weightKg,
          body_shape: bodyShape || undefined,
        },
      });

      if (selfie) {
        await apiClient.generateAvatar(userId, selfie);
      }

      onComplete();
    } catch (err) {
      console.error("Onboarding failed:", err);
      setError("Could not save onboarding. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] bg-black text-white">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-md flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]"
      >
        <div className="flex flex-1 flex-col justify-center gap-6">
          <div>
            <Image
              src="/curait-logo.png"
              alt="CurAIt"
              width={132}
              height={42}
              className="mb-8 h-9 w-auto invert"
              priority
            />
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.26em] text-white/45">
              Step {step + 1} of {TOTAL_STEPS}
            </p>
            <h1 className="text-4xl font-semibold leading-tight">
              {step === 0 && "Tell us who you are."}
              {step === 1 && "Fit the avatar to you."}
              {step === 2 && "What do you dress for?"}
              {step === 3 && "Set your style guardrails."}
              {step === 4 && "Pick brands you like."}
              {step === 5 && "Create your base avatar."}
            </h1>
          </div>

          {step === 0 && (
            <div className="space-y-3">
              <TextField
                label="Name"
                value={firstName}
                onChange={setFirstName}
                placeholder="Robert"
              />
              <TextField
                label="Location"
                value={location}
                onChange={setLocation}
                placeholder="NYC"
              />
              <SelectField
                label="Gender"
                value={gender}
                onChange={(value) => setGender(value as Gender)}
                options={[
                  ["", "Select"],
                  ["male", "Male"],
                  ["female", "Female"],
                ]}
              />
              <TextField
                label="Job (optional)"
                value={job}
                onChange={setJob}
                placeholder="Designer, founder, student..."
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <TextField
                  label="Feet"
                  value={heightFeet}
                  onChange={setHeightFeet}
                  placeholder="5"
                  inputMode="numeric"
                />
                <TextField
                  label="Inches"
                  value={heightInches}
                  onChange={setHeightInches}
                  placeholder="11"
                  inputMode="numeric"
                />
                <TextField
                  label="Pounds"
                  value={weightPounds}
                  onChange={setWeightPounds}
                  placeholder="170"
                  inputMode="numeric"
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                  Body shape
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["slim", "Slim"],
                    ["average", "Average"],
                    ["broad", "Broad"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setBodyShape(value as BodyShape)}
                      className={`h-14 rounded-2xl border text-sm font-medium transition ${
                        bodyShape === value
                          ? "border-white bg-white text-black"
                          : "border-white/10 bg-white/10 text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                  Preferred fit
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {FIT_PREFERENCE_OPTIONS.map((option) => (
                    <ChipButton
                      key={option}
                      selected={fitPreference === option}
                      onClick={() => setFitPreference(option)}
                    >
                      {option}
                    </ChipButton>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <p className="text-sm leading-6 text-white/55">
                Tap the situations you actually need outfits for. This helps us
                avoid generic looks.
              </p>
              <ChipGroup
                label="Occasions"
                options={OCCASION_OPTIONS}
                selected={occasions}
                onToggle={(value) => toggleChip(value, setOccasions)}
              />
              <SingleChipGroup
                label="Most days I dress"
                options={DAILY_DRESS_CODE_OPTIONS}
                selected={dailyDressCode}
                onSelect={setDailyDressCode}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <p className="text-sm leading-6 text-white/55">
                A few quick boundaries help us make better calls without you
                writing a style essay.
              </p>
              <ChipGroup
                label="Colors you like wearing"
                options={COLOR_COMFORT_OPTIONS}
                selected={colorComfort}
                onToggle={(value) => toggleChip(value, setColorComfort)}
              />
              <ChipGroup
                label="Never put me in"
                options={STYLE_AVOID_OPTIONS}
                selected={styleAvoids}
                onToggle={(value) => toggleChip(value, setStyleAvoids)}
              />
              <SingleChipGroup
                label="Shopping budget"
                options={BUDGET_OPTIONS}
                selected={budgetPreference}
                onSelect={setBudgetPreference}
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm leading-6 text-white/55">
                Based on your location, gender, and job, pick at least one brand
                that feels close to your style. We’ll use this to infer your taste.
              </p>
              {loadingBrands ? (
                <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-3xl bg-white/5">
                  <svg
                    className="h-5 w-5 animate-spin text-white/50"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <p className="text-sm text-white/45">Generating brand chips</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {brandChips.map((brand) => {
                    const selected = selectedBrands.includes(brand);
                    return (
                      <button
                        key={brand}
                        type="button"
                        onClick={() =>
                          setSelectedBrands((current) =>
                            selected
                              ? current.filter((value) => value !== brand)
                              : [...current, brand]
                          )
                        }
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                          selected
                            ? "border-white bg-white text-black"
                            : "border-white/10 bg-white/10 text-white"
                        }`}
                      >
                        {brand}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm leading-6 text-white/55">
                Upload a clear face selfie. We’ll generate a simple full-body
                base avatar in a white shirt and shorts that reflects your body
                type, then use it for future outfit generations.
              </p>
              <label className="block rounded-3xl border border-dashed border-white/20 bg-white/5 p-4">
                <span className="mb-3 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                  Selfie
                </span>
                <div className="flex items-center gap-4">
                  <div className="flex h-28 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10">
                    {selfiePreview ? (
                      <img
                        src={selfiePreview}
                        alt="Selfie preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-white/40">Face</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Take or upload selfie</p>
                    <p className="mt-1 text-xs leading-5 text-white/45">
                      This can take a bit because we generate the avatar now.
                    </p>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={(event) =>
                    setSelfie(event.target.files?.[0] ?? null)
                  }
                  className="mt-4 block w-full text-sm text-white/60 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-black"
                />
              </label>
            </div>
          )}

          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>

        <div className="mt-6 flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((current) => current - 1)}
              disabled={submitting}
              className="flex h-14 w-24 items-center justify-center rounded-full border border-white/15 text-sm font-semibold text-white"
            >
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={!userId || submitting || !canContinue()}
            className="flex h-14 flex-1 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40"
          >
            {step < TOTAL_STEPS - 1
              ? "Next"
              : submitting
                ? selfie
                  ? "Creating avatar..."
                  : "Saving..."
                : "Finish"}
          </button>
        </div>
      </form>
    </main>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "numeric";
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/30"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-sm text-white outline-none focus:border-white/30"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue} className="text-black">
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-white/45">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <ChipButton
            key={option}
            selected={selected.includes(option)}
            onClick={() => onToggle(option)}
          >
            {option}
          </ChipButton>
        ))}
      </div>
    </div>
  );
}

function SingleChipGroup({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-white/45">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <ChipButton
            key={option}
            selected={selected === option}
            onClick={() => onSelect(option)}
          >
            {option}
          </ChipButton>
        ))}
      </div>
    </div>
  );
}

function ChipButton({
  children,
  selected,
  onClick,
}: {
  children: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
        selected
          ? "border-white bg-white text-black"
          : "border-white/10 bg-white/10 text-white"
      }`}
    >
      {children}
    </button>
  );
}
