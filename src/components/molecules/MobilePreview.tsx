"use client"

import React from "react"
import { EmailTemplate, type EmailTemplateProps } from "./EmailTemplate"
import { SMSTemplate, type SMSTemplateProps } from "./SMSTemplate"

export interface MobilePreviewProps {
  type: "email" | "sms"
  emailProps?: EmailTemplateProps
  smsProps?: SMSTemplateProps
}

export const MobilePreview: React.FC<MobilePreviewProps> = ({
  type,
  emailProps,
  smsProps,
}) => {
  return (
    <div className="w-[236px] h-[477px] border-[10px] border-black rounded-[36px] shadow-2xl bg-white relative overflow-hidden">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-b-2xl z-10"></div>

      {/* Content area */}
      <div className="h-full bg-gray-50 overflow-y-auto pt-6">
        {type === "email" && emailProps ? (
          <EmailTemplate {...emailProps} />
        ) : type === "sms" && smsProps ? (
          <SMSTemplate {...smsProps} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-xs">
            No preview available
          </div>
        )}
      </div>

      {/* Home indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 h-1 bg-black rounded-full"></div>
    </div>
  )
}
