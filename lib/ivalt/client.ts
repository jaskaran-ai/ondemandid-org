// iVALT API client

import type {
  IvaltAuthRequestResponse,
  IvaltAuthResultResponse,
  IvaltGeoFenceResponse,
} from './types';

const IVALT_API_BASE_URL =
  process.env.IVALT_API_BASE_URL || 'https://api.ivalt.com';
const IVALT_API_KEY = process.env.IVALT_API_KEY;
const DEBUG_MODE =
  process.env.DEBUG_MODE === 'true' || process.env.NODE_ENV === 'development';

const IVALT_FETCH_TIMEOUT_MS = parseInt(
  process.env.IVALT_FETCH_TIMEOUT_MS || '15000',
  10
);

if (!IVALT_API_KEY) {
  console.warn('IVALT_API_KEY not set - iVALT API calls will fail');
}

async function ivaltRequest<T>(
  endpoint: string,
  body?: Record<string, unknown>
): Promise<T> {
  if (!IVALT_API_KEY) {
    throw new Error(
      'IVALT_API_KEY is not set. Configure it in .env or enable DEMO_MODE=true.'
    );
  }

  const url = `${IVALT_API_BASE_URL}${endpoint}`;

  // Log request in development mode
  if (DEBUG_MODE) {
    console.log('[iVALT Request]', {
      url,
      method: 'POST',
      body: body ?? null,
    });
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': IVALT_API_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(IVALT_FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error(
        `iVALT API timed out after ${IVALT_FETCH_TIMEOUT_MS}ms (${endpoint})`
      );
    }
    throw error;
  }

  let responseData: T;
  try {
    responseData = await response.json();
  } catch {
    const errorText = await response.text();
    if (DEBUG_MODE) {
      console.log('[iVALT Response]', {
        url,
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
    }
    throw new Error(
      `iVALT API error (${response.status}): ${errorText || response.statusText}`
    );
  }

  if (!response.ok) {
    if (DEBUG_MODE) {
      console.log('[iVALT Error]', {
        url,
        status: response.status,
        body: responseData,
      });
    }
    const errorMsg =
      (responseData as any)?.error?.detail ||
      (responseData as any)?.message ||
      JSON.stringify(responseData);
    throw new Error(`iVALT API error (${response.status}): ${errorMsg}`);
  }

  // Log response in development mode
  if (DEBUG_MODE) {
    console.log('[iVALT Response]', {
      url,
      status: response.status,
      body: responseData,
    });
  }

  return responseData;
}

/**
 * Trigger biometric authentication request
 * POST /biometric-auth-request
 */
export async function triggerAuthRequest(params: {
  idConnection: string;
  countryCode: string;
  mobile: string;
}): Promise<IvaltAuthRequestResponse> {
  return ivaltRequest<IvaltAuthRequestResponse>('/biometric-auth-request', {
    id_connection: params.idConnection,
    requestFrom: params.idConnection,
    mobile: `${params.countryCode}${params.mobile}`,
  });
}

/**
 * Poll for authentication result
 * POST /biometric-auth-result
 */
export async function getAuthResult(params: {
  countryCode: string;
  mobile: string;
}): Promise<IvaltAuthResultResponse> {
  return ivaltRequest<IvaltAuthResultResponse>('/biometric-auth-result', {
    mobile: `${params.countryCode}${params.mobile}`,
  });
}

/**
 * Geo-fence + time window validation (optional)
 * POST /biometric-geo-fence-auth-results
 */
export async function getGeoFenceResult(params: {
  countryCode: string;
  mobile: string;
}): Promise<IvaltGeoFenceResponse> {
  return ivaltRequest<IvaltGeoFenceResponse>(
    '/biometric-geo-fence-auth-results',
    {
      mobile: `${params.countryCode}${params.mobile}`,
    }
  );
}

// Status code mapping from iVALT HTTP codes to internal status
export function mapIvaltStatus(statusCode: number): {
  status: 'authenticated' | 'failed' | 'not_found' | 'pending';
  ivaltStatusCode: number;
} {
  switch (statusCode) {
    case 200:
      return { status: 'authenticated', ivaltStatusCode: 200 };
    case 404:
      return { status: 'not_found', ivaltStatusCode: 404 };
    case 422:
    case 400: // 400: Bad request - may indicate pending state
      return { status: 'pending', ivaltStatusCode: 422 };
    case 403:
      return { status: 'failed', ivaltStatusCode: 403 };
    default:
      return { status: 'failed', ivaltStatusCode: statusCode };
  }
}
