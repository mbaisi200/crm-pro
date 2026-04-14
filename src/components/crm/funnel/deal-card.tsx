'use client'

import React from 'react'
import { Deal } from '@/stores/crm-store'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DealCardProps {
  deal: Deal
  stageColor: string
  companyName: string
  onClick?: () => void
  isDragging?: boolean
}

export function DealCard({ deal, stageColor, companyName, onClick, isDragging }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: deal.id, data: { type: 'deal', deal } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderLeftColor: stageColor,
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value)

  // Activity status: overdue=red, on-time=green, no-task=gray
  const getActivityStatus = () => {
    // For now, use a simple heuristic based on the deal data
    const hasActivity = deal.customFields?.lastActivity
    if (!hasActivity) return 'none'
    return 'on-time'
  }

  const activityStatus = getActivityStatus()

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'bg-white rounded-lg p-3 cursor-pointer transition-all duration-200',
        'border-l-4 hover:shadow-md hover:-translate-y-0.5',
        isDragging || isSortableDragging ? 'opacity-50 shadow-lg rotate-2 scale-105' : 'shadow-sm',
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-800 leading-tight flex-1 mr-2">{deal.title}</h4>
        <div className="flex-shrink-0">
          {activityStatus === 'overdue' && <AlertCircle className="w-4 h-4 text-red-500" />}
          {activityStatus === 'on-time' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          {activityStatus === 'none' && <Clock className="w-4 h-4 text-gray-300" />}
        </div>
      </div>

      {companyName && (
        <p className="text-xs text-gray-500 mb-2">{companyName}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-sm font-bold text-[#1e3a5f]">
          {formatCurrency(deal.value)}
        </span>
        {deal.owner && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-gray-100 text-gray-600">
            {deal.owner}
          </Badge>
        )}
      </div>
    </div>
  )
}
