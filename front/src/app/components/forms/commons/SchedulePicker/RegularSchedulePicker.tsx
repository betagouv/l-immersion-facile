import React from "react";
import { useFormContext } from "react-hook-form";
import { fr } from "@codegouvfr/react-dsfr";
import { useStyles } from "tss-react/dsfr";
import {
  calculateNumberOfWorkedDays,
  calculateTotalImmersionHoursFromComplexSchedule,
  calculateWeeklyHoursFromSchedule,
  ConventionDto,
  ConventionReadDto,
  DailyScheduleDto,
  DateIntervalDto,
  regularTimePeriods,
  ScheduleDto,
  ScheduleDtoBuilder,
  selectedDaysFromComplexSchedule,
  SelectedDaysOfTheWeekDto,
} from "shared";
import { HourPicker } from "./HourPicker";
import { TotalWeeklyHoursIndicator } from "./TotaWeeklylHoursIndicator";
import { WeekdayPicker } from "./WeekdayPicker";

export type RegularSchedulePickerProps = {
  interval: DateIntervalDto;
  disabled?: boolean;
};

export const RegularSchedulePicker = (props: RegularSchedulePickerProps) => {
  const { cx } = useStyles();
  const name: keyof ConventionDto = "schedule";
  const { setValue, getValues } = useFormContext<ConventionReadDto>();
  const values = getValues();
  const cciWeekDays = ["L", "M", "M", "J", "V", "S"];
  const immersionWeekDays = ["L", "M", "M", "J", "V", "S", "D"];
  const availableWeekDays =
    values.internshipKind === "mini-stage-cci"
      ? cciWeekDays
      : immersionWeekDays;

  return (
    <>
      <div
        className={cx(
          fr.cx("fr-grid-row", "fr-grid-row--gutters", "fr-mb-2w"),
          "schedule-picker",
          "schedule-picker--regular",
        )}
      >
        <div
          className={cx(
            fr.cx("fr-col-12", "fr-col-lg-8"),
            "schedule-picker__inner",
          )}
        >
          <WeekdayPicker
            name={name}
            availableWeekDays={availableWeekDays}
            selectedDays={selectedDaysFromComplexSchedule(
              values.schedule.complexSchedule,
            )}
            onValueChange={(newSelectedDays: SelectedDaysOfTheWeekDto) => {
              const newSchedule = new ScheduleDtoBuilder(values.schedule)
                .withDateInterval(props.interval)
                .withRegularSchedule({
                  selectedDays: newSelectedDays,
                  timePeriods: regularTimePeriods(values.schedule),
                })
                .build();
              setValue(name, newSchedule);
            }}
            interval={props.interval}
            disabled={props.disabled}
          />

          <p className={fr.cx("fr-h5", "fr-mt-2w")}>
            Sélectionnez les horaires
          </p>

          <HourPicker
            name={name}
            timePeriods={regularTimePeriods(values.schedule)}
            onValueChange={(newHours) => {
              const complexSchedule = values.schedule.complexSchedule.map(
                (dailySchedule): DailyScheduleDto => ({
                  date: dailySchedule.date,
                  timePeriods: newHours,
                }),
              );
              const schedule: ScheduleDto = {
                ...values.schedule,
                complexSchedule,
              };
              schedule.totalHours =
                calculateTotalImmersionHoursFromComplexSchedule(
                  schedule.complexSchedule,
                );
              schedule.workedDays = calculateNumberOfWorkedDays(
                schedule.complexSchedule,
              );
              setValue(name, schedule, {
                shouldValidate: true,
              });
            }}
            disabled={props.disabled}
          />
        </div>
        <div
          className={cx(
            fr.cx("fr-col-12", "fr-col-lg-4"),
            "schedule-picker__week-hours-summary",
          )}
        >
          <p className={fr.cx("fr-text--sm", "fr-mb-1w")}>
            <strong>Récapitulatif hebdomadaire</strong>
          </p>
          <hr className={fr.cx("fr-hr", "fr-pb-1w")} />
          <WeeksHoursIndicator schedule={values.schedule} />
        </div>
      </div>
    </>
  );
};

const WeeksHoursIndicator = ({
  schedule,
}: {
  schedule: ScheduleDto;
}): JSX.Element => {
  const workedHoursByWeek = calculateWeeklyHoursFromSchedule(schedule);
  const shouldShowRecap = workedHoursByWeek.length > 0;
  return (
    <>
      {shouldShowRecap && (
        <ul>
          {workedHoursByWeek.map((weekTotalHours, index) => (
            <TotalWeeklyHoursIndicator
              key={`weeklyHoursIndicator-${index}`}
              week={index + 1}
              totalHours={weekTotalHours}
            />
          ))}
        </ul>
      )}
      {!shouldShowRecap && (
        <p className={fr.cx("fr-text--xs")}>
          Vous n'avez pas encore sélectionné de jours travaillés
        </p>
      )}
    </>
  );
};
