export type CampaignOption = {
  id: string;
  label: string;
};

type CampaignSelectProps = {
  campaignId: string;
  options: CampaignOption[];
  onCampaignChange: (campaignId: string) => void;
};

/**
 * Temporary campaign picker for testing flows during early development.
 */
export function CampaignSelect({
  campaignId,
  options,
  onCampaignChange,
}: CampaignSelectProps) {
  const hasOptions = options.length > 0;

  return (
    <label className="flex max-w-[min(100%,220px)] flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span className="shrink-0">Campaign</span>
      <select
        className="min-h-[36px] min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
        value={campaignId}
        onChange={(e) => onCampaignChange(e.target.value)}
        aria-label="Campaign to test"
        disabled={!hasOptions}
      >
        {hasOptions ? (
          options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))
        ) : (
          <option value="">No campaigns</option>
        )}
      </select>
    </label>
  );
}
