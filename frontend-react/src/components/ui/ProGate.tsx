import React from 'react';
import { FeatureKey } from '../../auth/plan';
import { FEATURES } from '../../auth/plan';

interface ProGateProps {
  children: React.ReactNode;
  feature: FeatureKey;
  mode?: 'block' | 'redirect'; // block shows overlay, redirect moves to /pro
}

export const ProGate: React.FC<ProGateProps> = ({
  children,
  feature,
  mode = 'block',
}) => {
  void mode;
  if (feature === FEATURES.TEAM_MANAGEMENT) {
    return null;
  }
  return <>{children}</>;
};
