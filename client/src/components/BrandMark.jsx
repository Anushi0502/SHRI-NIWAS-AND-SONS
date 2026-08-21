import { useState } from "react";
import { brand } from "../brand";

export default function BrandMark({ compact = false, showName = true, inverse = false, className = "" }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      <div className={`brand-mark ${compact ? "brand-mark--compact" : ""} ${inverse ? "brand-mark--inverse" : ""}`}>
        {!imageFailed ? <img src={brand.logoUrl} alt="" onError={() => setImageFailed(true)} /> : <span>{brand.shortName}</span>}
      </div>
      {showName ? (
        <div className="min-w-0">
          <div className={`truncate text-sm font-bold tracking-tight ${inverse ? "text-white" : "text-slate-950"}`}>{brand.name}</div>
          {!compact ? <div className={`truncate text-[11px] font-medium ${inverse ? "text-slate-400" : "text-slate-500"}`}>Small business operations</div> : null}
        </div>
      ) : null}
    </div>
  );
}
