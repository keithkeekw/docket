declare module 'preline/plugins/tooltip-non-auto' {
  import type { HSTooltip as HSTooltipClass } from 'preline/non-auto';
  const HSTooltip: typeof HSTooltipClass;
  export default HSTooltip;
}

declare module 'preline/plugins/select-non-auto' {
  import type { HSSelect as HSSelectClass } from 'preline/non-auto';
  const HSSelect: typeof HSSelectClass;
  export default HSSelect;
}

declare module 'preline/plugins/datepicker-non-auto' {
  import type { HSDatepicker as HSDatepickerClass } from 'preline/non-auto';
  const HSDatepicker: typeof HSDatepickerClass;
  export default HSDatepicker;
}
