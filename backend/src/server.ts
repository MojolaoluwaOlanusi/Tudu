import dotenv from 'dotenv';
import app from './app';
import { createRealtimeServer } from './socketServer';
import { isSelfHosted } from './config/mode';
import { getCurrentLicenseStatus, isIssuerConfigured } from './services/licenseService';

dotenv.config();

// Report the license state at boot. On self-hosted this is the first
// thing an operator looks at when Pro features are not unlocking; on
// cloud the same line confirms the issuer key is loaded.
if (isSelfHosted()) {
  const status = getCurrentLicenseStatus();
  if (status.valid && status.payload) {
    console.log(
      '[license] valid for ' +
        status.payload.tier +
        ' until ' +
        (status.payload.expiresAt ?? 'never'),
    );
  } else if (!status.present) {
    console.log('[license] none - Pro features are locked until a license is activated');
  } else {
    console.log('[license] present but invalid: ' + status.reason);
  }
} else {
  console.log('[license] cloud mode, issuer configured: ' + isIssuerConfigured());
}

const PORT = process.env.PORT || 5000;

const { httpServer, io } = createRealtimeServer(app);

// Make io available to other modules
export { io };

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
