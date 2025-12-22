"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  onPurchaseCredits,
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
        {/* Plans Card */}
        <Card className="bg-foreground-light p-4 border-none shadow-none flex flex-col gap-3">
          <CardHeader className="p-0">
            <CardTitle>
              <Typography
                variant="h4"
                className="text-general-muted-foreground  py-0"
              >
                Plans
              </Typography>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
          </CardContent>
        </Card>

        {/* Add-ons Card */}
        {addOns.length > 0 && (
          <Card className="bg-white p-4 shadow-none flex flex-col gap-3">
            <CardHeader className="p-0">
              <CardTitle>
                <Typography
                  variant="h4"
                  className="text-general-muted-foreground  py-0"
                >
                  Add-ons
                </Typography>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="">
                {addOns.map((plan) => (
                  <PlanCard
                    key={plan.planName}
                    planName={plan.planName}
                    price={plan.price}
                    onClick={handleOpenCreditModal}
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
            </CardContent>
          </Card>
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
