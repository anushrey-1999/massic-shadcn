"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanCard } from "./PlanCard";
import { PlanModal, PlanData } from "./PlanModal";
import { CreditModal } from "./CreditModal";

interface PlanItem {
  planName: string;
  price: string;
  businessesLinked: string;
  cardBackground?: string;
  isGradientPlanName?: boolean;
  hasBorder?: boolean;
  isRecommended?: boolean;
  isAddOn?: boolean;
}

interface PlansWrapperProps {
  plansData: PlanItem[];
  modalPlansData?: PlanData[];
  onCreditsRefresh?: () => void;
  currentCreditBalance?: number;
  onPurchaseCredits?: (params?: { quantity: number }) => Promise<void>;
}

export function PlansWrapper({
  plansData,
  modalPlansData,
  onCreditsRefresh,
  currentCreditBalance = 0,
  onPurchaseCredits
}: PlansWrapperProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);

  const handlePlanClick = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleOpenCreditModal = () => {
    setCreditModalOpen(true);
  };

  const handleCloseCreditModal = () => {
    setCreditModalOpen(false);
    if (onCreditsRefresh) {
      onCreditsRefresh();
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#00000099]">
            Plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1">
            {plansData.map((plan) => (
              <PlanCard
                key={plan.planName}
                planName={plan.planName}
                price={plan.price}
                onClick={plan.isAddOn ? handleOpenCreditModal : handlePlanClick}
                businessesLinked={plan.businessesLinked}
                cardBackground={plan.cardBackground}
                isGradientPlanName={plan.isGradientPlanName}
                hasBorder={plan.hasBorder}
                isRecommended={plan.isRecommended}
                isAddOn={plan.isAddOn}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <PlanModal
        open={modalOpen}
        onClose={handleCloseModal}
        plansData={modalPlansData}
        showFooterButtons={false}
      />

      <CreditModal
        open={creditModalOpen}
        onClose={handleCloseCreditModal}
        currentBalance={currentCreditBalance}
        onPurchaseCredits={onPurchaseCredits}
      />
    </>
  );
}

