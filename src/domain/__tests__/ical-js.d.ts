/* =============================================================================
   Declaraciones mínimas de `ical.js` (v1.5 no publica tipos propios).
   Solo cubre lo que necesitan los tests de `domain/`: parseo, componentes,
   tiempos con TZID y la tabla de zonas para validar el VTIMEZONE generado.
   Si algún día se instala `@types/ical.js`, borra este archivo.
   ========================================================================== */

declare module 'ical.js' {
  export interface IcalProperty {
    name: string;
    /** `date`, `date-time`, `text`… según el valor ya convertido. */
    type: string;
    getParameter(name: string): string | undefined;
    getFirstValue(): unknown;
  }

  export interface IcalComponent {
    name: string;
    getAllSubcomponents(name?: string): IcalComponent[];
    getFirstSubcomponent(name?: string): IcalComponent | null;
    getAllProperties(name?: string): IcalProperty[];
    getFirstProperty(name?: string): IcalProperty | null;
    getFirstPropertyValue(name?: string): unknown;
    hasProperty(name: string): boolean;
  }

  export interface IcalTime {
    readonly year: number;
    readonly month: number;
    readonly day: number;
    readonly hour: number;
    readonly minute: number;
    readonly second: number;
    readonly isDate: boolean;
    readonly zone: IcalTimezone | null;
    /** Segundos desde la época, ya corregidos por el desplazamiento de la zona. */
    toUnixTime(): number;
    /** Desplazamiento UTC en segundos de esta zona en este instante. */
    utcOffset(): number;
    toString(): string;
  }

  export interface IcalTimezone {
    readonly tzid: string;
    utcOffset(time?: IcalTime): number;
  }

  export interface IcalTimezoneService {
    readonly count: number;
    reset(): void;
    has(tzid: string): boolean;
    get(tzid: string): IcalTimezone | null;
    register(name: string, timezone: IcalTimezone): void;
    remove(tzid: string): void;
  }

  export interface IcalDuration {
    readonly isNegative: boolean;
    toSeconds(): number;
    toString(): string;
  }

  interface IcalModule {
    /** jCal (arrays anidados) a partir del texto ICS. */
    parse(ics: string): unknown;
    Component: new (jcal?: unknown) => IcalComponent;
    Timezone: new (component: IcalComponent) => IcalTimezone;
    TimezoneService: IcalTimezoneService;
    Time: { fromString(value: string): IcalTime };
    Duration: { fromString(value: string): IcalDuration };
  }

  const ICAL: IcalModule;
  export default ICAL;
}
