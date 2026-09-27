import { categories, clinic, doctors } from './content';
import { getDict, t, tx, type Lang, type Vars } from './i18n';
import { hoursSummary } from './hours';

const address = [clinic.address.street, clinic.address.locality, `${clinic.address.region} ${clinic.address.postalCode}`].join(', ');

/** Values available as {{tokens}} in any content string, so numbers and contacts never drift. */
export function siteVars(lang: Lang): Vars {
  const dict = getDict(lang);
  return {
    doctorCount: doctors.length,
    categoryCount: categories.length,
    area: clinic.serviceAreas.primary,
    nearby: clinic.serviceAreas.nearby.join(', '),
    clinic: tx(clinic.displayName, lang),
    shortName: tx(clinic.shortName, lang),
    officialName: clinic.officialName,
    email: clinic.email,
    phone: clinic.phone.display,
    address,
    hoursSummary: hoursSummary(clinic.hours, (d) => t(dict, `days.${d}`), t(dict, 'hours.closed').toLowerCase()),
  };
}

export const fullAddress = address;
