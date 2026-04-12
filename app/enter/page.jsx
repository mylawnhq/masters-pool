import PasswordGate from '@/components/PasswordGate';
import EntryFlow from '@/components/EntryFlow';

export const metadata = {
  title: "Enter the Pool \u2014 Mendoza's Masters Pool",
  description: 'Submit your picks for the Masters Pool.',
};

export default function EnterPage() {
  return (
    <PasswordGate>
      <EntryFlow />
    </PasswordGate>
  );
}
