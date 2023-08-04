import React from "react";
import { useFormContext } from "react-hook-form";
import { fr } from "@codegouvfr/react-dsfr";
import { parseISO } from "date-fns";
import {
  calculateWeeklyHours,
  ConventionReadDto,
  WeeklyImmersionTimetableDto,
} from "shared";
import { getDayStatus } from "./utils/getDayStatus";
import { DayCircle } from "./DayCircle";
import { HourIndicator } from "./HourIndicator";

type WeeklyRowProperties = {
  weeklyCalendar: WeeklyImmersionTimetableDto;
  selectedDate: Date | undefined;
  disabled?: boolean;
  onChange: (date: Date) => void;
};

export const WeeklyRow = ({
  weeklyCalendar,
  selectedDate,
  disabled,
  onChange,
}: WeeklyRowProperties) => {
  const { getValues } = useFormContext<ConventionReadDto>();
  const values = getValues();
  return (
    <div className={fr.cx("fr-grid-row", "fr-mt-1w", "fr-grid-row--middle")}>
      {weeklyCalendar.map((dayOfWeek) => (
        <DayCircle
          key={dayOfWeek.date}
          name={dayOfWeek.timePeriods !== null ? makeName(dayOfWeek.date) : ""}
          dayStatus={getDayStatus(dayOfWeek, selectedDate)}
          disabled={dayOfWeek.timePeriods !== null ? disabled : true}
          onClick={() => onChange(new Date(dayOfWeek.date))}
        />
      ))}
      <HourIndicator
        hours={calculateWeeklyHours(weeklyCalendar)}
        internshipKind={values.internshipKind}
        birthdate={values.signatories.beneficiary.birthdate}
      />
    </div>
  );
};

const makeName = (isoStringDate: string) => {
  const date = parseISO(isoStringDate);
  return `${date.getDate()}/${date.getMonth() + 1}`;
};
