import { getApiConfig } from '../../../config/api';
import { ApiResponse } from '../../../shared/types';

const API_CONFIG = getApiConfig();

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  console.log(`📡 API Request: ${options.method || 'GET'} ${url}`);

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    const response = await fetch(url, {
      ...options,
      headers: defaultHeaders,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log(`✅ API Response: ${response.status} ${response.statusText}`);

    // Try to parse JSON response
    let data: any = {};
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    try {
      const text = await response.text();
      
      if (text) {
        if (isJson) {
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            console.warn('Failed to parse JSON response:', parseError);
            data = { 
              message: text || `HTTP error! status: ${response.status}`,
              errors: [`Invalid JSON response: ${text.substring(0, 100)}`]
            };
          }
        } else {
          data = { message: text || `HTTP error! status: ${response.status}` };
        }
      } else {
        data = { message: `HTTP error! status: ${response.status}` };
      }
    } catch (readError) {
      console.warn('Failed to read response:', readError);
      data = { 
        message: `HTTP error! status: ${response.status}`,
        errors: [`Failed to read response: ${readError}`]
      };
    }

    if (!response.ok) {
      let errorMessage = data?.message || data?.error;
      
      if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        const validationMessages = data.errors.map((e: any) => {
          if (typeof e === 'string') return e;
          if (e?.msg) return e.msg;
          if (e?.message) return e.message;
          return JSON.stringify(e);
        }).filter(Boolean);
        
        if (validationMessages.length > 0) {
          errorMessage = validationMessages.join('. ');
        } else if (!errorMessage) {
          errorMessage = `HTTP error! status: ${response.status}`;
        }
      } else if (!errorMessage) {
        errorMessage = `HTTP error! status: ${response.status}`;
      }
      
      const detailedError = new Error(errorMessage);
      (detailedError as any).response = { 
        data: data || {}, 
        status: response.status,
        statusText: response.statusText
      };
      (detailedError as any).errors = data?.errors || [];
      (detailedError as any).status = response.status;
      
      console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        message: errorMessage,
        errors: data?.errors,
      });
      
      throw detailedError;
    }

    return data;
  } catch (error: any) {
    console.error(`❌ API Error (${endpoint}):`, error);
    
    if (error.name === 'AbortError') {
      const timeoutError = new Error('La requête a expiré. Vérifiez votre connexion internet et réessayez.');
      (timeoutError as any).isTimeout = true;
      throw timeoutError;
    }

    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Network request failed'))) {
      const networkError = new Error('Erreur de connexion. Vérifiez que votre serveur backend est accessible et que vous êtes connecté à internet.');
      (networkError as any).isNetworkError = true;
      throw networkError;
    }

    if (error.response?.status === 500 || error.status === 500) {
      const serverError = new Error('Erreur serveur. Le serveur rencontre un problème technique. Veuillez réessayer plus tard.');
      (serverError as any).isServerError = true;
      (serverError as any).status = 500;
      throw serverError;
    }

    if (error.response?.status === 503 || error.status === 503) {
      const serviceError = new Error('Service temporairement indisponible. Veuillez réessayer plus tard.');
      (serviceError as any).isServiceError = true;
      (serviceError as any).status = 503;
      throw serviceError;
    }

    if (error.response) {
      throw error;
    }

    if (error.message && (error.message.includes('JSON') || error.message.includes('parse'))) {
      const jsonError = new Error('Erreur de format de réponse. Le serveur a renvoyé une réponse invalide.');
      (jsonError as any).isParseError = true;
      (jsonError as any).originalError = error;
      throw jsonError;
    }

    const wrappedError = new Error(error.message || 'Une erreur réseau est survenue');
    (wrappedError as any).originalError = error;
    throw wrappedError;
  }
}





