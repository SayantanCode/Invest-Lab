"use client";

import * as React from "react";

import { useProfileStore } from "@/lib/stores/use-profile-store";
import { ProfileWizard } from "@/components/plan/profile-wizard";
import { RecommendationsDashboard } from "@/components/plan/recommendations-dashboard";

export function ProfileMode() {
  const { profile, saveProfile } = useProfileStore();
  const [editing, setEditing] = React.useState(false);

  if (!profile || editing) {
    return (
      <ProfileWizard
        initialProfile={profile}
        onDone={(input) => {
          saveProfile(input);
          setEditing(false);
        }}
      />
    );
  }

  return <RecommendationsDashboard profile={profile} onEdit={() => setEditing(true)} />;
}
