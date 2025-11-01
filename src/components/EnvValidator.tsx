import { validateEnv } from '@/contracts/addresses';
import { X } from 'lucide-react';
import { useState } from 'react';

export function EnvValidator() {
  const [dismissed, setDismissed] = useState(false);
  const missingVars = validateEnv();

  if (missingVars.length === 0 || dismissed) {
    return null;
  }

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-3">
      <div className="container mx-auto flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold text-yellow-500 mb-1">
            ⚠️ Missing Configuration
          </p>
          <p className="text-sm text-yellow-400">
            The following environment variables are missing or using placeholders:
          </p>
          <ul className="list-disc list-inside text-sm text-yellow-300 mt-2">
            {missingVars.map((varName) => (
              <li key={varName}>{varName}</li>
            ))}
          </ul>
          <p className="text-xs text-yellow-400 mt-2">
            Please check your .env file and restart the development server.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-500 hover:text-yellow-400 transition-colors"
          aria-label="Dismiss"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
