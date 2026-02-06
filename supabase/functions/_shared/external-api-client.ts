/**
 * External API Client for Contact Lookup
 * Queries external contact database when caller not found in local Supabase
 */

const EXTERNAL_API_URL =
  'https://wbqcdldbktrchmcareaz.supabase.co/functions/v1/external-api';

export interface ExternalContact {
  id: string;
  First?: string;
  Last?: string;
  Title?: string;
  // Address fields from external API
  Address_1?: string;  // Street address
  Address_2?: string;  // Address line 2
  City?: string;
  State?: string;
  Zip?: string;
  Mobile?: string;
  Home?: string;
  Hebrew_First?: string;
  Hebrew_Last?: string;
  beds?: number;
  Beds?: number;
  total_beds?: number;
  TotalBeds?: number;
  available_beds?: number;
  AvailableBeds?: number;
  [key: string]: any;
}

export interface ExternalApiResponse {
  success: boolean;
  contact?: ExternalContact;
  contacts?: ExternalContact[];
  error?: string;
  meta?: {
    api_key_name: string;
    fields_returned: string[];
    response_time_ms: number;
  };
}

export class ExternalApiClient {
  constructor(private apiKey: string) {}

  /**
   * Search for a contact by phone number
   * Tries multiple phone formats: +1XXXXXXXXXX, XXXXXXXXXX, XXX-XXX-XXXX, (XXX) XXX-XXXX
   */
  async searchByPhone(phoneNumber: string): Promise<ExternalContact | null> {
    // Normalize phone number - extract just digits
    const digits = phoneNumber.replace(/\D/g, '');
    const last10 = digits.slice(-10);
    const last7 = digits.slice(-7);
    
    // Try multiple formats that might match the database
    const formats = [
      last7.slice(0, 3) + '-' + last7.slice(3), // 376-2437
      `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`, // (845) 376-2437
      last10, // 8453762437
      phoneNumber, // Original format
    ];

    for (const format of formats) {
      try {
        console.log(`Searching external API with phone format: ${format}`);
        
        const response = await fetch(
          `${EXTERNAL_API_URL}/contacts?q=${encodeURIComponent(format)}`,
          {
            method: 'GET',
            headers: {
              'X-API-Key': this.apiKey,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          console.error(
            `External API error: ${response.status}`,
            await response.text()
          );
          continue;
        }

        const data: ExternalApiResponse = await response.json();
        console.log(`External API response for ${format}: ${data.pagination?.total || 0} contacts found`);

        if (data.success && data.contacts && data.contacts.length > 0) {
          console.log(`Found contact: ${JSON.stringify(data.contacts[0])}`);
          return data.contacts[0];
        }
      } catch (error) {
        console.error(`External API fetch error for ${format}:`, error);
      }
    }

    console.log(`No contact found in external API for any phone format`);
    return null;
  }

  /**
   * Search for a contact by name
   */
  async searchByName(query: string): Promise<ExternalContact | null> {
    try {
      const response = await fetch(
        `${EXTERNAL_API_URL}/contacts?q=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data: ExternalApiResponse = await response.json();

      if (data.success && data.contacts && data.contacts.length > 0) {
        return data.contacts[0];
      }

      return null;
    } catch (error) {
      console.error('External API fetch error:', error);
      return null;
    }
  }

  /**
   * Get a single contact by ID
   */
  async getContactById(id: string): Promise<ExternalContact | null> {
    try {
      const response = await fetch(
        `${EXTERNAL_API_URL}/contacts?id=${encodeURIComponent(id)}`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data: ExternalApiResponse = await response.json();

      if (data.success && data.contact) {
        return data.contact;
      }

      return null;
    } catch (error) {
      console.error('External API fetch error:', error);
      return null;
    }
  }

  /**
   * Parse a name from first + last
   */
  static formatName(contact: ExternalContact): string {
    const first = contact.First || contact.Hebrew_First || '';
    const last = contact.Last || contact.Hebrew_Last || '';
    return [first, last].filter(Boolean).join(' ').trim();
  }
}
