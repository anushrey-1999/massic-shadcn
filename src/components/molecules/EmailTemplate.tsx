"use client"

import React from "react"

export interface EmailTemplateProps {
  subject: string
  businessName: string
  content: string
  buttonText?: string
  onButtonClick?: () => void
}

export const EmailTemplate: React.FC<EmailTemplateProps> = ({
  subject,
  businessName,
  content,
  buttonText,
  onButtonClick,
}) => {
  return (
    <div className="p-3 space-y-2 h-full overflow-y-auto">
      {/* Notification card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
        <div className="text-center text-[9px] text-gray-700 leading-relaxed">
          {subject}
        </div>
      </div>

      {/* Main email card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3 space-y-2">
        <h3 className="text-sm font-bold text-center text-gray-900">
          {businessName}
        </h3>

        <div className="space-y-2 text-[10px] text-gray-700 leading-relaxed whitespace-pre-wrap">
          {content}
        </div>

        {buttonText && (
          <button
            onClick={onButtonClick}
            className="w-full bg-white border-2 border-gray-900 text-gray-900 font-medium py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors text-[10px]"
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  )
}
