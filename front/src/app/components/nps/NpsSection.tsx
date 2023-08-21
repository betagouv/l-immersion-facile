import React from "react";
import { ConventionReadDto, npsFormIds, Role } from "shared";
import { NPSForm } from "react-design-system";

type NpsSectionProps = {
  convention: ConventionReadDto;
  role: Role;
};
export const NpsSection = ({
  convention,
  role,
}: NpsSectionProps): JSX.Element => {
  const npsShowStatuses: (typeof convention.status)[] = [
    "IN_REVIEW",
    "ACCEPTED_BY_COUNSELLOR",
    "ACCEPTED_BY_VALIDATOR",
  ];
  return (
    <>
      {role !== "backOffice" && npsShowStatuses.includes(convention.status) && (
        <NPSForm
          mode="embed"
          formId={npsFormIds.conventionVerification}
          conventionInfos={{
            id: convention.id,
            role,
            status: convention.status,
          }}
        />
      )}
    </>
  );
};
