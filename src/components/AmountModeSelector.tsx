'use client'

import { useState } from 'react'
import { AmountMode, AMOUNT_MODES, AmountModeConfig } from '@/lib/types-v2'

interface AmountModeSelectorProps {
  selectedMode: AmountMode
  onModeChange: (mode: AmountMode) => void
  disabled?: boolean
}

export default function AmountModeSelector({ 
  selectedMode, 
  onModeChange, 
  disabled = false 
}: AmountModeSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Mode de contribution
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {AMOUNT_MODES.map((modeConfig) => (
            <button
              key={modeConfig.mode}
              type="button"
              onClick={() => onModeChange(modeConfig.mode)}
              disabled={disabled}
              className={`
                relative p-4 rounded-lg border-2 transition-all duration-200 text-left
                ${selectedMode === modeConfig.mode
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start space-x-3">
                <div className="text-2xl">{modeConfig.icon}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {modeConfig.label}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {modeConfig.description}
                  </p>
                </div>
                {selectedMode === modeConfig.mode && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
