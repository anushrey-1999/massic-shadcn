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
  displayNameClassName = "text-general-foreground text-sm",
  idClassName = "text-[10px] text-general-muted-foreground",
  pillClassName = "inline-flex items-center px-2 py-1 bg-foreground-light rounded-lg text-[10px] text-general-secondary-foreground",
}: TextWithPillProps) => {
  return (
    <div className={`flex flex-col items-start text-left min-w-0 flex-1 ${className}`}>
      <span className={displayNameClassName}>
        {displayName}
      </span>
      <div className="flex items-center gap-2 mt-1">
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
