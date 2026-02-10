"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SectionItem {
  id: string;
  label: string;
}

interface ProfileSidebarProps {
  sections: SectionItem[];
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
  buttonText?: string;
  onButtonClick?: () => void;
  buttonDisabled?: boolean;
  buttonHelperText?: string;
  isWorkflowProcessing?: boolean;
}

export function ProfileSidebar({
  sections,
  activeSection,
  onSectionClick,
  buttonText = "Confirm & Proceed to Strategy",
  onButtonClick,
  buttonDisabled = false,
  buttonHelperText,
  isWorkflowProcessing = false,
}: ProfileSidebarProps) {
  const helperTextClass =
    buttonHelperText === "Checking your plan..."
      ? "text-foreground"
      : "text-destructive";

  return (
    <div className="flex flex-col gap-2 sticky top-20">
      {/* Section Navigation */}
      <Card className="w-[250px] shrink-0 h-fit bg-white border border-general-border shadow-none rounded-lg py-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => onSectionClick(section.id)}
                className={cn(
                  "flex items-center p-3 text-sm text-left transition-colors font-medium hover:bg-primary-foreground cursor-pointer",
                  activeSection === section.id
                    ? "bg-primary-foreground text-foreground"
                    : "text-general-muted-foreground"
                )}
              >
                {section.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Progress Section */}
      <Card className="w-[250px] shrink-0  h-fit bg-white border-none shadow-none rounded-lg px-2 py-3 overflow-hidden">
        <CardContent className="p-0">
          <Button 
            className="w-full" 
            variant='default' 
            size="lg" 
            onClick={onButtonClick}
            disabled={buttonDisabled}
          >
            {buttonText}
          </Button>
          {isWorkflowProcessing && (
            <p className="mt-2 text-xs text-muted-foreground">
              Workflows are under process. Please wait till they are done.
            </p>
          )}
          {!isWorkflowProcessing && buttonDisabled && buttonHelperText ? (
            <p className={cn("mt-2 text-xs", helperTextClass)}>
              {buttonHelperText}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default ProfileSidebar;
