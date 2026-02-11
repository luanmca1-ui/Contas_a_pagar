type FiltersProps = {
  ufs: string[];
  selectedUf: string;
  onUfChange: (value: string) => void;
  units: string[];
  selectedUnit: string;
  onUnitChange: (value: string) => void;
  updatedAt: string;
};

const Filters = ({
  ufs,
  selectedUf,
  onUfChange,
  units,
  selectedUnit,
  onUnitChange,
  updatedAt
}: FiltersProps) => (
  <header className="flex flex-col gap-4 rounded-3xl border border-border bg-white/90 p-6 shadow-soft backdrop-blur print-compact lg:flex-row lg:items-center lg:justify-between">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
        The Barber Express
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-charcoal">Resumo 2025</h1>
      <p className="mt-2 text-sm text-slate-500">Atualizado em {updatedAt}</p>
    </div>
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
          UF
        </label>
        <select
          value={selectedUf}
          onChange={(event) => onUfChange(event.target.value)}
          className="min-w-[180px] rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-charcoal shadow-sm focus:border-barber focus:outline-none"
        >
          {ufs.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
          Unidade
        </label>
        <select
          value={selectedUnit}
          onChange={(event) => onUnitChange(event.target.value)}
          className="min-w-[200px] rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-charcoal shadow-sm focus:border-barber focus:outline-none"
        >
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>
    </div>
  </header>
);

export default Filters;
