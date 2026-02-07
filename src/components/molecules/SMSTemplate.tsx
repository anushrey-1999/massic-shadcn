"use client"

import React from "react"

export interface SMSTemplateProps {
  content: string
}

export const SMSTemplate: React.FC<SMSTemplateProps> = ({ content }) => {
  return (
    <div className="p-3 h-full flex flex-col justify-end pb-8">
      {/* SMS bubble */}
      <div className="flex justify-start mb-2">
        <div className="bg-gray-200 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]">
          <p className="text-[10px] text-gray-800 whitespace-pre-wrap">
            {content}
          </p>
        </div>
      </div>
    </div>
  )
}
