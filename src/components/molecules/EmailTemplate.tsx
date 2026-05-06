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
    <div className="bg-[#f5f7fb] p-3">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50 px-3 py-2">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <p className="truncate text-[9px] font-medium text-gray-500">
            Inbox / {businessName}
          </p>
        </div>

        <div className="border-b border-gray-100 px-3 py-2">
          <p className="text-[9px] uppercase tracking-wide text-gray-400">Subject</p>
          <p className="mt-0.5 text-[11px] font-semibold leading-snug text-gray-900">
            {subject}
          </p>
          <p className="mt-1 text-[9px] text-gray-500">
            From {businessName}
          </p>
        </div>

        <div className="px-3 py-3">
          <h3 className="text-center text-sm font-bold text-gray-900">
            {businessName}
          </h3>

          <div className="mt-3 whitespace-pre-wrap text-[10px] leading-relaxed text-gray-700">
            {content}
          </div>

          {buttonText && (
            <div className="mt-3 flex justify-center">
              <button
                onClick={onButtonClick}
                className="rounded-lg bg-gray-900 px-4 py-2 text-[10px] font-medium text-white transition-colors hover:bg-gray-800"
              >
                {buttonText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
