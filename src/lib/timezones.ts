// Canonical IANA Time Zone Database picker.
//
// Values are full IANA identifiers (e.g. "America/New_York") — that is what
// we store on profiles.timezone and pass to every conversion helper.
// Labels are derived as "City, Country (ABBR)" — e.g. "London, United Kingdom (GMT)".
//
// The zone list comes from `Intl.supportedValuesOf("timeZone")` (the ICU IANA
// database that ships with the JS runtime), so it stays current with no
// manual maintenance. We map each zone to a country via the inline IANA→ISO2
// table below (sourced from the tz database zone1970.tab), and resolve the
// country name with `Intl.DisplayNames`.

import { tzAbbrev } from "./tz";

export interface TimezoneOption {
  value: string;
  label: string;
  /** UTC offset in minutes (for stable sorting). */
  offsetMinutes: number;
}

// IANA zone → primary ISO-3166 country (from zone1970.tab).
const IANA_TO_COUNTRY: Record<string, string> = {
  "Africa/Abidjan": "CI", "Africa/Accra": "GH", "Africa/Addis_Ababa": "ET",
  "Africa/Algiers": "DZ", "Africa/Asmara": "ER", "Africa/Bamako": "ML",
  "Africa/Bangui": "CF", "Africa/Banjul": "GM", "Africa/Bissau": "GW",
  "Africa/Blantyre": "MW", "Africa/Brazzaville": "CG", "Africa/Bujumbura": "BI",
  "Africa/Cairo": "EG", "Africa/Casablanca": "MA", "Africa/Ceuta": "ES",
  "Africa/Conakry": "GN", "Africa/Dakar": "SN", "Africa/Dar_es_Salaam": "TZ",
  "Africa/Djibouti": "DJ", "Africa/Douala": "CM", "Africa/El_Aaiun": "EH",
  "Africa/Freetown": "SL", "Africa/Gaborone": "BW", "Africa/Harare": "ZW",
  "Africa/Johannesburg": "ZA", "Africa/Juba": "SS", "Africa/Kampala": "UG",
  "Africa/Khartoum": "SD", "Africa/Kigali": "RW", "Africa/Kinshasa": "CD",
  "Africa/Lagos": "NG", "Africa/Libreville": "GA", "Africa/Lome": "TG",
  "Africa/Luanda": "AO", "Africa/Lubumbashi": "CD", "Africa/Lusaka": "ZM",
  "Africa/Malabo": "GQ", "Africa/Maputo": "MZ", "Africa/Maseru": "LS",
  "Africa/Mbabane": "SZ", "Africa/Mogadishu": "SO", "Africa/Monrovia": "LR",
  "Africa/Nairobi": "KE", "Africa/Ndjamena": "TD", "Africa/Niamey": "NE",
  "Africa/Nouakchott": "MR", "Africa/Ouagadougou": "BF", "Africa/Porto-Novo": "BJ",
  "Africa/Sao_Tome": "ST", "Africa/Tripoli": "LY", "Africa/Tunis": "TN",
  "Africa/Windhoek": "NA",
  "America/Adak": "US", "America/Anchorage": "US", "America/Anguilla": "AI",
  "America/Antigua": "AG", "America/Araguaina": "BR",
  "America/Argentina/Buenos_Aires": "AR", "America/Argentina/Catamarca": "AR",
  "America/Argentina/Cordoba": "AR", "America/Argentina/Jujuy": "AR",
  "America/Argentina/La_Rioja": "AR", "America/Argentina/Mendoza": "AR",
  "America/Argentina/Rio_Gallegos": "AR", "America/Argentina/Salta": "AR",
  "America/Argentina/San_Juan": "AR", "America/Argentina/San_Luis": "AR",
  "America/Argentina/Tucuman": "AR", "America/Argentina/Ushuaia": "AR",
  "America/Aruba": "AW", "America/Asuncion": "PY", "America/Atikokan": "CA",
  "America/Bahia": "BR", "America/Bahia_Banderas": "MX", "America/Barbados": "BB",
  "America/Belem": "BR", "America/Belize": "BZ", "America/Blanc-Sablon": "CA",
  "America/Boa_Vista": "BR", "America/Bogota": "CO", "America/Boise": "US",
  "America/Cambridge_Bay": "CA", "America/Campo_Grande": "BR", "America/Cancun": "MX",
  "America/Caracas": "VE", "America/Cayenne": "GF", "America/Cayman": "KY",
  "America/Chicago": "US", "America/Chihuahua": "MX", "America/Costa_Rica": "CR",
  "America/Creston": "CA", "America/Cuiaba": "BR", "America/Curacao": "CW",
  "America/Danmarkshavn": "GL", "America/Dawson": "CA", "America/Dawson_Creek": "CA",
  "America/Denver": "US", "America/Detroit": "US", "America/Dominica": "DM",
  "America/Edmonton": "CA", "America/Eirunepe": "BR", "America/El_Salvador": "SV",
  "America/Fort_Nelson": "CA", "America/Fortaleza": "BR", "America/Glace_Bay": "CA",
  "America/Godthab": "GL", "America/Nuuk": "GL", "America/Goose_Bay": "CA",
  "America/Grand_Turk": "TC", "America/Grenada": "GD", "America/Guadeloupe": "GP",
  "America/Guatemala": "GT", "America/Guayaquil": "EC", "America/Guyana": "GY",
  "America/Halifax": "CA", "America/Havana": "CU", "America/Hermosillo": "MX",
  "America/Indiana/Indianapolis": "US", "America/Indiana/Knox": "US",
  "America/Indiana/Marengo": "US", "America/Indiana/Petersburg": "US",
  "America/Indiana/Tell_City": "US", "America/Indiana/Vevay": "US",
  "America/Indiana/Vincennes": "US", "America/Indiana/Winamac": "US",
  "America/Inuvik": "CA", "America/Iqaluit": "CA", "America/Jamaica": "JM",
  "America/Juneau": "US", "America/Kentucky/Louisville": "US",
  "America/Kentucky/Monticello": "US", "America/Kralendijk": "BQ",
  "America/La_Paz": "BO", "America/Lima": "PE", "America/Los_Angeles": "US",
  "America/Lower_Princes": "SX", "America/Maceio": "BR", "America/Managua": "NI",
  "America/Manaus": "BR", "America/Marigot": "MF", "America/Martinique": "MQ",
  "America/Matamoros": "MX", "America/Mazatlan": "MX", "America/Menominee": "US",
  "America/Merida": "MX", "America/Metlakatla": "US", "America/Mexico_City": "MX",
  "America/Miquelon": "PM", "America/Moncton": "CA", "America/Monterrey": "MX",
  "America/Montevideo": "UY", "America/Montserrat": "MS", "America/Nassau": "BS",
  "America/New_York": "US", "America/Nipigon": "CA", "America/Nome": "US",
  "America/Noronha": "BR", "America/North_Dakota/Beulah": "US",
  "America/North_Dakota/Center": "US", "America/North_Dakota/New_Salem": "US",
  "America/Ojinaga": "MX", "America/Panama": "PA", "America/Pangnirtung": "CA",
  "America/Paramaribo": "SR", "America/Phoenix": "US", "America/Port-au-Prince": "HT",
  "America/Port_of_Spain": "TT", "America/Porto_Velho": "BR", "America/Puerto_Rico": "PR",
  "America/Punta_Arenas": "CL", "America/Rainy_River": "CA", "America/Rankin_Inlet": "CA",
  "America/Recife": "BR", "America/Regina": "CA", "America/Resolute": "CA",
  "America/Rio_Branco": "BR", "America/Santarem": "BR", "America/Santiago": "CL",
  "America/Santo_Domingo": "DO", "America/Sao_Paulo": "BR", "America/Scoresbysund": "GL",
  "America/Sitka": "US", "America/St_Barthelemy": "BL", "America/St_Johns": "CA",
  "America/St_Kitts": "KN", "America/St_Lucia": "LC", "America/St_Thomas": "VI",
  "America/St_Vincent": "VC", "America/Swift_Current": "CA", "America/Tegucigalpa": "HN",
  "America/Thule": "GL", "America/Thunder_Bay": "CA", "America/Tijuana": "MX",
  "America/Toronto": "CA", "America/Tortola": "VG", "America/Vancouver": "CA",
  "America/Whitehorse": "CA", "America/Winnipeg": "CA", "America/Yakutat": "US",
  "America/Yellowknife": "CA", "America/Ciudad_Juarez": "MX",
  "Antarctica/Casey": "AQ", "Antarctica/Davis": "AQ", "Antarctica/DumontDUrville": "AQ",
  "Antarctica/Macquarie": "AU", "Antarctica/Mawson": "AQ", "Antarctica/McMurdo": "AQ",
  "Antarctica/Palmer": "AQ", "Antarctica/Rothera": "AQ", "Antarctica/Syowa": "AQ",
  "Antarctica/Troll": "AQ", "Antarctica/Vostok": "AQ",
  "Arctic/Longyearbyen": "SJ",
  "Asia/Aden": "YE", "Asia/Almaty": "KZ", "Asia/Amman": "JO", "Asia/Anadyr": "RU",
  "Asia/Aqtau": "KZ", "Asia/Aqtobe": "KZ", "Asia/Ashgabat": "TM", "Asia/Atyrau": "KZ",
  "Asia/Baghdad": "IQ", "Asia/Bahrain": "BH", "Asia/Baku": "AZ", "Asia/Bangkok": "TH",
  "Asia/Barnaul": "RU", "Asia/Beirut": "LB", "Asia/Bishkek": "KG", "Asia/Brunei": "BN",
  "Asia/Chita": "RU", "Asia/Choibalsan": "MN", "Asia/Colombo": "LK", "Asia/Damascus": "SY",
  "Asia/Dhaka": "BD", "Asia/Dili": "TL", "Asia/Dubai": "AE", "Asia/Dushanbe": "TJ",
  "Asia/Famagusta": "CY", "Asia/Gaza": "PS", "Asia/Hebron": "PS",
  "Asia/Ho_Chi_Minh": "VN", "Asia/Hong_Kong": "HK", "Asia/Hovd": "MN",
  "Asia/Irkutsk": "RU", "Asia/Jakarta": "ID", "Asia/Jayapura": "ID",
  "Asia/Jerusalem": "IL", "Asia/Kabul": "AF", "Asia/Kamchatka": "RU",
  "Asia/Karachi": "PK", "Asia/Kathmandu": "NP", "Asia/Khandyga": "RU",
  "Asia/Kolkata": "IN", "Asia/Krasnoyarsk": "RU", "Asia/Kuala_Lumpur": "MY",
  "Asia/Kuching": "MY", "Asia/Kuwait": "KW", "Asia/Macau": "MO",
  "Asia/Magadan": "RU", "Asia/Makassar": "ID", "Asia/Manila": "PH",
  "Asia/Muscat": "OM", "Asia/Nicosia": "CY", "Asia/Novokuznetsk": "RU",
  "Asia/Novosibirsk": "RU", "Asia/Omsk": "RU", "Asia/Oral": "KZ",
  "Asia/Phnom_Penh": "KH", "Asia/Pontianak": "ID", "Asia/Pyongyang": "KP",
  "Asia/Qatar": "QA", "Asia/Qostanay": "KZ", "Asia/Qyzylorda": "KZ",
  "Asia/Riyadh": "SA", "Asia/Sakhalin": "RU", "Asia/Samarkand": "UZ",
  "Asia/Seoul": "KR", "Asia/Shanghai": "CN", "Asia/Singapore": "SG",
  "Asia/Srednekolymsk": "RU", "Asia/Taipei": "TW", "Asia/Tashkent": "UZ",
  "Asia/Tbilisi": "GE", "Asia/Tehran": "IR", "Asia/Thimphu": "BT",
  "Asia/Tokyo": "JP", "Asia/Tomsk": "RU", "Asia/Ulaanbaatar": "MN",
  "Asia/Urumqi": "CN", "Asia/Ust-Nera": "RU", "Asia/Vientiane": "LA",
  "Asia/Vladivostok": "RU", "Asia/Yakutsk": "RU", "Asia/Yangon": "MM",
  "Asia/Yekaterinburg": "RU", "Asia/Yerevan": "AM",
  "Atlantic/Azores": "PT", "Atlantic/Bermuda": "BM", "Atlantic/Canary": "ES",
  "Atlantic/Cape_Verde": "CV", "Atlantic/Faroe": "FO", "Atlantic/Madeira": "PT",
  "Atlantic/Reykjavik": "IS", "Atlantic/South_Georgia": "GS", "Atlantic/St_Helena": "SH",
  "Atlantic/Stanley": "FK",
  "Australia/Adelaide": "AU", "Australia/Brisbane": "AU", "Australia/Broken_Hill": "AU",
  "Australia/Currie": "AU", "Australia/Darwin": "AU", "Australia/Eucla": "AU",
  "Australia/Hobart": "AU", "Australia/Lindeman": "AU", "Australia/Lord_Howe": "AU",
  "Australia/Melbourne": "AU", "Australia/Perth": "AU", "Australia/Sydney": "AU",
  "Europe/Amsterdam": "NL", "Europe/Andorra": "AD", "Europe/Astrakhan": "RU",
  "Europe/Athens": "GR", "Europe/Belgrade": "RS", "Europe/Berlin": "DE",
  "Europe/Bratislava": "SK", "Europe/Brussels": "BE", "Europe/Bucharest": "RO",
  "Europe/Budapest": "HU", "Europe/Busingen": "DE", "Europe/Chisinau": "MD",
  "Europe/Copenhagen": "DK", "Europe/Dublin": "IE", "Europe/Gibraltar": "GI",
  "Europe/Guernsey": "GG", "Europe/Helsinki": "FI", "Europe/Isle_of_Man": "IM",
  "Europe/Istanbul": "TR", "Europe/Jersey": "JE", "Europe/Kaliningrad": "RU",
  "Europe/Kiev": "UA", "Europe/Kyiv": "UA", "Europe/Kirov": "RU",
  "Europe/Lisbon": "PT", "Europe/Ljubljana": "SI", "Europe/London": "GB",
  "Europe/Luxembourg": "LU", "Europe/Madrid": "ES", "Europe/Malta": "MT",
  "Europe/Mariehamn": "AX", "Europe/Minsk": "BY", "Europe/Monaco": "MC",
  "Europe/Moscow": "RU", "Europe/Oslo": "NO", "Europe/Paris": "FR",
  "Europe/Podgorica": "ME", "Europe/Prague": "CZ", "Europe/Riga": "LV",
  "Europe/Rome": "IT", "Europe/Samara": "RU", "Europe/San_Marino": "SM",
  "Europe/Sarajevo": "BA", "Europe/Saratov": "RU", "Europe/Simferopol": "RU",
  "Europe/Skopje": "MK", "Europe/Sofia": "BG", "Europe/Stockholm": "SE",
  "Europe/Tallinn": "EE", "Europe/Tirane": "AL", "Europe/Ulyanovsk": "RU",
  "Europe/Uzhgorod": "UA", "Europe/Vaduz": "LI", "Europe/Vatican": "VA",
  "Europe/Vienna": "AT", "Europe/Vilnius": "LT", "Europe/Volgograd": "RU",
  "Europe/Warsaw": "PL", "Europe/Zagreb": "HR", "Europe/Zaporozhye": "UA",
  "Europe/Zurich": "CH",
  "Indian/Antananarivo": "MG", "Indian/Chagos": "IO", "Indian/Christmas": "CX",
  "Indian/Cocos": "CC", "Indian/Comoro": "KM", "Indian/Kerguelen": "TF",
  "Indian/Mahe": "SC", "Indian/Maldives": "MV", "Indian/Mauritius": "MU",
  "Indian/Mayotte": "YT", "Indian/Reunion": "RE",
  "Pacific/Apia": "WS", "Pacific/Auckland": "NZ", "Pacific/Bougainville": "PG",
  "Pacific/Chatham": "NZ", "Pacific/Chuuk": "FM", "Pacific/Easter": "CL",
  "Pacific/Efate": "VU", "Pacific/Enderbury": "KI", "Pacific/Kanton": "KI",
  "Pacific/Fakaofo": "TK", "Pacific/Fiji": "FJ", "Pacific/Funafuti": "TV",
  "Pacific/Galapagos": "EC", "Pacific/Gambier": "PF", "Pacific/Guadalcanal": "SB",
  "Pacific/Guam": "GU", "Pacific/Honolulu": "US", "Pacific/Kiritimati": "KI",
  "Pacific/Kosrae": "FM", "Pacific/Kwajalein": "MH", "Pacific/Majuro": "MH",
  "Pacific/Marquesas": "PF", "Pacific/Midway": "UM", "Pacific/Nauru": "NR",
  "Pacific/Niue": "NU", "Pacific/Norfolk": "NF", "Pacific/Noumea": "NC",
  "Pacific/Pago_Pago": "AS", "Pacific/Palau": "PW", "Pacific/Pitcairn": "PN",
  "Pacific/Pohnpei": "FM", "Pacific/Port_Moresby": "PG", "Pacific/Rarotonga": "CK",
  "Pacific/Saipan": "MP", "Pacific/Tahiti": "PF", "Pacific/Tarawa": "KI",
  "Pacific/Tongatapu": "TO", "Pacific/Wake": "UM", "Pacific/Wallis": "WF",
};

const COUNTRY_NAMES = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();

function cityName(zone: string): string {
  const last = zone.split("/").pop() ?? zone;
  return last.replace(/_/g, " ");
}

function countryName(zone: string): string {
  const iso2 = IANA_TO_COUNTRY[zone];
  if (!iso2 || !COUNTRY_NAMES) return "";
  try {
    return COUNTRY_NAMES.of(iso2) ?? "";
  } catch {
    return "";
  }
}

/** Current UTC offset (minutes east of UTC) for a given IANA zone. */
function offsetMinutesFor(zone: string, when: Date = new Date()): number {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "longOffset",
    });
    const part = dtf.formatToParts(when).find((p) => p.type === "timeZoneName")?.value ?? "";
    // longOffset: "GMT+05:30", "GMT-04:00", "GMT" (== +00:00)
    const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(part);
    if (!m) return 0;
    const sign = m[1] === "-" ? -1 : 1;
    return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3] ?? "0", 10));
  } catch {
    return 0;
  }
}

function buildLabel(zone: string): string {
  const city = cityName(zone);
  const country = countryName(zone);
  const abbr = tzAbbrev(zone);
  const base = country ? `${city}, ${country}` : city;
  return abbr ? `${base} (${abbr})` : base;
}

function listSupportedZones(): string[] {
  try {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
    ).supportedValuesOf?.("timeZone");
    if (supported && supported.length) return supported;
  } catch {
    // fall through
  }
  return Object.keys(IANA_TO_COUNTRY);
}

const RAW_ZONES = listSupportedZones().filter((z) => {
  // Hide Etc/* aliases and legacy single-segment zones from the picker — they
  // confuse end users. UTC itself is added explicitly below.
  if (z === "UTC") return false;
  if (z.startsWith("Etc/")) return false;
  if (!z.includes("/")) return false;
  return true;
});

const ZONE_OPTIONS: TimezoneOption[] = RAW_ZONES.map((zone) => ({
  value: zone,
  label: buildLabel(zone),
  offsetMinutes: offsetMinutesFor(zone),
})).sort((a, b) => {
  if (a.offsetMinutes !== b.offsetMinutes) return a.offsetMinutes - b.offsetMinutes;
  return a.label.localeCompare(b.label);
});

export const TIMEZONES: TimezoneOption[] = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)", offsetMinutes: 0 },
  ...ZONE_OPTIONS,
];

const BY_VALUE: Record<string, TimezoneOption> = Object.fromEntries(
  TIMEZONES.map((t) => [t.value, t]),
);

/** Full picker label: "City, Country (ABBR)". Falls back to the raw IANA value. */
export function timezoneLabel(value: string | null | undefined): string {
  if (!value) return "";
  return BY_VALUE[value]?.label ?? buildLabel(value) ?? value;
}

/** Same as `timezoneLabel` — kept for backwards compatibility with existing callers. */
export function friendlyTimezoneLabel(value: string | null | undefined): string {
  return timezoneLabel(value);
}
