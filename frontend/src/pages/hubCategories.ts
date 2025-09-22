import { BookOpen, Phone, Search, ShieldCheck, BarChart2, Box, GraduationCap, FileText, Users } from 'lucide-react';

export const HUB_CATEGORY_DEFS = {
  start_here: {
    label: 'Start Here, New Joiners Guides',
    description: 'Setup, expectations, week one checklist, core playbooks.',
    Icon: BookOpen,
  },
  cold_calling: {
    label: 'Cold Calling',
    description: 'Open strong, qualify fast, handle objections, stay compliant.',
    Icon: Phone,
  },
  prospecting: {
    label: 'Prospecting',
    description: 'ICP, triggers, research, personalization, cadences, data sources.',
    Icon: Search,
  },
  cos_qc_onboarding: {
    label: 'COS, QC, and Onboarding',
    description: 'COS process, QC standards, ticket instructions, reference docs, onboarding escalations.',
    Icon: ShieldCheck,
  },
  performance_accountability: {
    label: 'Performance and Accountability',
    description: 'Targets, pipeline hygiene, CRM analytics, Looker guides.',
    Icon: BarChart2,
  },
  product_market: {
    label: 'Product and Market',
    description: 'Product basics, pricing, use cases, competitors, value proof.',
    Icon: Box,
  },
  training_development: {
    label: 'Extra Training and Development',
    description: 'Upselling, discovery, best practices.',
    Icon: GraduationCap,
  },
  client_templates_proposals: {
    label: 'Client Templates and Proposals',
    description: 'Emails, proposals, calculators, decks, case studies.',
    Icon: FileText,
  },
  meetings_internal_comms: { label: 'Meetings and Internal Comms', Icon: Users },
} as const;

export function formatCategoryLabel(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const ALPHABETICAL_CATEGORY_KEYS = Object.keys(HUB_CATEGORY_DEFS).sort((a, b) => {
  const al = (HUB_CATEGORY_DEFS as any)[a]?.label || formatCategoryLabel(a);
  const bl = (HUB_CATEGORY_DEFS as any)[b]?.label || formatCategoryLabel(b);
  return al.localeCompare(bl);
});

// Fixed preferred ordering for tiles
export const CATEGORY_KEYS_ORDERED = [
  'start_here',
  'cold_calling',
  'prospecting',
  'cos_qc_onboarding',
  'performance_accountability',
  'product_market',
  'training_development',
  'client_templates_proposals',
  'meetings_internal_comms',
] as const;

