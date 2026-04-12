import EntryFlow from '@/components/EntryFlow';

export const metadata = {
  title: "Entry Flow Preview \u2014 Mendoza's Masters Pool",
  description: 'Preview the entry flow design. No real submissions.',
};

export default function EnterPreviewPage() {
  // Far-future deadline so the form always renders open
  return <EntryFlow deadlineOverride="2099-12-31T23:59:59" preview />;
}
