import React from "react";

interface TextWithPillProps {
  displayName: string;
  propertyId?: string;
  accountName?: string;
  accountId?: string;
  className?: string;
  displayNameClassName?: string;
  idClassName?: string;
  pillClassName?: string;
}

const TextWithPill = ({
  displayName,
  propertyId,
  accountName,
  accountId,
  className = "",
  displayNameClassName = "text-general-foreground text-sm break-words",
  idClassName = "text-[10px] text-general-muted-foreground",
  pillClassName = "inline-flex max-w-full items-center px-2 py-1 bg-foreground-light rounded-lg text-[10px] text-general-secondary-foreground whitespace-normal break-words",
}: TextWithPillProps) => {
  return (
    <div className={`flex flex-col gap-0.5 items-start text-left min-w-0 flex-1 ${className}`}>
      <span className={displayNameClassName}>
        {displayName}
      </span>
      <div className="flex flex-col flex-wrap gap-0.5 min-w-0">
        {propertyId && (
          <span className={idClassName}>
            ID: {propertyId}
          </span>
        )}
        {accountName && accountId && (
          <span className={pillClassName}>
            {accountName} ({accountId})
          </span>
        )}
      </div>
    </div>
  );
};

export default TextWithPill;
