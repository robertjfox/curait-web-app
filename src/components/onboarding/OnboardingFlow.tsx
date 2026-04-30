"use client";

import {
  useRef,
  useState,
  type FormEvent,
} from "react";
import { apiClient } from "@/lib/api";
import AvatarUploadPanel from "@/components/avatar/AvatarUploadPanel";

type Gender = "" | "male" | "female";
type BodyShape = "" | "slim" | "average" | "broad";

interface OnboardingFlowProps {
  userId: string | null;
  onComplete: () => void;
}

const TOTAL_STEPS = 4;

const FIT_PREFERENCE_OPTIONS = ["Slim / tailored", "Regular", "Relaxed"];
const AGE_RANGE_OPTIONS = ["15-21", "22-27", "28-35", "36-45", "46-55", "56+"];

export default function OnboardingFlow({
  userId,
  onComplete,
}: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState<Gender>("");
  const [ageRange, setAgeRange] = useState("");
  const [location, setLocation] = useState("");
  const [job, setJob] = useState("");
  const [brandChips, setBrandChips] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [customBrand, setCustomBrand] = useState("");
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [bodyShape, setBodyShape] = useState<BodyShape>("");
  const [fitPreference, setFitPreference] = useState("");
  const [selfie, setSelfie] = useState<File | null>(null);
  const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [contextSaved, setContextSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contextSavePromiseRef = useRef<Promise<void> | null>(null);

  const heightCm = (() => {
    const feet = Number(heightFeet || 0);
    const inches = Number(heightInches || 0);
    const totalInches = feet * 12 + inches;
    return totalInches > 0 ? Math.round(totalInches * 2.54) : undefined;
  })();

  function generateBrandChips() {
    if (loadingBrands || brandChips.length > 0) return;
    if (!gender || !location.trim()) return;

    let cancelled = false;
    setLoadingBrands(true);
    apiClient
      .generateStyleBrandChips({
        gender,
        age_range: ageRange || undefined,
        location: location.trim(),
        job: job.trim() || undefined,
        body_shape: bodyShape || undefined,
        fit_preference: fitPreference || undefined,
        height_feet: heightFeet ? Number(heightFeet) : undefined,
        height_inches: heightInches ? Number(heightInches) : undefined,
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
            "Madewell",
            "Reformation",
            "Banana Republic",
            "Abercrombie & Fitch",
            "Lululemon",
            "Buck Mason",
            "Massimo Dutti",
            "Theory",
          ]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBrands(false);
      });

    return () => {
      cancelled = true;
    };
  }

  function canContinue() {
    if (step === 0) return Boolean(location.trim() && gender && ageRange);
    if (step === 1) {
      return Boolean(
        heightFeet && heightInches !== "" && bodyShape && fitPreference
      );
    }
    if (step === 2) return selectedBrands.length > 0 || Boolean(customBrand.trim());
    if (step === 3) return Boolean(selfie || generatedAvatarUrl);
    return true;
  }

  const selectedBrandSignals = customBrand.trim()
    ? [...selectedBrands, customBrand.trim()]
    : selectedBrands;

  function buildOnboardingProfile() {
    const rawContext = {
      location: location.trim() || null,
      gender: gender || null,
      age_range: ageRange || null,
      job: job.trim() || null,
      height_feet: heightFeet ? Number(heightFeet) : null,
      height_inches: heightInches !== "" ? Number(heightInches) : null,
      height_cm: heightCm ?? null,
      body_shape: bodyShape || null,
      fit_preference: fitPreference || null,
      selected_brands: selectedBrands,
      custom_brand_notes: customBrand.trim() || null,
      style_notes:
        [
          selectedBrands.length > 0
            ? `Brand/style references: ${selectedBrands.join(", ")}`
            : null,
          customBrand.trim()
            ? `Additional brand/style notes: ${customBrand.trim()}`
            : null,
          ageRange ? `Age range: ${ageRange}` : null,
          fitPreference ? `Preferred fit: ${fitPreference}` : null,
        ]
          .filter(Boolean)
          .join(". "),
    };

    return {
      gender: gender || undefined,
      location: location.trim() || undefined,
      onboarding_raw_context: {
        ...rawContext,
        selected_brands: selectedBrandSignals,
      },
    };
  }

  function saveOnboardingContext() {
    if (!userId) return Promise.resolve();
    if (contextSaved) return Promise.resolve();
    if (contextSavePromiseRef.current) return contextSavePromiseRef.current;

    const savePromise = apiClient
      .updateUserProfile(userId, buildOnboardingProfile())
      .then(() => {
        setContextSaved(true);
      })
      .finally(() => {
        contextSavePromiseRef.current = null;
      });
    contextSavePromiseRef.current = savePromise;
    return savePromise;
  }

  function handleNext() {
    if (step === 0) {
      generateBrandChips();
    }

    if (step < TOTAL_STEPS - 1) {
      setStep((current) => current + 1);
    }

    if (step === 2) {
      void saveOnboardingContext().catch((err) => {
        console.error("Failed to save onboarding context:", err);
        setError("Could not save your style context. Try again.");
      });
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!userId || submitting) return;

    if (step < TOTAL_STEPS - 1) {
      handleNext();
      return;
    }

    if (generatedAvatarUrl) {
      onComplete();
      return;
    }

    if (!selfie) {
      setError("Take or upload a selfie first.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await saveOnboardingContext();
      const avatar = await apiClient.generateAvatar(userId, selfie);
      setGeneratedAvatarUrl(cacheBustUrl(avatar.image_url));
    } catch (err) {
      console.error("Onboarding failed:", err);
      setError("Could not save onboarding. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-[100dvh] overflow-x-hidden bg-black text-white">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#111,#000_58%)]" />
      <div className="landing-orb landing-orb-one absolute -left-20 top-8 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
      <div className="landing-orb landing-orb-two absolute -right-16 top-28 h-80 w-80 rounded-full bg-indigo-400/25 blur-3xl" />
      <div className="landing-orb landing-orb-three absolute bottom-4 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-stone-300/12 blur-3xl" />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 mx-auto flex w-full max-w-md flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]"
      >
        <div className="flex flex-1 flex-col justify-center gap-6">
          <div className="text-center">
            <ProgressDots currentStep={step} totalSteps={TOTAL_STEPS} />
            <h1 className="text-4xl font-semibold leading-tight">
              {step === 0 && "A bit about you"}
              {step === 1 && "Share your fit"}
              {step === 2 && "Pick brands you like"}
              {step === 3 && "Create your avatar"}
            </h1>
          </div>

          {step === 0 && (
            <div className="space-y-3">
              <TextField
                label="Location"
                value={location}
                onChange={setLocation}
                placeholder="NYC"
              />
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                  I am a
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["male", "Man"],
                    ["female", "Woman"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setGender(value as Gender)}
                      className={`h-14 rounded-2xl border text-sm font-medium transition ${
                        gender === value
                          ? "border-white bg-white text-black"
                          : "border-white/10 bg-white/10 text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <SelectField
                label="Age range"
                value={ageRange}
                onChange={setAgeRange}
                options={[
                  ["", "Select"],
                  ...AGE_RANGE_OPTIONS.map((range) => [range, range] as [string, string]),
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
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Feet"
                  value={heightFeet}
                  onChange={setHeightFeet}
                  options={[
                    ["", "Select"],
                    ["4", "4"],
                    ["5", "5"],
                    ["6", "6"],
                    ["7", "7"],
                  ]}
                />
                <SelectField
                  label="Inches"
                  value={heightInches}
                  onChange={setHeightInches}
                  options={[
                    ["", "Select"],
                    ["0", "0"],
                    ["1", "1"],
                    ["2", "2"],
                    ["3", "3"],
                    ["4", "4"],
                    ["5", "5"],
                    ["6", "6"],
                    ["7", "7"],
                    ["8", "8"],
                    ["9", "9"],
                    ["10", "10"],
                    ["11", "11"],
                  ]}
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
                    <button
                      key={option}
                      onClick={() => setFitPreference(option)}
                      type="button"
                      className={`h-14 rounded-2xl border text-sm font-medium transition ${
                        fitPreference === option
                          ? "border-white bg-white text-black"
                          : "border-white/10 bg-white/10 text-white"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
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
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                  Add your own
                </p>
                <div className="flex gap-2">
                  <input
                    value={customBrand}
                    onChange={(event) => setCustomBrand(event.target.value)}
                    placeholder="Acne Studios, Gap, On..."
                    className="h-12 min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/30"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <AvatarUploadPanel
              selfie={selfie}
              generatedAvatarUrl={generatedAvatarUrl}
              onSelfieChange={(nextSelfie) => {
                setGeneratedAvatarUrl(null);
                setSelfie(nextSelfie);
              }}
              onTryAgain={() => {
                setGeneratedAvatarUrl(null);
                setSelfie(null);
                setError(null);
              }}
            />
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
                ? "Creating avatar..."
                : generatedAvatarUrl
                  ? "Approve"
                  : "Create avatar"}
          </button>
        </div>
      </form>
    </main>
  );
}

function cacheBustUrl(url: string) {
  if (!url) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
}

function ProgressDots({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div
      className="mx-auto mb-5 flex w-32 items-center justify-center"
      aria-label={`Step ${currentStep + 1} of ${totalSteps}`}
    >
      {Array.from({ length: totalSteps }).map((_, index) => {
        const active = index <= currentStep;
        return (
          <div key={index} className="flex flex-1 items-center last:flex-none">
            <span
              className={`h-3.5 w-3.5 rounded-full border transition ${
                active
                  ? "border-white bg-white"
                  : "border-white/35 bg-transparent"
              }`}
            />
            {index < totalSteps - 1 && (
              <span
                className={`mx-1 h-px flex-1 transition ${
                  index < currentStep ? "bg-white" : "bg-white/25"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
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

