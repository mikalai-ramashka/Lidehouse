import { SimpleSchema } from 'meteor/aldeed:simple-schema';

const TimePeriodSchema = new SimpleSchema({
  begin: { type: Date, optional: true,
    custom() {
      const nowDate = new Date();
      const beginDate = this.value;
      const endDate = this.field('activeTime.end').value;
      if (!beginDate && endDate) return 'required';
      if (beginDate && beginDate > nowDate) return 'notAllowed';
      return undefined;
    },
  },
  end: { type: Date, optional: true,
    custom() {
      const nowDate = new Date();
      const beginDate = this.field('activeTime.begin').value;
      const endDate = this.value;
      if (endDate && !beginDate) return 'notAllowed';
      if (endDate && endDate < beginDate) return 'notAllowed';
      if (endDate && endDate > nowDate) return 'notAllowed';
      return undefined;
    },
  },
});

export const ActivePeriodSchema = new SimpleSchema({
  activeTime: { type: TimePeriodSchema, optional: true },
  active: { type: Boolean, autoform: { omit: true },
    autoValue() {
      const beginDate = this.field('activeTime.begin').value;
      const endDate = this.field('activeTime.end').value;
      const nowDate = new Date();
      if (this.isUpdate && !beginDate && !endDate) return undefined;
        // If we have one of those set (begin or end) then both should be set
        // - autoform does that - and if you call update by hand, make sure you do that too!
      return (!beginDate || beginDate <= nowDate) && (!endDate || nowDate <= endDate);
    },
  },
});

ActivePeriodSchema.fields = [
  'activeTime.begin',
  'activeTime.end',
  'active',
];
