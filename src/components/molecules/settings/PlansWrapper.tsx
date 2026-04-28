"use client";

import React, { useState } from "react";
import { PlanCard } from "./PlanCard";
import { PlanModal, PlanData } from "./PlanModal";
import { CreditModal } from "./CreditModal";
import { Typography } from "@/components/ui/typography";

interface PlanItem {
  planName: string;
  price: string;
  businessesLinked: string;
  iconName?: string;
  cardBackground?: string;
  isGradientPlanName?: boolean;
  hasBorder?: boolean;
  isRecommended?: boolean;
  isAddOn?: boolean;
  isMassicOpportunitiesActive?: boolean;
}

interface PlansWrapperProps {
  plansData: PlanItem[];
  modalPlansData?: PlanData[];
  onCreditsRefresh?: () => void;
  currentCreditBalance?: number;
  onPurchaseCredits?: (params?: { quantity: number }) => Promise<void>;
  onMassicOpportunitiesClick?: () => void;
  onMassicOpportunitiesDeactivate?: () => void;
}

export function PlansWrapper({
  plansData,
  modalPlansData,
  onCreditsRefresh,
  currentCreditBalance = 0,
  onPurchaseCredits,
  onMassicOpportunitiesClick,
  onMassicOpportunitiesDeactivate,
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

  const regularPlans = plansData.filter((plan) => !plan.isAddOn);
  const addOns = plansData.filter((plan) => plan.isAddOn);

  return (
    <>
      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-3">
          <Typography
            variant="h4"
            className="py-0 font-mono font-normal text-black"
          >
            Plans
          </Typography>
          <div className="flex flex-col gap-4">
            {regularPlans.map((plan) => (
              <PlanCard
                key={plan.planName}
                planName={plan.planName}
                price={plan.price}
                onClick={handlePlanClick}
                businessesLinked={plan.businessesLinked}
                iconName={plan.iconName}
                cardBackground={plan.cardBackground}
                isGradientPlanName={plan.isGradientPlanName}
                hasBorder={plan.hasBorder}
                isRecommended={plan.isRecommended}
                isAddOn={plan.isAddOn}
              />
            ))}
          </div>
        </section>

        {addOns.length > 0 && (
          <section className="flex flex-col gap-3">
            <Typography
              variant="h4"
              className="py-0 font-mono font-normal text-black"
            >
              Add-ons
            </Typography>
            <div className="flex flex-col gap-4">
              {addOns.map((plan) => (
                <PlanCard
                  key={plan.planName}
                  planName={plan.planName}
                  price={plan.price}
                  onClick={plan.planName === "Massic Opportunities" && onMassicOpportunitiesClick ? onMassicOpportunitiesClick : handleOpenCreditModal}
                  businessesLinked={plan.businessesLinked}
                  iconName={plan.iconName}
                  cardBackground={plan.cardBackground}
                  isGradientPlanName={plan.isGradientPlanName}
                  hasBorder={plan.hasBorder}
                  isRecommended={plan.isRecommended}
                  isAddOn={plan.isAddOn}
                  isMassicOpportunitiesActive={plan.isMassicOpportunitiesActive}
                  onDeactivate={plan.planName === "Massic Opportunities" && onMassicOpportunitiesDeactivate ? onMassicOpportunitiesDeactivate : undefined}
                />
              ))}
            </div>
          </section>
        )}
      </div>

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
