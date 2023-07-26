import { z } from "zod";
import { Builder } from "../Builder";
import {
  DailyScheduleDto,
  DateIntervalDto,
  DayPeriodsDto,
  ScheduleDto,
} from "./Schedule.dto";
import { dayPeriodsSchema, timePeriodsSchema } from "./Schedule.schema";
import {
  calculateNumberOfWorkedDays,
  calculateTotalImmersionHoursFromComplexSchedule,
  emptySchedule,
  frenchDayMapping,
} from "./ScheduleUtils";

const emptyRegularSchedule: RegularScheduleDto = {
  dayPeriods: [[0, 6]],
  timePeriods: [],
};

const complexScheduleFromRegularSchedule = (
  complexSchedule: DailyScheduleDto[],
  regularSchedule: RegularScheduleDto,
): DailyScheduleDto[] => {
  const isDailyScheduleOnRegularDayPeriod = (
    dailySchedule: DailyScheduleDto,
    regularDayPeriods: DayPeriodsDto,
  ): boolean =>
    regularDayPeriods.some(([startWorkingDay, endWorkingDay]) => {
      for (
        let currentWorkingDay = startWorkingDay;
        currentWorkingDay <= endWorkingDay;
        currentWorkingDay++
      ) {
        if (
          currentWorkingDay === frenchDayMapping(dailySchedule.date).frenchDay
        )
          return true;
      }
      return false;
    });
  for (let index = complexSchedule.length - 1; index >= 0; index--) {
    const check = isDailyScheduleOnRegularDayPeriod(
      complexSchedule[index],
      regularSchedule.dayPeriods,
    );
    if (check) complexSchedule[index].timePeriods = regularSchedule.timePeriods;
    else complexSchedule.splice(index, 1);
  }
  return complexSchedule;
};

// Represents a schedule where each day is worked on the same
// schedule, with any combinations of workdays.
const regularScheduleSchema = z.object({
  dayPeriods: dayPeriodsSchema,
  timePeriods: timePeriodsSchema,
});

type RegularScheduleDto = z.infer<typeof regularScheduleSchema>;

const defaultInterval: DateIntervalDto = {
  start: new Date("2022-06-13"),
  end: new Date("2022-06-19"),
};

export class ScheduleDtoBuilder implements Builder<ScheduleDto> {
  constructor(private dto: ScheduleDto = emptySchedule(defaultInterval)) {}

  public build() {
    return this.dto;
  }

  public withComplexSchedule(
    complexSchedule: DailyScheduleDto[],
  ): ScheduleDtoBuilder {
    return new ScheduleDtoBuilder({
      ...this.dto,
      isSimple: false,
      complexSchedule,
    });
  }

  public withDateInterval(interval: DateIntervalDto): ScheduleDtoBuilder {
    return this.withComplexSchedule(emptySchedule(interval).complexSchedule);
  }

  public withEmptyRegularSchedule(): ScheduleDtoBuilder {
    return this.withRegularSchedule(emptyRegularSchedule);
  }

  public withRegularSchedule(
    regularSchedule: RegularScheduleDto,
  ): ScheduleDtoBuilder {
    const complexSchedule = complexScheduleFromRegularSchedule(
      this.dto.complexSchedule,
      regularSchedule,
    );

    return new ScheduleDtoBuilder({
      ...this.dto,
      workedDays: calculateNumberOfWorkedDays(complexSchedule),
      totalHours:
        calculateTotalImmersionHoursFromComplexSchedule(complexSchedule),
      isSimple: true,
      complexSchedule,
    });
  }

  public withTotalHours(totalHours: number) {
    return new ScheduleDtoBuilder({ ...this.dto, totalHours });
  }

  public withWorkedDays(workedDays: number) {
    return new ScheduleDtoBuilder({ ...this.dto, workedDays });
  }
}
