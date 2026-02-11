type AlertBannerProps = {
  messages: string[];
};

const AlertBanner = ({ messages }: AlertBannerProps) => {
  if (!messages.length) return null;

  return (
    <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
      <strong className="font-semibold">Atenção:</strong> {messages.join(" ")}
    </div>
  );
};

export default AlertBanner;
