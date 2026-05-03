import SuggestionsPanel from '@/components/SuggestionsPanel';

export default function SuggestionsPage() {
  return (
    <div className="animate-fade-in space-y-6 w-full max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">
          Cook Suggestions
        </h1>
        <p className="text-muted-foreground">
          Personalized menu ideas based on your cook history and preferences.
        </p>
      </div>
      <SuggestionsPanel />
    </div>
  );
}
