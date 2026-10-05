// Ready-made marketing email templates for the Nexora Email Marketing center.
// Each is { id, name, group, subject, bodyHtml, bodyText }. {{name}} and
// {{unsubscribe}} are filled in per recipient when the email is sent.
// Copy lives in marketingTemplateSpecs.js, the branded (logo) layout in
// marketingEmailLayout.js; both are shared with the automation sender.
import { brandedEmail, brandedText } from './marketingEmailLayout.js'
import { TEMPLATE_SPECS } from './marketingTemplateSpecs.js'

export const MARKETING_TEMPLATES = TEMPLATE_SPECS.map((spec) => ({
  id: spec.id,
  name: spec.name,
  group: spec.group,
  subject: spec.subject,
  bodyHtml: brandedEmail(spec),
  bodyText: brandedText(spec),
}))
